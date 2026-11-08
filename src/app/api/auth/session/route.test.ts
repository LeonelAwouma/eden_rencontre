import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import { fakeJwt } from "@/lib/coach/session-cookie.test";

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

const U = "c0000000-0000-4000-8000-000000000001";
type Kind = "coach_active" | "coach_suspended" | "coach_desync" | "member";
function seed(kind: Kind, token: string) {
  world.log.length = 0;
  const account = (active: boolean): Row => ({ user_id: U, email: "coach@x.fr", display_name: "Coach Awa", active });
  const profile = (status: string, account_type: string): Row => ({ id: U, status, account_type });
  const set: Record<Kind, [Row[], Row[]]> = {
    coach_active: [[account(true)], [profile("approved", "coach")]],
    coach_suspended: [[account(false)], [profile("suspended", "coach")]],
    coach_desync: [[account(false)], [profile("approved", "coach")]],
    member: [[], [profile("approved", "member")]],
  };
  world.tables = { coach_accounts: set[kind][0], profiles: set[kind][1] };
  world.user = { id: U, email: "coach@x.fr" };
  world.validTokens = [token];
}

const post = (headers: Record<string, string>) => new NextRequest("http://localhost/api/auth/session", { method: "POST", headers });
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const COOKIE = "sb-access-token";

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/auth/session : ré-établit le cookie de la garde serveur, pour un coach actif seulement", () => {
  it("coach actif + jeton valide → 200 et cookie httpOnly, SameSite=Lax, path /, valeur = le jeton vérifié", async () => {
    const token = fakeJwt(1800);
    seed("coach_active", token);
    const { POST } = await import("./route");
    const res = await POST(post(bearer(token)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const c = res.cookies.get(COOKIE);
    expect(c).toMatchObject({ name: COOKIE, value: token, httpOnly: true, sameSite: "lax", path: "/" });
    expect(c!.maxAge).toBeGreaterThan(0);
    expect(c!.maxAge).toBeLessThanOrEqual(1800);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("en production, le cookie porte l'attribut Secure", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const token = fakeJwt(1800);
    seed("coach_active", token);
    const { POST } = await import("./route");
    expect((await POST(post(bearer(token)))).cookies.get(COOKIE)!.secure).toBe(true);
  });

  it("durée du cookie : reste de validité du jeton, plafonnée à 1 h", async () => {
    const { POST } = await import("./route");
    const short = fakeJwt(45); seed("coach_active", short);
    const a = (await POST(post(bearer(short)))).cookies.get(COOKIE)!;
    expect(a.maxAge).toBeLessThanOrEqual(45);
    const long = fakeJwt(5 * 3600); seed("coach_active", long);
    expect((await POST(post(bearer(long)))).cookies.get(COOKIE)!.maxAge).toBe(3600);
  });

  it.each(["coach_suspended", "coach_desync", "member"] as const)("%s → 403 et AUCUN cookie", async (kind) => {
    const token = fakeJwt(1800);
    seed(kind, token);
    const { POST } = await import("./route");
    const res = await POST(post(bearer(token)));
    expect(res.status).toBe(403);
    expect(res.cookies.get(COOKIE)).toBeUndefined();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("sans en-tête Authorization → 401, aucun cookie", async () => {
    seed("coach_active", fakeJwt(1800));
    const { POST } = await import("./route");
    const res = await POST(post({}));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("un cookie valide ne suffit PAS : la route lit uniquement l'en-tête (pas de CSRF, pas de confusion)", async () => {
    const token = fakeJwt(1800);
    seed("coach_active", token);
    const { POST } = await import("./route");
    const res = await POST(post({ cookie: `${COOKIE}=${token}` }));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("jeton Bearer invalide alors qu'un cookie valide existe → 401 : le cookie n'est jamais écrit depuis un jeton non vérifié", async () => {
    const valid = fakeJwt(1800);
    seed("coach_active", valid);
    const { POST } = await import("./route");
    const unknown = fakeJwt(1800, Date.now() + 5000); // jeton bien formé mais inconnu du service d'authentification
    expect(unknown).not.toBe(valid);
    const res = await POST(post({ ...bearer(unknown), cookie: `${COOKIE}=${valid}` }));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it.each([["expiré", () => fakeJwt(-60)], ["illisible", () => "pas-un-jwt"], ["sans exp", () => `a.${Buffer.from("{}").toString("base64url")}.c`]])(
    "jeton %s → 401, aucun cookie", async (_l, make) => {
      const token = make();
      seed("coach_active", token);
      const { POST } = await import("./route");
      const res = await POST(post(bearer(token)));
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
    });

  it("panne de lecture du statut : refus (403), aucun cookie", async () => {
    const token = fakeJwt(1800);
    seed("coach_active", token);
    (world as { failWhen?: unknown }).failWhen = (q: { table: string }) => (q.table === "coach_accounts" ? { message: "boom" } : null);
    const { POST } = await import("./route");
    const res = await POST(post(bearer(token)));
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
    (world as { failWhen?: unknown }).failWhen = undefined;
  });
});

describe("DELETE /api/auth/session : déconnexion côté serveur", () => {
  it("efface les deux cookies de session (Max-Age 0), sans authentification, et ne se met jamais en cache", async () => {
    const { DELETE } = await import("./route");
    const res = await DELETE();
    expect(res.status).toBe(200);
    for (const name of [COOKIE, "sb-refresh-token"]) {
      expect(res.cookies.get(name), name).toMatchObject({ value: "", maxAge: 0, httpOnly: true, path: "/" });
    }
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
