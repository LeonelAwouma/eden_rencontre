import { afterEach, describe, expect, it } from "vitest";
import { CLIENT_RETRY_DELAY_MS, performLogout, retryLogoutRevocation, type DeleteAttempt, type LogoutFlowDeps } from "./logout-flow";
import { isLoggingOut, resetLoggingOut } from "./logout-state";
import type { Outcome, StoredLogoutState } from "./coach/logout-outcome";

const response = (legs: { cookie: Outcome; bearer: Outcome }, extra: Record<string, unknown> = {}): DeleteAttempt => ({
  status: 200,
  body: { confirmed: false, legs, serverCookieClearIssued: true, pendingRetry: false, deduplicated: false, rateLimited: false, ...extra },
});
const REVOKED = response({ cookie: "revoked", bearer: "revoked" });

function setup(over: Partial<LogoutFlowDeps> & { deletes?: DeleteAttempt[]; sessionAfterSignOut?: boolean; signOutError?: unknown; online?: boolean } = {}) {
  const log: string[] = [];
  const bearersSent: (string | null)[] = [];
  const saved: (StoredLogoutState | null)[] = [];
  const deletes = [...(over.deletes ?? [REVOKED])];
  let sessionPresent = over.sessionAfterSignOut ?? false;
  let forced = false;
  const deps: LogoutFlowDeps = {
    getBearer: async () => "BEARER-B",
    deleteSession: async (bearer) => { bearersSent.push(bearer); log.push("delete"); return deletes.shift() ?? "network_error"; },
    signOutLocal: async () => { log.push("signOut"); return { error: over.signOutError ?? null }; },
    localSessionPresent: async () => (forced ? false : sessionPresent),
    forceClearLocal: () => { forced = true; log.push("forceClear"); },
    announce: () => { log.push("announce"); },
    isOnline: () => over.online ?? true,
    sleep: async (ms) => { log.push(`sleep:${ms}`); },
    saveState: (s) => { saved.push(s); },
    ...over,
  };
  return { deps, log, bearersSent, saved };
}

afterEach(() => resetLoggingOut());

describe("performLogout : quatre faits indépendants", () => {
  it("révocation prouvée + session locale effacée : tous les faits vrais, aucun état d'avertissement conservé", async () => {
    const t = setup();
    const f = await performLogout(t.deps);
    expect(f).toMatchObject({ localSessionCleared: true, serverCookieClearIssued: true, refreshTokenRevocationConfirmed: true, accessTokenRejected: false, manualLocalCleanup: false, deleteAttempts: 1 });
    expect(t.saved).toEqual([null]);
    expect(t.log).toEqual(["delete", "signOut", "announce"]);
  });

  it("un NETTOYAGE LOCAL réussi n'est jamais une preuve de révocation serveur (réponse sans preuve)", async () => {
    const t = setup({ deletes: [response({ cookie: "no_cookie", bearer: "no_bearer" })] });
    const f = await performLogout(t.deps);
    expect(f.localSessionCleared).toBe(true);
    expect(f.refreshTokenRevocationConfirmed).toBe(false);
    expect(t.saved[0]).toMatchObject({ legs: { cookie: "no_cookie", bearer: "no_bearer" } });
  });

  it("émission des suppressions de cookies ≠ révocation : 503 pendingRetry → suppressions émises, révocation non confirmée", async () => {
    const t = setup({ deletes: [{ status: 503, body: { confirmed: false, legs: { cookie: "temporary", bearer: "revoked" }, serverCookieClearIssued: true, pendingRetry: true, deduplicated: false, rateLimited: false } }] });
    const f = await performLogout(t.deps);
    expect(f).toMatchObject({ serverCookieClearIssued: true, refreshTokenRevocationConfirmed: false, pendingRetry: true, deleteAttempts: 1 });
    expect(t.saved[0]).toMatchObject({ pendingRetry: true });
  });

  it("429 rate_limited : aucune révocation, AUCUNE nouvelle tentative automatique, état conservé", async () => {
    const t = setup({ deletes: [{ status: 429, body: { confirmed: false, legs: { cookie: "temporary", bearer: "temporary" }, serverCookieClearIssued: false, pendingRetry: false, deduplicated: false, rateLimited: true } }] });
    const f = await performLogout(t.deps);
    expect(f).toMatchObject({ rateLimited: true, refreshTokenRevocationConfirmed: false, serverCookieClearIssued: false, deleteAttempts: 1 });
    expect(t.log.filter((l) => l === "delete")).toHaveLength(1);
  });

  it("HTTP 200 avec corps contradictoire (confirmed:true mais branches sans preuve) : non confirmé", async () => {
    const t = setup({ deletes: [response({ cookie: "temporary", bearer: "revoked" }, { confirmed: true })] });
    expect((await performLogout(t.deps)).refreshTokenRevocationConfirmed).toBe(false);
  });
});

describe("réponse HTTP perdue : une seule nouvelle tentative, même Bearer, en mémoire", () => {
  it("réponse perdue APRÈS révocation réussie : la nouvelle tentative reçoit already_revoked explicite → confirmé", async () => {
    const t = setup({ deletes: ["network_error", response({ cookie: "already_revoked", bearer: "already_revoked" })] });
    const f = await performLogout(t.deps);
    expect(f.deleteAttempts).toBe(2);
    expect(f.refreshTokenRevocationConfirmed).toBe(true);
    expect(t.bearersSent).toEqual(["BEARER-B", "BEARER-B"]); // le MÊME Bearer, capturé avant toute déconnexion locale
    expect(t.log).toEqual(["delete", `sleep:${CLIENT_RETRY_DELAY_MS}`, "delete", "signOut", "announce"]);
  });

  it("réponse perdue AVANT révocation, nouvelle tentative sans réponse : unconfirmed, jamais confirmé ; nettoyage local quand même", async () => {
    const t = setup({ deletes: ["network_error", "network_error"] });
    const f = await performLogout(t.deps);
    expect(f.deleteAttempts).toBe(2);
    expect(f.refreshTokenRevocationConfirmed).toBe(false);
    expect(f.legs).toBeNull();
    expect(f.localSessionCleared).toBe(true);
    expect(t.saved[0]).not.toBeNull();
  });

  it("jamais plus de DEUX requêtes (pas de boucle), même si tout échoue", async () => {
    const t = setup({ deletes: ["network_error", "network_error", "network_error", "network_error"] });
    await performLogout(t.deps);
    expect(t.log.filter((l) => l === "delete")).toHaveLength(2);
  });

  it("hors ligne : aucune nouvelle tentative automatique", async () => {
    const t = setup({ deletes: ["network_error"], online: false });
    const f = await performLogout(t.deps);
    expect(f.deleteAttempts).toBe(1);
    expect(f.refreshTokenRevocationConfirmed).toBe(false);
  });

  it("corps illisible sur une erreur de passerelle 5xx : nouvelle tentative ; sur un 403 : aucune", async () => {
    const gateway = setup({ deletes: [{ status: 502, body: null }, REVOKED] });
    expect((await performLogout(gateway.deps)).deleteAttempts).toBe(2);
    const forbidden = setup({ deletes: [{ status: 403, body: null }] });
    const f = await performLogout(forbidden.deps);
    expect(f.deleteAttempts).toBe(1);
    expect(f.refreshTokenRevocationConfirmed).toBe(false);
  });

  it("aucun Bearer (session locale absente) : la requête part sans jeton ; getBearer qui lève est traité comme absent", async () => {
    const t = setup({ getBearer: async () => { throw new Error("hors ligne"); } });
    await performLogout(t.deps);
    expect(t.bearersSent).toEqual([null]);
  });
});

describe("nettoyage local de secours", () => {
  it("signOut en erreur ET session encore présente : suppression manuelle, revérification, rechargement requis", async () => {
    const t = setup({ signOutError: new Error("réseau"), sessionAfterSignOut: true });
    const f = await performLogout(t.deps);
    expect(f.manualLocalCleanup).toBe(true);
    expect(f.localSessionCleared).toBe(true);
    expect(t.log).toContain("forceClear");
    expect(t.log.indexOf("forceClear")).toBeGreaterThan(t.log.indexOf("signOut"));
  });
  it("le nettoyage de secours est annoncé aux autres onglets (jamais un simple retrait de clé)", async () => {
    const t = setup({ sessionAfterSignOut: true });
    await performLogout(t.deps);
    expect(t.log.indexOf("announce")).toBeGreaterThan(t.log.indexOf("forceClear"));
  });
  it("session locale toujours présente APRÈS le nettoyage de secours : localSessionCleared=false (aucune affirmation)", async () => {
    const t = setup({ sessionAfterSignOut: true, forceClearLocal: () => {}, localSessionPresent: async () => true });
    expect((await performLogout(t.deps)).localSessionCleared).toBe(false);
  });
  it("signOut qui lève : toléré, nettoyage de secours tenté", async () => {
    const t = setup({ signOutLocal: async () => { throw new Error("boom"); }, sessionAfterSignOut: true });
    const f = await performLogout(t.deps);
    expect(f.localSessionCleared).toBe(true);
    expect(f.manualLocalCleanup).toBe(true);
  });
});

describe("pas de synchronisation de cookie après la déconnexion", () => {
  it("performLogout marque la déconnexion (le planificateur s'arrête)", async () => {
    expect(isLoggingOut()).toBe(false);
    await performLogout(setup().deps);
    expect(isLoggingOut()).toBe(true);
  });
});

describe("retryLogoutRevocation : UNE tentative, fusion branche par branche", () => {
  const prev = (legs: { cookie: Outcome; bearer: Outcome }) => JSON.stringify({ legs, pendingRetry: true, rateLimited: false });
  const make = (attempt: DeleteAttempt) => {
    const saved: (StoredLogoutState | null)[] = []; let calls = 0;
    return { deps: { deleteSession: async () => { calls += 1; return attempt; }, saveState: (s: StoredLogoutState | null) => { saved.push(s); } }, saved, calls: () => calls };
  };

  it("cookies de nouvelle tentative encore présents : révocation prouvée → confirmé, état effacé", async () => {
    const m = make(response({ cookie: "revoked", bearer: "revoked" }));
    const r = await retryLogoutRevocation(m.deps, prev({ cookie: "temporary", bearer: "temporary" }));
    expect(r).toMatchObject({ confirmed: true, state: null, unconfirmed: false });
    expect(m.saved).toEqual([null]);
    expect(m.calls()).toBe(1);
  });
  it("branche B déjà prouvée au 1er essai : conservée même si la nouvelle tentative répond no_bearer", async () => {
    const m = make(response({ cookie: "revoked", bearer: "no_bearer" }));
    expect((await retryLogoutRevocation(m.deps, prev({ cookie: "temporary", bearer: "revoked" }))).confirmed).toBe(true);
  });
  it("cookie de nouvelle tentative EXPIRÉ (no_cookie après un temporary) : jamais une confirmation", async () => {
    const m = make(response({ cookie: "no_cookie", bearer: "no_bearer" }));
    const r = await retryLogoutRevocation(m.deps, prev({ cookie: "temporary", bearer: "revoked" }));
    expect(r.confirmed).toBe(false);
    expect(r.state?.legs.cookie).toBe("invalid_token");
  });
  it("aucune réponse exploitable : unconfirmed, état précédent conservé, aucune sauvegarde trompeuse", async () => {
    const m = make("network_error");
    const r = await retryLogoutRevocation(m.deps, prev({ cookie: "temporary", bearer: "revoked" }));
    expect(r).toMatchObject({ confirmed: false, unconfirmed: true });
    expect(m.saved).toEqual([]);
    expect(m.calls()).toBe(1); // une seule requête, pas de boucle
  });
  it("429 : non confirmé même avec des branches prouvées", async () => {
    const m = make({ status: 429, body: { confirmed: false, legs: { cookie: "revoked", bearer: "revoked" }, serverCookieClearIssued: false, pendingRetry: false, deduplicated: false, rateLimited: true } });
    expect((await retryLogoutRevocation(m.deps, null)).confirmed).toBe(false);
  });
});
