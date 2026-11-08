import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import { fakeAuth, sessionOf } from "@/test-utils/fake-auth";

const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  validTokens: undefined as string[] | undefined,
  rpc: undefined, failWhen: undefined, log: [] as unknown[], rpcCalls: [] as unknown[], authAdminCalls: [] as string[],
}));
vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});
vi.mock("@/lib/coach/auth-ops", () => ({
  verifyAccessToken: (t: string) => fakeAuth.ops.verifyAccessToken(t),
  adminSignOutLocal: (t: string) => fakeAuth.ops.adminSignOutLocal(t),
  refreshAccessTokenOnce: (t: string) => fakeAuth.ops.refreshAccessTokenOnce(t),
}));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));

const U = "c0000000-0000-4000-8000-000000000001";
const seed = (kind: "coach_active" | "coach_suspended" | "member") => {
  const account = (active: boolean): Row => ({ user_id: U, email: "coach@x.fr", display_name: "Coach Awa", active });
  const profile = (status: string, type: string): Row => ({ id: U, status, account_type: type });
  world.tables = kind === "member"
    ? { coach_accounts: [], profiles: [profile("approved", "member")] }
    : { coach_accounts: [account(kind === "coach_active")], profiles: [profile(kind === "coach_active" ? "approved" : "suspended", "coach")] };
  world.user = { id: U, email: "coach@x.fr" };
};

function post(bearer: string, cookies: Record<string, string> = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${bearer}` };
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookie) headers.cookie = cookie;
  return new NextRequest("http://localhost/api/auth/session", { method: "POST", headers });
}
const call = async (req: NextRequest) => (await import("./route")).POST(req);

beforeEach(() => { fakeAuth.reset(); seed("coach_active"); });
afterEach(() => vi.restoreAllMocks());

describe("POST /api/auth/session : réconciliation des sessions A (cookie du login) et B (navigateur)", () => {
  it("1ʳᵉ synchronisation, deux sessions distinctes : A révoquée (1 appel), B intacte, cookie = jeton de B, refresh de A effacé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const res = await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, oldSession: "revoked" });
    expect(sessionOf(a.sessionId)!.revoked).toBe(true);
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
    expect(fakeAuth.state.signOutCalls).toHaveLength(1);
    expect(res.cookies.get("sb-access-token")?.value).toBe(b.access);
    expect(res.cookies.get("sb-refresh-token")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("synchronisation SUIVANTE, même session (cookie = jeton de B) : aucune révocation, aucun appel Auth de révocation", async () => {
    const b = fakeAuth.issue(U);
    const renewed = fakeAuth.issue(U, b.sessionId); // jeton renouvelé de la même session
    const res = await call(post(renewed.access, { "sb-access-token": b.access }));
    expect(await res.json()).toEqual({ ok: true, oldSession: "same_session" });
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
    expect(res.cookies.get("sb-access-token")?.value).toBe(renewed.access);
  });

  it("aucun ancien cookie : simple pose du cookie, aucune révocation", async () => {
    const b = fakeAuth.issue(U);
    const res = await call(post(b.access));
    expect(await res.json()).toEqual({ ok: true, oldSession: "none" });
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
    expect(res.cookies.get("sb-refresh-token")).toBeUndefined();
  });

  it("ancienne session DÉJÀ révoquée (session_not_found explicite) : traitée, le cookie est remplacé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    sessionOf(a.sessionId)!.revoked = true;
    const res = await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect(res.status).toBe(200);
    expect((await res.json()).oldSession).toBe("already_revoked");
    expect(res.cookies.get("sb-access-token")?.value).toBe(b.access);
  });

  it("erreur TEMPORAIRE lors de la révocation de l'ancienne session : 503, ancien cookie CONSERVÉ (aucune instruction de cookie), B non posé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 503 }, { name: "AuthApiError", status: 503 });
    const res = await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, oldSession: "temporary" });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(sessionOf(a.sessionId)!.revoked).toBe(false);
    expect(fakeAuth.state.signOutCalls).toHaveLength(2); // essai + UNE nouvelle tentative
  });

  it("nouvelle tentative après l'erreur temporaire : l'ancienne session est révoquée UNE seule fois", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 503 }, { name: "AuthApiError", status: 503 });
    await call(post(b.access, { "sb-access-token": a.access }));
    const second = await call(post(b.access, { "sb-access-token": a.access }));
    expect(second.status).toBe(200);
    expect((await second.json()).oldSession).toBe("revoked");
    expect(fakeAuth.state.signOutCalls.filter((c) => c.sessionId === a.sessionId && !fakeAuth.state.sessions.get(a.sessionId!)?.revoked)).toHaveLength(0);
    // 2 appels échoués simulés + 1 révocation réelle ; B n'a jamais reçu d'appel.
    expect(fakeAuth.state.signOutCalls.every((c) => c.sessionId === a.sessionId)).toBe(true);
  });

  it("pas de double révocation : une 3ᵉ synchronisation avec les mêmes anciens credentials constate already_revoked sans rien révoquer de plus", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    await call(post(b.access, { "sb-access-token": a.access }));
    const again = await call(post(b.access, { "sb-access-token": a.access }));
    expect((await again.json()).oldSession).toBe("already_revoked");
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
  });

  it("ancien access expiré + refresh valide : UNE récupération, révocation, cookie remplacé", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    const res = await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect((await res.json()).oldSession).toBe("revoked");
    expect(fakeAuth.state.refreshCalls).toBe(1);
    expect(sessionOf(a.sessionId)!.revoked).toBe(true);
  });

  it("ancien access expiré, refresh ABSENT : invalid_token (rien n'est révoqué, rien n'est prétendu), cookie remplacé", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    const res = await call(post(b.access, { "sb-access-token": a.access }));
    expect(res.status).toBe(200);
    expect((await res.json()).oldSession).toBe("invalid_token");
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });

  it("rotation du refresh de A incertaine : 503, ancien cookie conservé, B non posé", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    fakeAuth.state.refreshErrors.push({ error: null, timedOut: true });
    const res = await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect(res.status).toBe(503);
    expect((await res.json()).oldSession).toBe("refresh_rotation_unconfirmed");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("ancien cookie d'un AUTRE utilisateur : 409, aucune révocation croisée, aucun cookie", async () => {
    const other = fakeAuth.issue("autre-user"), b = fakeAuth.issue(U);
    const res = await call(post(b.access, { "sb-access-token": other.access }));
    expect(res.status).toBe(409);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });

  it("la session B (Bearer) n'est JAMAIS révoquée par la synchronisation", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect(fakeAuth.state.signOutCalls.some((c) => c.sessionId === b.sessionId)).toBe(false);
  });

  it.each(["coach_suspended", "member"] as const)("%s : 403, AUCUNE révocation, aucun cookie touché (contrôles inchangés)", async (kind) => {
    seed(kind);
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const res = await call(post(b.access, { "sb-access-token": a.access, "sb-refresh-token": a.refresh }));
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
    expect(sessionOf(a.sessionId)!.revoked).toBe(false);
  });

  it("Bearer invalide : 401, aucune révocation de l'ancienne session", async () => {
    const a = fakeAuth.issue(U);
    const res = await call(post("jeton.inconnu.xyz", { "sb-access-token": a.access }));
    expect(res.status).toBe(401);
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });
});
