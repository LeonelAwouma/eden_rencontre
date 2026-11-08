import { beforeEach, describe, expect, it } from "vitest";
import { fakeAuth, sessionOf } from "@/test-utils/fake-auth";
import { reconcileOldSession, revokeCredentials, type Credentials, type RevokeDeps } from "./revoke-session";

const U = "u-1";
const deps = (): Partial<RevokeDeps> => ({
  verify: fakeAuth.ops.verifyAccessToken,
  signOut: fakeAuth.ops.adminSignOutLocal,
  refresh: fakeAuth.ops.refreshAccessTokenOnce,
  sleep: async () => {},
});
const none: Credentials = { cookieAccess: [], cookieRefresh: [], bearer: [] };
const run = (c: Partial<Credentials>, gate?: (u: string[]) => Promise<boolean>) => revokeCredentials({ ...none, ...c }, { deps: deps(), gate });

beforeEach(() => fakeAuth.reset());

describe("révocation : sessions A (cookie) et B (navigateur) distinctes", () => {
  it("connexion classique : deux sessions créées, reconnues et révoquées (2 appels, scope local)", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh], bearer: [b.access] });
    expect(r.cookie.outcome).toBe("revoked");
    expect(r.bearer.outcome).toBe("revoked");
    expect(r.deduplicated).toBe(false);
    expect(r.signOutCalls).toBe(2);
    expect(sessionOf(a.sessionId)!.revoked).toBe(true);
    expect(sessionOf(b.sessionId)!.revoked).toBe(true);
  });
  it("les AUTRES sessions du même utilisateur (autres appareils) ne sont pas touchées", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U), phone = fakeAuth.issue(U);
    await run({ cookieAccess: [a.access], bearer: [b.access] });
    expect(sessionOf(phone.sessionId)!.revoked).toBe(false);
    expect(fakeAuth.state.signOutCalls.map((c) => c.sessionId).sort()).toEqual([a.sessionId, b.sessionId].sort());
  });
  it("Google / membre sans cookie serveur : B seule, A = no_cookie (les quatre credentials absents)", async () => {
    const b = fakeAuth.issue(U);
    const r = await run({ bearer: [b.access] });
    expect(r.cookie.outcome).toBe("no_cookie");
    expect(r.bearer.outcome).toBe("revoked");
    expect(r.signOutCalls).toBe(1);
  });
  it("aucun credential nulle part : no_cookie / no_bearer, aucun appel", async () => {
    const r = await run({});
    expect([r.cookie.outcome, r.bearer.outcome]).toEqual(["no_cookie", "no_bearer"]);
    expect(fakeAuth.state.verifyCalls + fakeAuth.state.signOutCalls.length).toBe(0);
  });
});

describe("déduplication A/B : uniquement sur deux identités de session VÉRIFIÉES et identiques", () => {
  it("même session vérifiée des deux côtés : UNE seule révocation, même résultat sur les deux branches", async () => {
    const a = fakeAuth.issue(U, "00000000-0000-4000-8000-0000000000aa");
    const b = fakeAuth.issue(U, "00000000-0000-4000-8000-0000000000aa"); // même session, autre access token
    const r = await run({ cookieAccess: [a.access], bearer: [b.access] });
    expect(r.deduplicated).toBe(true);
    expect(r.signOutCalls).toBe(1);
    expect([r.cookie.outcome, r.bearer.outcome]).toEqual(["revoked", "revoked"]);
  });
  it("A expiré (identité non vérifiée) + B valide : B révoquée, A traitée via refresh ; jamais d'identité commune inventée", async () => {
    const a = fakeAuth.issue(U, undefined, -60); // A expiré
    const b = fakeAuth.issue(U);
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh], bearer: [b.access] });
    expect(fakeAuth.state.refreshCalls).toBe(1);
    expect(r.deduplicated).toBe(false);
    expect(r.cookie.outcome).toBe("revoked");
    expect(r.bearer.outcome).toBe("revoked");
  });
  it("A expiré, refresh valide, A et B correspondent à la MÊME session : une récupération, jeton re-vérifié, une seule révocation", async () => {
    const shared = "00000000-0000-4000-8000-0000000000bb";
    const a = fakeAuth.issue(U, shared, -60);
    const b = fakeAuth.issue(U, shared);
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh], bearer: [b.access] });
    expect(fakeAuth.state.refreshCalls).toBe(1);
    expect(r.deduplicated).toBe(true);
    expect(r.signOutCalls).toBe(1);
    expect([r.cookie.outcome, r.bearer.outcome]).toEqual(["revoked", "revoked"]);
  });
  it("A expiré, refresh ABSENT, B valide : B révoquée, A explicitement non confirmée (invalid_token), pas no_cookie", async () => {
    const a = fakeAuth.issue(U, undefined, -60);
    const b = fakeAuth.issue(U);
    const r = await run({ cookieAccess: [a.access], bearer: [b.access] });
    expect(r.bearer.outcome).toBe("revoked");
    expect(r.cookie.outcome).toBe("invalid_token");
    expect(r.cookie.outcome).not.toBe("no_cookie");
    expect(r.signOutCalls).toBe(1);
  });
  it("A expiré, refresh INCERTAIN (délai dépassé), B valide : A = refresh_rotation_unconfirmed, B révoquée", async () => {
    const a = fakeAuth.issue(U, undefined, -60);
    const b = fakeAuth.issue(U);
    fakeAuth.state.refreshErrors.push({ error: null, timedOut: true });
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh], bearer: [b.access] });
    expect(r.cookie.outcome).toBe("refresh_rotation_unconfirmed");
    expect(r.cookie.retainRefresh).toBe(a.refresh);
    expect(r.bearer.outcome).toBe("revoked");
  });
  it("A et B tous deux expirés/invalides, sans refresh : invalid_token des deux côtés, aucune révocation", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U, undefined, -60);
    const r = await run({ cookieAccess: [a.access], bearer: [b.access] });
    expect([r.cookie.outcome, r.bearer.outcome]).toEqual(["invalid_token", "invalid_token"]);
    expect(r.signOutCalls).toBe(0);
  });
});

describe("refresh token de A : tous les chemins de refreshSession()", () => {
  const expiredA = () => fakeAuth.issue(U, undefined, -60);

  it("1. access expiré + refresh valide → renouvellement OK → révocation OK", async () => {
    const a = expiredA();
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(r.cookie.outcome).toBe("revoked");
    expect(fakeAuth.state.refreshCalls).toBe(1);
    expect(sessionOf(a.sessionId)!.revoked).toBe(true);
  });
  it("2. access ET refresh invalides (refresh_token_not_found) → invalid_token : rien de prouvé", async () => {
    const a = expiredA();
    const r = await run({ cookieAccess: [a.access], cookieRefresh: ["refresh-inconnu"] });
    expect(r.cookie.outcome).toBe("invalid_token");
    expect(r.cookie.retainRefresh).toBeNull();
  });
  it("3. renouvellement OK puis erreur TEMPORAIRE de révocation → temporary, nouvel access ET refresh conservés pour un retry", async () => {
    const a = expiredA();
    fakeAuth.state.signOutErrors.push({ name: "AuthRetryableFetchError", status: 0 }, { name: "AuthRetryableFetchError", status: 0 });
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(r.cookie.outcome).toBe("temporary");
    expect(r.cookie.retainAccess).not.toBeNull();
    expect(r.cookie.retainAccess).not.toBe(a.access); // c'est le NOUVEL access token
    expect(r.cookie.retainRefresh).toBe(a.refresh);
    expect(r.signOutCalls).toBe(2); // une seule nouvelle tentative côté serveur
    expect(sessionOf(a.sessionId)!.revoked).toBe(false);
  });
  it("4. refresh_token_already_used (rotation antérieure) → refresh_rotation_unconfirmed, jamais already_revoked", async () => {
    const a = expiredA();
    await fakeAuth.ops.refreshAccessTokenOnce(a.refresh); // rotation faite ailleurs : le nouveau couple est perdu
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(r.cookie.outcome).toBe("refresh_rotation_unconfirmed");
    expect(r.cookie.outcome).not.toBe("already_revoked");
    expect(sessionOf(a.sessionId)!.revoked).toBe(false);
  });
  it("5. renouvellement impossible pour cause réseau → temporary, refresh conservé", async () => {
    const a = expiredA();
    fakeAuth.state.refreshErrors.push({ error: { name: "AuthRetryableFetchError", status: 0 } });
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(r.cookie.outcome).toBe("temporary");
    expect(r.cookie.retainRefresh).toBe(a.refresh);
    expect(r.signOutCalls).toBe(0);
  });
  it("6. rotation potentiellement réussie, réponse perdue (délai dépassé) → refresh_rotation_unconfirmed, refresh conservé pour UN essai, jamais « révoquée »", async () => {
    const a = expiredA();
    fakeAuth.state.refreshErrors.push({ error: null, timedOut: true });
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(r.cookie.outcome).toBe("refresh_rotation_unconfirmed");
    expect(r.cookie.retainRefresh).toBe(a.refresh);
    expect(r.signOutCalls).toBe(0);
  });
  it("refresh explicitement rejeté (session déjà supprimée, session_not_found) → invalid_token", async () => {
    const a = expiredA();
    sessionOf(a.sessionId)!.revoked = true;
    const r = await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(r.cookie.outcome).toBe("invalid_token");
  });
  it("access token valide : le refresh token n'est JAMAIS consommé (aucune rotation inutile)", async () => {
    const a = fakeAuth.issue(U);
    await run({ cookieAccess: [a.access], cookieRefresh: [a.refresh] });
    expect(fakeAuth.state.refreshCalls).toBe(0);
  });
  it("nouvel access token non vérifiable (service Auth tombé après la rotation) → temporary, jamais confirmé", async () => {
    const a = expiredA();
    const realVerify = fakeAuth.ops.verifyAccessToken;
    let first = true;
    const r = await revokeCredentials({ ...none, cookieAccess: [a.access], cookieRefresh: [a.refresh] }, {
      deps: { ...deps(), verify: async (t) => { if (first) { first = false; return realVerify(t); } return { state: "unavailable" as const }; } },
    });
    expect(r.cookie.outcome).toBe("temporary");
    expect(r.cookie.retainRefresh).toBe(a.refresh);
  });
});

describe("résultats de signOut et nouvelle tentative serveur bornée", () => {
  it("session déjà révoquée (session_not_found explicite) → already_revoked, aucune nouvelle tentative", async () => {
    const b = fakeAuth.issue(U);
    sessionOf(b.sessionId)!.revoked = true;
    const r = await run({ bearer: [b.access] });
    expect(r.bearer.outcome).toBe("already_revoked");
    expect(r.signOutCalls).toBe(1);
  });
  it("erreur temporaire : UNE nouvelle tentative, qui peut réussir → revoked", async () => {
    const b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 503 });
    const r = await run({ bearer: [b.access] });
    expect(r.bearer.outcome).toBe("revoked");
    expect(r.signOutCalls).toBe(2);
  });
  it("erreur temporaire persistante : exactement 2 appels, jamais plus ; credentials conservés", async () => {
    const b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 503 }, { name: "AuthApiError", status: 503 }, { name: "AuthApiError", status: 503 });
    const r = await run({ bearer: [b.access] });
    expect(r.bearer.outcome).toBe("temporary");
    expect(r.signOutCalls).toBe(2);
    expect(r.bearer.retainAccess).toBe(b.access);
  });
  it("erreur définitive (code inconnu) : aucune nouvelle tentative, résultat failed", async () => {
    const b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 400, code: "inconnu" });
    const r = await run({ bearer: [b.access] });
    expect(r.bearer.outcome).toBe("failed");
    expect(r.signOutCalls).toBe(1);
  });
  it("service Auth injoignable à la vérification → temporary, jamais invalid_token ni confirmation", async () => {
    const b = fakeAuth.issue(U);
    fakeAuth.state.down = true;
    const r = await run({ bearer: [b.access] });
    expect(r.bearer.outcome).toBe("temporary");
  });
  it("limiteur utilisateur dépassé (gate) : AUCUNE révocation, aucun refresh", async () => {
    const b = fakeAuth.issue(U);
    const r = await run({ bearer: [b.access] }, async () => false);
    expect(r.rateLimited).toBe(true);
    expect(r.signOutCalls).toBe(0);
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
  });
  it("jeton inconnu du service Auth (session introuvable) → invalid_token, aucun signOut", async () => {
    const r = await run({ bearer: ["pas-un-jeton-connu"] });
    expect(r.bearer.outcome).toBe("invalid_token");
    expect(r.signOutCalls).toBe(0);
  });
});

describe("cookies de nouvelle tentative A/B : même traitement que les cookies ordinaires", () => {
  it("pending-a (access) + pending-a-refresh + pending-b sont consommés comme credentials de leur branche", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const r = await run({ cookieAccess: ["", a.access], cookieRefresh: ["", a.refresh], bearer: ["", b.access] });
    expect([r.cookie.outcome, r.bearer.outcome]).toEqual(["revoked", "revoked"]);
  });
});

describe("reconcileOldSession (synchronisation du cookie) : B n'est jamais révoquée", () => {
  const bearerOf = (t: { access: string; sessionId: string }) => ({ token: t.access, userId: U, sessionId: t.sessionId });

  it("1ʳᵉ synchronisation, deux sessions distinctes : A révoquée (1 appel), B intacte", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const r = await reconcileOldSession({ oldAccess: a.access, oldRefresh: a.refresh, bearer: bearerOf(b) }, deps());
    expect(r).toEqual({ outcome: "revoked", signOutCalls: 1 });
    expect(sessionOf(a.sessionId)!.revoked).toBe(true);
    expect(sessionOf(b.sessionId)!.revoked).toBe(false);
  });
  it("synchronisation suivante, même session (cookie = jeton de B) : aucune révocation, aucun appel Auth", async () => {
    const b = fakeAuth.issue(U);
    const r = await reconcileOldSession({ oldAccess: b.access, oldRefresh: "", bearer: bearerOf(b) }, deps());
    expect(r).toEqual({ outcome: "same_session", signOutCalls: 0 });
    expect(fakeAuth.state.verifyCalls + fakeAuth.state.signOutCalls.length).toBe(0);
  });
  it("même session, access token différent (renouvelé) : identités vérifiées égales → aucune révocation", async () => {
    const b = fakeAuth.issue(U);
    const renewed = fakeAuth.issue(U, b.sessionId);
    const r = await reconcileOldSession({ oldAccess: b.access, oldRefresh: "", bearer: bearerOf(renewed) }, deps());
    expect(r.outcome).toBe("same_session");
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });
  it("ancienne session déjà révoquée → already_revoked (explicite), cookie pourra être remplacé", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    sessionOf(a.sessionId)!.revoked = true;
    expect((await reconcileOldSession({ oldAccess: a.access, oldRefresh: "", bearer: bearerOf(b) }, deps())).outcome).toBe("already_revoked");
  });
  it("erreur temporaire sur l'ancienne session → temporary après UNE nouvelle tentative (2 appels, pas de double révocation)", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    fakeAuth.state.signOutErrors.push({ name: "AuthApiError", status: 503 }, { name: "AuthApiError", status: 503 });
    const r = await reconcileOldSession({ oldAccess: a.access, oldRefresh: "", bearer: bearerOf(b) }, deps());
    expect(r).toEqual({ outcome: "temporary", signOutCalls: 2 });
    expect(sessionOf(a.sessionId)!.revoked).toBe(false);
  });
  it("ancien access expiré + refresh valide : une récupération, re-vérification, révocation", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    const r = await reconcileOldSession({ oldAccess: a.access, oldRefresh: a.refresh, bearer: bearerOf(b) }, deps());
    expect(r.outcome).toBe("revoked");
    expect(fakeAuth.state.refreshCalls).toBe(1);
  });
  it("ancien access expiré, refresh absent : invalid_token (rien révoqué, jamais no_cookie)", async () => {
    const a = fakeAuth.issue(U, undefined, -60), b = fakeAuth.issue(U);
    const r = await reconcileOldSession({ oldAccess: a.access, oldRefresh: "", bearer: bearerOf(b) }, deps());
    expect(r.outcome).toBe("invalid_token");
    expect(r.signOutCalls).toBe(0);
  });
  it("ancienne session d'un AUTRE utilisateur : identity_mismatch, aucune révocation croisée", async () => {
    const a = fakeAuth.issue("autre-user"), b = fakeAuth.issue(U);
    const r = await reconcileOldSession({ oldAccess: a.access, oldRefresh: "", bearer: bearerOf(b) }, deps());
    expect(r.outcome).toBe("identity_mismatch");
    expect(fakeAuth.state.signOutCalls).toHaveLength(0);
  });
  it("jamais de double révocation : deux appels successifs sur la même ancienne session → révoquée puis déjà révoquée", async () => {
    const a = fakeAuth.issue(U), b = fakeAuth.issue(U);
    const first = await reconcileOldSession({ oldAccess: a.access, oldRefresh: "", bearer: bearerOf(b) }, deps());
    const second = await reconcileOldSession({ oldAccess: a.access, oldRefresh: "", bearer: bearerOf(b) }, deps());
    expect(first.outcome).toBe("revoked");
    expect(second.outcome).toBe("already_revoked");
    expect(fakeAuth.state.signOutCalls.filter((c) => c.sessionId === a.sessionId)).toHaveLength(2); // 1 réelle + 1 constat explicite
  });
});
