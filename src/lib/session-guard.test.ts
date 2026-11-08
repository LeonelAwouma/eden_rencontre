import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";

const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  validTokens: undefined as string[] | undefined,
  rpc: undefined as undefined | ((fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }),
  failWhen: undefined, log: [] as unknown[], rpcCalls: [] as { fn: string; args: Record<string, unknown> }[], authAdminCalls: [] as string[],
}));
vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));

const U = "c0000000-0000-4000-8000-000000000001";
const LIVE = "11111111-1111-4111-8111-111111111111";
const REVOKED = "22222222-2222-4222-8222-222222222222";
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenFor = (sessionId: string | null) => `${b64url({ alg: "HS256" })}.${b64url({ exp: Math.floor(Date.now() / 1000) + 1800, ...(sessionId ? { session_id: sessionId } : {}) })}.sig`;
const LIVE_JWT = tokenFor(LIVE);
const REVOKED_JWT = tokenFor(REVOKED); // `getUser` l'accepte encore (documenté) ; seule `session_is_active` sait qu'elle est révoquée

function seed(kind: "coach" | "member") {
  const profile = (type: string): Row => ({ id: U, status: "approved", account_type: type });
  world.tables = kind === "coach"
    ? { coach_accounts: [{ user_id: U, email: "coach@x.fr", display_name: "Coach", active: true }], profiles: [profile("coach")], coach_notifications: [], coach_member_assignments: [] }
    : { coach_accounts: [], profiles: [profile("member")], coach_notifications: [], coach_member_assignments: [] };
  world.user = { id: U, email: "u@x.fr" };
  world.validTokens = undefined;
  world.rpcCalls.length = 0;
  world.rpc = (fn, args) => (fn === "session_is_active" ? { data: args.p_session_id === LIVE, error: null } : { data: null, error: { message: "rpc non simulé" } });
}

const req = (token: string, url = "http://localhost/api/x", init: { method?: string; body?: unknown } = {}) =>
  new NextRequest(url, { method: init.method ?? "GET", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: init.body ? JSON.stringify(init.body) : undefined });

beforeEach(() => { vi.unstubAllEnvs(); seed("coach"); });
afterEach(() => vi.unstubAllEnvs());

describe("sessionIdOfVerifiedToken", () => {
  it("lit le session_id d'un jeton DÉJÀ vérifié ; null si absent, mal formé ou jeton illisible", async () => {
    const { sessionIdOfVerifiedToken } = await import("./session-guard");
    expect(sessionIdOfVerifiedToken(LIVE_JWT)).toBe(LIVE);
    expect(sessionIdOfVerifiedToken(tokenFor(null))).toBeNull();
    expect(sessionIdOfVerifiedToken(tokenFor("pas-un-uuid"))).toBeNull();
    expect(sessionIdOfVerifiedToken("illisible")).toBeNull();
  });
});

describe("isCoachSessionAccepted : drapeau COACH_REQUIRE_ACTIVE_SESSION", () => {
  it("désactivé (défaut) : accepté SANS appeler la base — comportement actuel inchangé", async () => {
    const { isCoachSessionAccepted } = await import("./session-guard");
    expect(await isCoachSessionAccepted(REVOKED_JWT)).toBe(true);
    expect(world.rpcCalls).toHaveLength(0);
  });
  it("activé : session existante → accepté ; session révoquée → refusé", async () => {
    vi.stubEnv("COACH_REQUIRE_ACTIVE_SESSION", "true");
    const { isCoachSessionAccepted } = await import("./session-guard");
    expect(await isCoachSessionAccepted(LIVE_JWT)).toBe(true);
    expect(await isCoachSessionAccepted(REVOKED_JWT)).toBe(false);
    expect(world.rpcCalls.every((c) => c.fn === "session_is_active")).toBe(true);
  });
  it.each(["TRUE", "1", "yes", ""])("valeur %j : le drapeau n'est PAS activé (seul « true » exact l'active)", async (value) => {
    vi.stubEnv("COACH_REQUIRE_ACTIVE_SESSION", value);
    const { isCoachSessionAccepted } = await import("./session-guard");
    expect(await isCoachSessionAccepted(REVOKED_JWT)).toBe(true);
  });
  it("activé : FAIL-CLOSED (claim absent, erreur RPC, fonction absente, exception)", async () => {
    vi.stubEnv("COACH_REQUIRE_ACTIVE_SESSION", "true");
    const { isCoachSessionAccepted } = await import("./session-guard");
    expect(await isCoachSessionAccepted(tokenFor(null))).toBe(false);
    world.rpc = () => ({ data: null, error: { message: "function public.session_is_active does not exist" } });
    expect(await isCoachSessionAccepted(LIVE_JWT)).toBe(false);
    world.rpc = () => { throw new Error("réseau"); };
    expect(await isCoachSessionAccepted(LIVE_JWT)).toBe(false);
    world.rpc = () => ({ data: "true", error: null }); // seule la valeur booléenne true vaut acceptation
    expect(await isCoachSessionAccepted(LIVE_JWT)).toBe(false);
  });
});

describe("chemin explicite : le jeton transmis est celui que le service Auth vient de vérifier", () => {
  it("getVerifiedSession retourne l'utilisateur ET le jeton vérifié ; getAuthenticatedUser garde sa signature", async () => {
    const { getVerifiedSession, getAuthenticatedUser } = await import("./api-auth");
    const s = await getVerifiedSession(req(LIVE_JWT));
    expect(s).toEqual({ user: { id: U, email: "u@x.fr" }, accessToken: LIVE_JWT });
    expect(await getAuthenticatedUser(req(LIVE_JWT))).toEqual({ id: U, email: "u@x.fr" });
  });
  it("jeton refusé par le service Auth : aucune session (le session_id n'est jamais lu)", async () => {
    world.validTokens = ["autre"];
    const { getVerifiedSession } = await import("./api-auth");
    expect(await getVerifiedSession(req(LIVE_JWT))).toBeNull();
    expect(world.rpcCalls).toHaveLength(0);
  });
});

// ── Un test par FAMILLE de routes : un ancien JWT de Coach (session révoquée) est refusé ─────────────────────────
interface Family { name: string; run: (token: string) => Promise<Response> }
// Contexte de route dynamique (Next 15 : params est une promesse) ; typé `never` car chaque route déclare son propre type.
const ctx = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as never;

const FAMILIES: Family[] = [
  { name: "Coach pur : GET /api/coach/me", run: async (t) => (await import("@/app/api/coach/me/route")).GET(req(t)) },
  { name: "Coach pur : GET /api/coach/dashboard", run: async (t) => (await import("@/app/api/coach/dashboard/route")).GET(req(t)) },
  { name: "Coach pur : GET /api/coach/members", run: async (t) => (await import("@/app/api/coach/members/route")).GET(req(t)) },
  { name: "Coach pur : GET /api/coach/notifications", run: async (t) => (await import("@/app/api/coach/notifications/route")).GET(req(t)) },
  { name: "Lot 3 : GET /api/coach/sessions", run: async (t) => (await import("@/app/api/coach/sessions/route")).GET(req(t)) },
  { name: "Lot 3 : GET /api/coach/actions", run: async (t) => (await import("@/app/api/coach/actions/route")).GET(req(t)) },
  { name: "Lot 3 : GET /api/coach/reports", run: async (t) => (await import("@/app/api/coach/reports/route")).GET(req(t)) },
  { name: "Lot 3 : GET /api/coach/members/[id]/notes", run: async (t) => (await import("@/app/api/coach/members/[id]/notes/route")).GET(req(t), ctx({ id: "a0000001-0000-4000-8000-000000000000" })) },
  { name: "Lot 3 : POST /api/coach/sessions", run: async (t) => (await import("@/app/api/coach/sessions/route")).POST(req(t, "http://localhost/api/x", { method: "POST", body: { member_id: "a0000001-0000-4000-8000-000000000000", type: "individual", duration_minutes: 60, timezone: "UTC", scheduled_at: "2099-01-01T10:00:00Z" } })) },
  { name: "Partagée : GET /api/coach-notifications", run: async (t) => (await import("@/app/api/coach-notifications/route")).GET(req(t)) },
  { name: "Partagée : GET /api/blog/notifications", run: async (t) => (await import("@/app/api/blog/notifications/route")).GET(req(t)) },
  { name: "Partagée : GET /api/meetings/notifications", run: async (t) => (await import("@/app/api/meetings/notifications/route")).GET(req(t)) },
  { name: "Partagée : GET /api/meetings", run: async (t) => (await import("@/app/api/meetings/route")).GET(req(t)) },
  { name: "Partagée : GET /api/announcements", run: async (t) => (await import("@/app/api/announcements/route")).GET(req(t, "http://localhost/api/announcements?surface=member")) },
  { name: "Partagée : POST /api/announcements/state", run: async (t) => (await import("@/app/api/announcements/state/route")).POST(req(t, "http://localhost/api/x", { method: "POST", body: { announcement_id: "x", action: "dismiss" } })) },
  { name: "Partagée : GET /api/meets/[id]/salle", run: async (t) => (await import("@/app/api/meets/[id]/salle/route")).GET(req(t), ctx({ id: "m1" })) },
  { name: "Partagée : GET /api/formation/lesson/[slug]", run: async (t) => (await import("@/app/api/formation/lesson/[slug]/route")).GET(req(t), ctx({ slug: "x" })) },
  { name: "Partagée : POST /api/push/subscribe", run: async (t) => (await import("@/app/api/push/subscribe/route")).POST(req(t, "http://localhost/api/x", { method: "POST", body: {} })) },
];

describe("ancien JWT de Coach REFUSÉ par chaque famille de routes (drapeau activé)", () => {
  beforeEach(() => vi.stubEnv("COACH_REQUIRE_ACTIVE_SESSION", "true"));

  it.each(FAMILIES)("$name", async ({ run }) => {
    const res = await run(REVOKED_JWT);
    expect([401, 403]).toContain(res.status);
    expect(world.rpcCalls.some((c) => c.fn === "session_is_active")).toBe(true); // c'est bien la vérification de session qui a refusé
  });

  it.each(FAMILIES)("$name — session ACTIVE : la garde de session ne bloque pas", async ({ run }) => {
    const res = await run(LIVE_JWT);
    expect([401, 403]).not.toContain(res.status);
  });

  it("pages /coach (resolveCoachPageAccess) : session révoquée → redirection vers la connexion ; session active → accès", async () => {
    const { resolveCoachPageAccess, COACH_LOGIN_REDIRECT } = await import("@/lib/coach/page-guard");
    const cookieReq = (token: string) => new NextRequest("http://localhost/coach", { headers: { cookie: `sb-access-token=${token}` } });
    expect(await resolveCoachPageAccess(cookieReq(REVOKED_JWT))).toEqual({ decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "anonymous" });
    expect((await resolveCoachPageAccess(cookieReq(LIVE_JWT))).decision).toBe("allow");
  });

  it("getMemberOrCoach et getActiveCoach : refus d'un Coach à session révoquée", async () => {
    const { getMemberOrCoach } = await import("./api-auth");
    const { getActiveCoach, requireActiveCoach } = await import("./coach-auth");
    expect(await getMemberOrCoach(req(REVOKED_JWT))).toBeNull();
    expect(await getActiveCoach(req(REVOKED_JWT))).toBeNull();
    expect(await requireActiveCoach(req(REVOKED_JWT))).toBeNull();
    expect((await getMemberOrCoach(req(LIVE_JWT)))?.kind).toBe("coach");
  });
});

describe("drapeau DÉSACTIVÉ (défaut) : aucun changement de comportement", () => {
  it.each(FAMILIES.slice(0, 5))("$name : un Coach à session révoquée reste traité comme avant", async ({ run }) => {
    const res = await run(REVOKED_JWT);
    expect(res.status).not.toBe(401);
    expect(world.rpcCalls).toHaveLength(0);
  });
});

describe("les MEMBRES ne sont jamais concernés par le drapeau Coach", () => {
  beforeEach(() => { vi.stubEnv("COACH_REQUIRE_ACTIVE_SESSION", "true"); seed("member"); });

  it("getMemberOrCoach : un membre est accepté même avec une session que le RPC dirait inactive ; aucun appel RPC", async () => {
    const { getMemberOrCoach, getApprovedUser } = await import("./api-auth");
    expect((await getMemberOrCoach(req(REVOKED_JWT)))?.kind).toBe("member");
    expect(await getApprovedUser(req(REVOKED_JWT))).toEqual({ id: U, email: "u@x.fr" });
    expect(world.rpcCalls).toHaveLength(0);
  });

  it("routes partagées : un membre n'est pas refusé par la vérification de session", async () => {
    for (const family of FAMILIES.filter((f) => f.name.startsWith("Partagée"))) {
      const res = await family.run(REVOKED_JWT);
      expect(res.status, family.name).not.toBe(401);
    }
    expect(world.rpcCalls.filter((c) => c.fn === "session_is_active")).toHaveLength(0);
  });

  it("routes Coach pures : un membre reste refusé (403) comme avant, sans rapport avec le drapeau", async () => {
    const { GET } = await import("@/app/api/coach/me/route");
    expect((await GET(req(LIVE_JWT))).status).toBe(403);
  });
});
