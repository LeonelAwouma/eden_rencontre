import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { fakeAuth, sessionOf } from "@/test-utils/fake-auth";
import { REVOKE_PENDING_A, REVOKE_PENDING_A_REFRESH, REVOKE_PENDING_B, REVOKE_PENDING_PATH } from "@/lib/coach/logout-outcome";

// DELETE ne dépend d'AUCUNE table : ni coach_accounts ni profiles (ce n'est pas un endpoint d'autorisation d'accès).
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => { throw new Error("DELETE ne doit lire aucune table"); } }));
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/coach/auth-ops", () => ({
  verifyAccessToken: (t: string) => fakeAuth.ops.verifyAccessToken(t),
  adminSignOutLocal: (t: string) => fakeAuth.ops.adminSignOutLocal(t),
  refreshAccessTokenOnce: (t: string) => fakeAuth.ops.refreshAccessTokenOnce(t),
}));
const limiter = vi.hoisted(() => ({ allow: true, checks: [] as string[], records: [] as string[], denyKeys: new Set<string>() }));
vi.mock("@/lib/otp", () => ({
  checkRateLimit: async (key: string) => { limiter.checks.push(key); return limiter.allow && !limiter.denyKeys.has(key.split(":").slice(0, 2).join(":")); },
  recordRateLimit: async (key: string) => { limiter.records.push(key); },
}));

const U = "c0000000-0000-4000-8000-000000000001";
const ORIGIN = { origin: "http://localhost:3000", host: "localhost:3000" };

function del(opts: { cookies?: Record<string, string>; bearer?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...ORIGIN, ...opts.headers };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  const cookie = Object.entries(opts.cookies ?? {}).map(([k, v]) => `${k}=${v}`).join("; ");
  if (cookie) headers.cookie = cookie;
  return new NextRequest("http://localhost:3000/api/auth/session", { method: "DELETE", headers });
}
const call = async (req: NextRequest) => (await import("./route")).DELETE(req);
const body = async (res: NextResponse) => res.json() as Promise<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cleared = (res: NextResponse, name: string, path = "/") => {
  const c = res.cookies.get(name);
  return c?.value === "" && c.maxAge === 0 && c.path === path;
};

let logs: string[] = [];
beforeEach(() => {
  fakeAuth.reset();
  limiter.allow = true; limiter.checks = []; limiter.records = []; limiter.denyKeys.clear();
  logs = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, m).mockImplementation((...a) => { logs.push(a.map(String).join(" ")); });
  vi.unstubAllEnvs();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("DELETE : comptes et sessions", () => {
  it("Coach actif (A cookie + B Bearer) : les deux sessions révoquées, cookies effacés, confirmé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access }));
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ confirmed: true, legs: { cookie: "revoked", bearer: "revoked" }, serverCookieClearIssued: true, pendingRetry: false, rateLimited: false });
    expect(cleared(res, "sb-access-token")).toBe(true);
    expect(cleared(res, "sb-refresh-token")).toBe(true);
    for (const n of [REVOKE_PENDING_A, REVOKE_PENDING_A_REFRESH, REVOKE_PENDING_B]) expect(cleared(res, n, REVOKE_PENDING_PATH), n).toBe(true);
    expect(sessionOf(a.sessionId)!.revoked && sessionOf(b.sessionId)!.revoked).toBe(true);
  });

  it("Coach SUSPENDU : la déconnexion aboutit quand même (aucune garde de compte, aucune lecture de table)", async () => {
    const b = fakeAuth.issue(U);
    const res = await call(del({ bearer: b.access }));
    expect(res.status).toBe(200);
    expect((await body(res)).legs.bearer).toBe("revoked");
  });

  it("session DÉJÀ révoquée (session_not_found explicite) → already_revoked, déconnexion terminée", async () => {
    const b = fakeAuth.issue(U);
    sessionOf(b.sessionId)!.revoked = true;
    const res = await call(del({ bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: true, legs: { cookie: "no_cookie", bearer: "already_revoked" } });
  });

  it("session INTROUVABLE (jeton inconnu du service Auth) → invalid_token, rien de prouvé, aucun appel de révocation", async () => {
    const res = await call(del({ bearer: "jeton.inconnu.xyz" }));
    expect(await body(res)).toMatchObject({ confirmed: false, legs: { bearer: "invalid_token" } });
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });

  it("MEMBRE (B seule, aucun cookie serveur) : confirmé, branche cookie = no_cookie réel", async () => {
    const b = fakeAuth.issue(U);
    expect(await body(await call(del({ bearer: b.access })))).toMatchObject({ confirmed: true, legs: { cookie: "no_cookie", bearer: "revoked" } });
  });

  it("compte GOOGLE sans cookie serveur : même résultat, aucun cookie touché hors instructions de suppression", async () => {
    const b = fakeAuth.issue(U);
    const res = await call(del({ bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: true, legs: { cookie: "no_cookie", bearer: "revoked" } });
    expect(res.cookies.get("sb-access-token")?.maxAge).toBe(0);
  });

  it("cookie absent ET Bearer absent : NON confirmé (une absence ne prouve rien)", async () => {
    const res = await call(del());
    expect(await body(res)).toMatchObject({ confirmed: false, legs: { cookie: "no_cookie", bearer: "no_bearer" } });
  });

  it("cookie présent mais invalide, Bearer valide : B révoquée, A = invalid_token (jamais no_cookie), non confirmé", async () => {
    const b = fakeAuth.issue(U);
    const res = await call(del({ cookies: { "sb-access-token": "cookie.invalide.zzz" }, bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: false, legs: { cookie: "invalid_token", bearer: "revoked" } });
  });

  it("A et B représentent la MÊME session vérifiée : une seule révocation (deduplicated)", async () => {
    const a = fakeAuth.issue(U, "00000000-0000-4000-8000-0000000000cc");
    const b = fakeAuth.issue(U, "00000000-0000-4000-8000-0000000000cc");
    const res = await call(del({ cookies: { "sb-access-token": a.access }, bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: true, deduplicated: true });
    expect(fakeAuth.state.signOutCalls).toHaveLength(1);
  });

  it("scope LOCAL : les autres appareils de l'utilisateur restent connectés", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U), phone = fakeAuth.issue(U), laptop = fakeAuth.issue(U);
    await call(del({ cookies: { "sb-access-token": a.access }, bearer: b.access }));
    expect(sessionOf(phone.sessionId)!.revoked).toBe(false);
    expect(sessionOf(laptop.sessionId)!.revoked).toBe(false);
    expect(fakeAuth.state.signOutCalls).toHaveLength(2);
  });
});

describe("DELETE : erreurs, nouvelle tentative et cookies de nouvelle tentative", () => {
  const temp = { name: "AuthApiError", status: 503 };

  it("erreur temporaire persistante : 503, UNE nouvelle tentative serveur (2 appels), pendingRetry, jamais confirmé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push(temp, temp, temp, temp);
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access }));
    expect(res.status).toBe(503);
    expect(await body(res)).toMatchObject({ confirmed: false, pendingRetry: true, legs: { cookie: "temporary", bearer: "temporary" } });
    expect(fakeAuth.state.signOutCalls).toHaveLength(4); // 2 branches × (1 essai + 1 nouvelle tentative)
  });

  it("cookies de nouvelle tentative : HttpOnly, SameSite=Strict, Path dédié, ≤ 120 s, AUCUN Domain ; Secure en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push(temp, temp, temp, temp);
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access, headers: { origin: "https://www.gardenofalliance.com", host: "www.gardenofalliance.com" } }));
    for (const [name, value] of [[REVOKE_PENDING_A, a.access], [REVOKE_PENDING_A_REFRESH, a.refresh], [REVOKE_PENDING_B, b.access]] as const) {
      const c = res.cookies.get(name)!;
      expect(c, name).toMatchObject({ value, httpOnly: true, sameSite: "strict", path: REVOKE_PENDING_PATH, secure: true });
      expect(c.maxAge!).toBeGreaterThan(0);
      expect(c.maxAge!).toBeLessThanOrEqual(120);
      expect(c.domain, name).toBeUndefined();
    }
    const raw = res.headers.getSetCookie().join("\n");
    expect(raw).not.toMatch(/Domain=/i);
  });

  it("cookie d'accès ordinaire effacé ; refresh ordinaire effacé UNIQUEMENT parce que sa valeur est transférée dans la même réponse", async () => {
    const a = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push(temp, temp);
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh } }));
    expect(cleared(res, "sb-access-token")).toBe(true);
    expect(res.cookies.get(REVOKE_PENDING_A_REFRESH)?.value).toBe(a.refresh);
    expect(cleared(res, "sb-refresh-token")).toBe(true);
  });

  it("SCÉNARIO DE L'ADDENDUM : 1er DELETE → 503 ; le 2e DELETE retrouve le JWT via le cookie de nouvelle tentative et révoque réellement", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push(temp, temp, temp, temp);
    const first = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access }));
    expect(first.status).toBe(503);
    expect(cleared(first, "sb-access-token")).toBe(true); // le navigateur n'a plus de cookie ordinaire…
    // …le 2e appel n'a plus que les cookies de nouvelle tentative (et plus de Bearer : la session locale est détruite).
    const second = await call(del({ cookies: { [REVOKE_PENDING_A]: first.cookies.get(REVOKE_PENDING_A)!.value, [REVOKE_PENDING_B]: first.cookies.get(REVOKE_PENDING_B)!.value } }));
    expect(second.status).toBe(200);
    expect(await body(second)).toMatchObject({ confirmed: true, legs: { cookie: "revoked", bearer: "revoked" } });
    expect(sessionOf(a.sessionId)!.revoked && sessionOf(b.sessionId)!.revoked).toBe(true);
    for (const n of [REVOKE_PENDING_A, REVOKE_PENDING_A_REFRESH, REVOKE_PENDING_B]) expect(cleared(second, n, REVOKE_PENDING_PATH), n).toBe(true);
  });

  it("un 2e DELETE SANS aucun credential n'est JAMAIS une confirmation (cookie effacé par le 1er, rien ne prouve la révocation)", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push(temp, temp, temp, temp);
    await call(del({ cookies: { "sb-access-token": a.access }, bearer: b.access }));
    const second = await call(del()); // aucun cookie de retry reçu (expirés)
    expect(await body(second)).toMatchObject({ confirmed: false, legs: { cookie: "no_cookie", bearer: "no_bearer" } });
  });

  it("erreur persistante définitive (code inconnu) : failed, aucune nouvelle tentative, non confirmé", async () => {
    const b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 400, code: "inconnu" });
    const res = await call(del({ bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: false, legs: { bearer: "failed" } });
    expect(fakeAuth.state.signOutCalls).toHaveLength(1);
  });

  it("réponse perdue APRÈS révocation : le renvoi (mêmes credentials) obtient already_revoked EXPLICITE → confirmé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    await call(del({ cookies: { "sb-access-token": a.access }, bearer: b.access })); // la réponse n'arrive jamais au navigateur
    const retry = await call(del({ cookies: { "sb-access-token": a.access }, bearer: b.access })); // mêmes credentials : le navigateur n'a rien reçu
    expect(await body(retry)).toMatchObject({ confirmed: true, legs: { cookie: "already_revoked", bearer: "already_revoked" } });
  });

  it("réponse perdue AVANT révocation : tant qu'aucune réponse fiable n'est obtenue, rien n'est confirmé (côté serveur : la session reste vivante)", async () => {
    const b = fakeAuth.issue(U);
    // La requête n'a jamais atteint le serveur : aucune révocation n'a eu lieu.
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });

  it("service Auth injoignable : temporary (jamais invalid_token), credentials conservés pour un retry", async () => {
    const b = fakeAuth.issue(U);
    fakeAuth.state.down = true;
    const res = await call(del({ bearer: b.access }));
    expect(res.status).toBe(503);
    expect(res.cookies.get(REVOKE_PENDING_B)?.value).toBe(b.access);
  });

  it("A expiré + refresh valide : récupération unique puis révocation ; refresh ordinaire effacé car confirmé", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: true, legs: { cookie: "revoked", bearer: "revoked" } });
    expect(fakeAuth.state.refreshCalls).toBe(1);
    expect(cleared(res, "sb-refresh-token")).toBe(true);
  });

  it("rotation incertaine : refresh_rotation_unconfirmed, refresh TRANSFÉRÉ (jamais perdu), non confirmé", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    fakeAuth.state.refreshErrors.push({ error: null, timedOut: true });
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: false, legs: { cookie: "refresh_rotation_unconfirmed", bearer: "revoked" }, pendingRetry: true });
    expect(res.cookies.get(REVOKE_PENDING_A_REFRESH)?.value).toBe(a.refresh);
    expect(cleared(res, "sb-refresh-token")).toBe(true);
  });

  it("refresh déclaré inutilisable (refresh_token_not_found) : invalid_token ; refresh ordinaire effacé (credential mort), non confirmé", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": "refresh-inconnu" }, bearer: b.access }));
    expect(await body(res)).toMatchObject({ confirmed: false, legs: { cookie: "invalid_token", bearer: "revoked" } });
    expect(cleared(res, "sb-refresh-token")).toBe(true);
    expect(res.cookies.get(REVOKE_PENDING_A_REFRESH)?.maxAge).toBe(0);
  });
});

describe("DELETE : origine et limiteur (avant toute lecture de credential ou révocation)", () => {
  it("origine autorisée → traité ; origine étrangère → 403 sans AUCUNE vérification ni révocation ni cookie", async () => {
    const b = fakeAuth.issue(U);
    const refused = await call(del({ bearer: b.access, headers: { origin: "https://evil.example" } }));
    expect(refused.status).toBe(403);
    expect(refused.headers.get("set-cookie")).toBeNull();
    expect(fakeAuth.state.verifyCalls + fakeAuth.state.signOutCalls.length + limiter.checks.length).toBe(0);
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
    const ok = await call(del({ bearer: b.access }));
    expect(ok.status).toBe(200);
  });

  it("sans Origin : refusé ; avec Sec-Fetch-Site: same-origin et hôte de confiance : accepté", async () => {
    const b = fakeAuth.issue(U);
    const noOrigin = new NextRequest("http://localhost:3000/api/auth/session", { method: "DELETE", headers: { host: "localhost:3000", authorization: `Bearer ${b.access}` } });
    expect((await call(noOrigin)).status).toBe(403);
    const sameOrigin = new NextRequest("http://localhost:3000/api/auth/session", { method: "DELETE", headers: { host: "localhost:3000", "sec-fetch-site": "same-origin", authorization: `Bearer ${b.access}` } });
    expect((await call(sameOrigin)).status).toBe(200);
  });

  it("limiteur IP dépassé : 429 rate_limited, AUCUNE révocation, aucun retry, cookies non touchés", async () => {
    const b = fakeAuth.issue(U);
    limiter.allow = false;
    const res = await call(del({ bearer: b.access }));
    expect(res.status).toBe(429);
    expect(await body(res)).toMatchObject({ rateLimited: true, confirmed: false, pendingRetry: false });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
    expect(fakeAuth.state.verifyCalls).toBe(0);
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
  });

  it("limiteur UTILISATEUR dépassé : 429 après vérification, mais AVANT toute révocation ; ≠ temporary", async () => {
    const b = fakeAuth.issue(U);
    limiter.denyKeys.add("logout:uid");
    const res = await call(del({ bearer: b.access }));
    expect(res.status).toBe(429);
    expect((await body(res)).rateLimited).toBe(true);
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
    expect(res.cookies.get(REVOKE_PENDING_B)).toBeUndefined();
  });

  it("clés du limiteur : IP et utilisateur vérifié, action dédiée, enregistrement seulement quand une révocation est tentée", async () => {
    await call(del()); // aucun credential : rien n'est enregistré
    expect(limiter.records).toHaveLength(0);
    const b = fakeAuth.issue(U);
    await call(del({ bearer: b.access }));
    expect(limiter.checks).toEqual(expect.arrayContaining(["logout:ip:1.2.3.4", `logout:uid:${U}`]));
    expect(limiter.records).toEqual(expect.arrayContaining(["logout:ip:1.2.3.4", `logout:uid:${U}`]));
  });
});

describe("DELETE : aucune fuite de jeton", () => {
  it("ni dans le corps de réponse, ni dans les journaux, même en erreur", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 503 }, { name: "AuthApiError", status: 503 });
    const res = await call(del({ cookies: { "sb-access-token": a.access, "sb-refresh-token": a.refresh }, bearer: b.access }));
    const text = JSON.stringify(await body(res));
    for (const secret of [a.access, a.refresh, b.access]) {
      expect(text).not.toContain(secret);
      expect(logs.join("\n")).not.toContain(secret);
    }
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
