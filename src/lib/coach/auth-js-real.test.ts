/**
 * Tests contre le VRAI package `@supabase/supabase-js` / auth-js installé (2.108.2), avec un stockage contrôlé et
 * un `fetch` simulé. Ils figent le comportement RÉEL du client installé (ce que la logique de déconnexion suppose) :
 * ils ne disent RIEN du comportement du service GoTrue hébergé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { classifyRefreshFailure, classifySignOut } from "./logout-outcome";

const URL_ = "https://proj.supabase.test";
const KEY = "anon-or-service-key-for-tests";
const STORAGE_KEY = "sb-proj-auth-token";

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (expSeconds: number, sessionId = "00000000-0000-4000-8000-000000000001") =>
  `${b64url({ alg: "HS256" })}.${b64url({ exp: Math.floor(Date.now() / 1000) + expSeconds, session_id: sessionId, sub: "u-1" })}.sig`;

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown } | "network_error";
function makeFetch(handler: Handler) {
  const calls: { url: string; method: string; auth: string | null }[] = [];
  const fn = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const headers = new Headers(init.headers);
    calls.push({ url, method: (init.method ?? "GET").toUpperCase(), auth: headers.get("authorization") });
    const out = handler(url, init);
    if (out === "network_error") throw new TypeError("fetch failed");
    return new Response(out.body === undefined ? null : JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json" } });
  };
  return { fn: fn as typeof fetch, calls };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
}

const sessionJson = (expSeconds: number) => JSON.stringify({
  access_token: jwt(expSeconds), refresh_token: "refresh-1", token_type: "bearer", expires_in: Math.max(expSeconds, 0),
  expires_at: Math.floor(Date.now() / 1000) + expSeconds, user: { id: "u-1", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
});

function browserClient(storage: ReturnType<typeof memoryStorage>, f: ReturnType<typeof makeFetch>): SupabaseClient {
  return createClient(URL_, KEY, { auth: { storage, storageKey: STORAGE_KEY, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false }, global: { fetch: f.fn } });
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("auth-js 2.108.2 — signOut({ scope: 'local' }) du navigateur", () => {
  it("appelle /logout?scope=local avec le jeton, vide le stockage et émet SIGNED_OUT", async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: sessionJson(1800) });
    const f = makeFetch(() => ({ status: 204 }));
    const client = browserClient(storage, f);
    const events: string[] = [];
    client.auth.onAuthStateChange((e) => { events.push(e); });
    const { error } = await client.auth.signOut({ scope: "local" });
    expect(error).toBeNull();
    const logout = f.calls.find((c) => c.url.includes("/logout"))!;
    expect(logout.url).toBe(`${URL_}/auth/v1/logout?scope=local`);
    expect(logout.method).toBe("POST");
    expect(logout.auth).toMatch(/^Bearer /);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(events).toContain("SIGNED_OUT");
  });

  it("SANS option, le scope par défaut est GLOBAL (c'est pourquoi le code passe toujours { scope: 'local' })", async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: sessionJson(1800) });
    const f = makeFetch(() => ({ status: 204 }));
    await browserClient(storage, f).auth.signOut();
    expect(f.calls.find((c) => c.url.includes("/logout"))!.url).toContain("scope=global");
  });

  it.each([401, 403, 404])("réponse %i de /logout : IGNORÉE par le SDK (stockage vidé, aucune erreur) — ne prouve donc pas la révocation", async (status) => {
    const storage = memoryStorage({ [STORAGE_KEY]: sessionJson(1800) });
    const f = makeFetch(() => ({ status, body: { code: status, error_code: "session_not_found", msg: "x" } }));
    const { error } = await browserClient(storage, f).auth.signOut({ scope: "local" });
    expect(error).toBeNull();
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  it("erreur 500 de /logout : erreur renvoyée ET stockage NON vidé (le nettoyage de secours est donc indispensable)", async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: sessionJson(1800) });
    const f = makeFetch(() => ({ status: 500, body: { msg: "boom" } }));
    const { error } = await browserClient(storage, f).auth.signOut({ scope: "local" });
    expect(error).not.toBeNull();
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
  });

  it("réseau indisponible pendant /logout : erreur renvoyée, stockage NON vidé", async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: sessionJson(1800) });
    const f = makeFetch(() => "network_error");
    const { error } = await browserClient(storage, f).auth.signOut({ scope: "local" });
    expect(error).not.toBeNull();
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
  });

  it("ACCESS TOKEN EXPIRÉ + réseau indisponible : le SDK tente de rafraîchir avec un backoff LONG puis renvoie une erreur ; session locale CONSERVÉE", async () => {
    vi.useFakeTimers();
    const storage = memoryStorage({ [STORAGE_KEY]: sessionJson(-120) });
    const f = makeFetch(() => "network_error");
    const client = browserClient(storage, f);
    const pending = client.auth.signOut({ scope: "local" });
    await vi.advanceTimersByTimeAsync(120_000); // le backoff réel dépasse 10 s : d'où les échéances de logout-browser.ts
    const { error } = await pending;
    expect(error).not.toBeNull();
    expect(storage.data.has(STORAGE_KEY)).toBe(true); // → localSessionPresent=true → nettoyage de secours
    expect(f.calls.filter((c) => c.url.includes("grant_type=refresh_token")).length).toBeGreaterThan(1); // nouvelles tentatives internes
    expect(f.calls.some((c) => c.url.includes("/logout"))).toBe(false); // /logout n'a JAMAIS été appelé : rien n'a pu être révoqué
  });
});

describe("auth-js 2.108.2 — administration serveur (auth-ops réel, fetch simulé)", () => {
  async function loadOps(f: ReturnType<typeof makeFetch>) {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: f.fn } }),
    }));
    return import("./auth-ops");
  }
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock("@/lib/supabase-admin"));

  it("adminSignOutLocal : POST /logout?scope=local avec le jeton, jamais global ni others", async () => {
    const f = makeFetch(() => ({ status: 204 }));
    const ops = await loadOps(f);
    const token = jwt(1800);
    expect(await ops.adminSignOutLocal(token)).toBeNull();
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toMatchObject({ url: `${URL_}/auth/v1/logout?scope=local`, method: "POST", auth: `Bearer ${token}` });
    expect(f.calls[0].url).not.toMatch(/scope=(global|others)/);
  });

  it("session_not_found renvoyé par le service → classé already_revoked, de bout en bout (vraie forme d'erreur du SDK)", async () => {
    const f = makeFetch(() => ({ status: 403, body: { code: 403, error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" } }));
    const err = await (await loadOps(f)).adminSignOutLocal(jwt(1800));
    // Le SDK convertit session_not_found en AuthSessionMissingError (voir fetch.js, handleError).
    expect(err).toMatchObject({ name: "AuthSessionMissingError", status: 400 });
    expect(classifySignOut(err)).toBe("already_revoked");
  });

  it.each([
    [401, "bad_jwt", "invalid_token"], [403, undefined, "failed"], [404, undefined, "failed"], [429, "over_request_rate_limit", "temporary"], [500, undefined, "temporary"],
  ] as const)("statut %i (%s) → %s", async (status, code, expected) => {
    const f = makeFetch(() => ({ status, body: { code: status, ...(code ? { error_code: code } : {}), msg: "x" } }));
    expect(classifySignOut(await (await loadOps(f)).adminSignOutLocal(jwt(1800)))).toBe(expected);
  });

  it("2xx → revoked ; réseau indisponible → temporary", async () => {
    expect(classifySignOut(await (await loadOps(makeFetch(() => ({ status: 200 })))).adminSignOutLocal(jwt(1800)))).toBe("revoked");
    expect(classifySignOut(await (await loadOps(makeFetch(() => "network_error"))).adminSignOutLocal(jwt(1800)))).toBe("temporary");
  });

  it("verifyAccessToken : valide (identité de session lue APRÈS vérification), refusé, ou service injoignable", async () => {
    const token = jwt(1800, "11111111-1111-4111-8111-111111111111");
    const ok = makeFetch((url) => (url.endsWith("/user") ? { status: 200, body: { id: "u-1", aud: "authenticated", email: "a@b.fr", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } } : { status: 404 }));
    expect(await (await loadOps(ok)).verifyAccessToken(token)).toEqual({ state: "valid", userId: "u-1", sessionId: "11111111-1111-4111-8111-111111111111" });
    const refused = makeFetch(() => ({ status: 401, body: { code: 401, error_code: "bad_jwt", msg: "invalid JWT" } }));
    expect(await (await loadOps(refused)).verifyAccessToken(jwt(-60))).toEqual({ state: "invalid" });
    const gone = makeFetch(() => ({ status: 403, body: { code: 403, error_code: "session_not_found", msg: "x" } }));
    expect(await (await loadOps(gone)).verifyAccessToken(token)).toEqual({ state: "invalid" });
    const down = makeFetch(() => "network_error");
    expect((await (await loadOps(down)).verifyAccessToken(token)).state).toBe("unavailable");
  });
});

describe("auth-js 2.108.2 — récupération unique du refresh token (client temporaire)", () => {
  async function loadOps(f: ReturnType<typeof makeFetch>) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", KEY);
    vi.stubGlobal("fetch", f.fn);
    return import("./auth-ops");
  }
  const tokenResponse = (expSeconds: number) => ({ status: 200, body: { access_token: jwt(expSeconds), refresh_token: "refresh-2", token_type: "bearer", expires_in: expSeconds, expires_at: Math.floor(Date.now() / 1000) + expSeconds, user: { id: "u-1", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } } });

  it("succès : renvoie le nouvel access token, SANS rien persister (client temporaire)", async () => {
    const f = makeFetch(() => tokenResponse(1800));
    const r = await (await loadOps(f)).refreshAccessTokenOnce("refresh-1");
    expect(r.ok).toBe(true);
    expect(f.calls[0].url).toContain("grant_type=refresh_token");
    expect(f.calls).toHaveLength(1);
  });

  it.each([
    ["refresh_token_already_used", "refresh_rotation_unconfirmed"],
    ["refresh_token_not_found", "invalid_token"],
    ["session_expired", "invalid_token"],
  ] as const)("code %s → %s (jamais une confirmation de révocation)", async (code, expected) => {
    const f = makeFetch(() => ({ status: 400, body: { code: 400, error_code: code, msg: "x" } }));
    const r = await (await loadOps(f)).refreshAccessTokenOnce("refresh-1");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error?.code).toBe(code);
      expect(r.timedOut).toBe(false);
      expect(classifyRefreshFailure(r.error, r.timedOut)).toBe(expected);
    }
  });

  it("réseau coupé : le SDK réessaie en interne ; au-delà de l'échéance → timedOut (rotation INCERTAINE), jamais un échec franc", async () => {
    const f = makeFetch(() => "network_error");
    const r = await (await loadOps(f)).refreshAccessTokenOnce("refresh-1", 300);
    expect(r).toMatchObject({ ok: false, timedOut: true });
    if (!r.ok) expect(classifyRefreshFailure(r.error, r.timedOut)).toBe("refresh_rotation_unconfirmed");
  });
});
