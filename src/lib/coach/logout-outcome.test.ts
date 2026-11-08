import { describe, expect, it } from "vitest";
import {
  OUTCOMES, classifyRefreshFailure, classifySignOut, isLogoutConfirmed, mergeRetryLegs, parseLogoutResponse,
  parseStoredLogoutState, type Outcome,
} from "./logout-outcome";

const apiErr = (status: number, code?: string) => ({ name: "AuthApiError", status, code });

describe("classifySignOut : liste explicite, jamais de 401/403/404 générique", () => {
  it("succès → revoked", () => expect(classifySignOut(null)).toBe("revoked"));
  it("session_not_found (seul code fiable) → already_revoked, quel que soit le statut", () => {
    expect(classifySignOut(apiErr(403, "session_not_found"))).toBe("already_revoked");
    expect(classifySignOut(apiErr(404, "session_not_found"))).toBe("already_revoked");
  });
  it("AuthSessionMissingError (forme RÉELLE de session_not_found dans auth-js 2.108.2) → already_revoked", () => {
    expect(classifySignOut({ name: "AuthSessionMissingError", status: 400 })).toBe("already_revoked");
  });
  it("une AuthApiError 400 quelconque n'est PAS AuthSessionMissingError → failed", () => {
    expect(classifySignOut({ name: "AuthApiError", status: 400 })).toBe("failed");
  });
  it.each([401, 403, 404])("statut %i SANS code explicite → jamais already_revoked", (status) => {
    expect(classifySignOut(apiErr(status))).not.toBe("already_revoked");
    expect(classifySignOut(apiErr(status))).toBe("failed");
  });
  it("user_not_found n'est PAS une révocation prouvée", () => expect(classifySignOut(apiErr(404, "user_not_found"))).toBe("failed"));
  it.each([[0, "réseau"], [500, "5xx"], [503, "5xx"], [429, "429"]])("statut %i (%s) → temporary", (status) => {
    expect(classifySignOut(apiErr(status))).toBe("temporary");
  });
  it("AuthRetryableFetchError (réseau) → temporary", () => expect(classifySignOut({ name: "AuthRetryableFetchError", status: 0 })).toBe("temporary"));
  it("over_request_rate_limit du service Auth → temporary (≠ rate_limited de l'application)", () => expect(classifySignOut(apiErr(429, "over_request_rate_limit"))).toBe("temporary"));
  it("jeton mal formé (bad_jwt) → invalid_token : rien n'est prouvé", () => expect(classifySignOut(apiErr(401, "bad_jwt"))).toBe("invalid_token"));
  it("code inconnu → failed, jamais une confirmation", () => expect(classifySignOut(apiErr(400, "code_inconnu"))).toBe("failed"));
});

describe("classifyRefreshFailure : aucun code ambigu ne devient une confirmation", () => {
  it("échec réseau avant traitement → temporary", () => expect(classifyRefreshFailure({ name: "AuthRetryableFetchError", status: 0 })).toBe("temporary"));
  it("délai dépassé (rotation peut-être faite) → refresh_rotation_unconfirmed", () => expect(classifyRefreshFailure(null, true)).toBe("refresh_rotation_unconfirmed"));
  it("refresh_token_already_used → refresh_rotation_unconfirmed (jamais already_revoked)", () => {
    expect(classifyRefreshFailure(apiErr(400, "refresh_token_already_used"))).toBe("refresh_rotation_unconfirmed");
  });
  it.each(["refresh_token_not_found", "session_expired", "invalid_grant", "autre"])("%s → invalid_token (credential inutilisable, rien de prouvé)", (code) => {
    const o = classifyRefreshFailure(apiErr(400, code));
    expect(o).toBe("invalid_token");
    expect(o).not.toBe("already_revoked");
    expect(o).not.toBe("revoked");
  });
});

describe("isLogoutConfirmed : B prouvée ET A prouvée ou réellement sans credentials", () => {
  const confirmedA: Outcome[] = ["revoked", "already_revoked", "no_cookie"];
  const confirmedB: Outcome[] = ["revoked", "already_revoked"];
  it.each(confirmedA.flatMap((a) => confirmedB.map((b) => [a, b] as const)))("A=%s, B=%s → confirmé", (cookie, bearer) => {
    expect(isLogoutConfirmed({ cookie, bearer })).toBe(true);
  });
  it("toute autre combinaison reste NON confirmée (exhaustif)", () => {
    for (const cookie of OUTCOMES) for (const bearer of OUTCOMES) {
      const expected = confirmedA.includes(cookie) && confirmedB.includes(bearer);
      expect(isLogoutConfirmed({ cookie, bearer }), `${cookie}/${bearer}`).toBe(expected);
    }
  });
  it("no_cookie sans B prouvée (no_bearer) → non confirmé", () => expect(isLogoutConfirmed({ cookie: "no_cookie", bearer: "no_bearer" })).toBe(false));
});

describe("parseLogoutResponse : le corps décide, jamais le statut HTTP", () => {
  const base = { serverCookieClearIssued: true, pendingRetry: false, deduplicated: false, rateLimited: false };
  it("HTTP 200 avec no_cookie/no_bearer → NON confirmé (même si le corps prétend confirmed:true)", () => {
    const parsed = parseLogoutResponse({ ...base, confirmed: true, legs: { cookie: "no_cookie", bearer: "no_bearer" } });
    expect(parsed.kind).toBe("response");
    if (parsed.kind === "response") expect(parsed.response.confirmed).toBe(false);
  });
  it("503 avec pendingRetry:true → non confirmé", () => {
    const parsed = parseLogoutResponse({ ...base, pendingRetry: true, legs: { cookie: "temporary", bearer: "revoked" } });
    expect(parsed.kind === "response" && parsed.response.confirmed).toBe(false);
    expect(parsed.kind === "response" && parsed.response.pendingRetry).toBe(true);
  });
  it("429 rate_limited → jamais confirmé, même avec des branches « prouvées »", () => {
    const parsed = parseLogoutResponse({ ...base, rateLimited: true, legs: { cookie: "revoked", bearer: "revoked" } });
    expect(parsed.kind === "response" && parsed.response.confirmed).toBe(false);
    expect(parsed.kind === "response" && parsed.response.rateLimited).toBe(true);
  });
  it("branches prouvées → confirmé", () => {
    const parsed = parseLogoutResponse({ ...base, legs: { cookie: "already_revoked", bearer: "revoked" } });
    expect(parsed.kind === "response" && parsed.response.confirmed).toBe(true);
  });
  it.each([[null], [undefined], ["ok"], [42], [{}], [{ confirmed: true }], [{ legs: { cookie: "revoked" } }], [{ legs: { cookie: "revoked", bearer: "inconnu" } }]])(
    "corps absent ou mal formé %j → unconfirmed", (body) => expect(parseLogoutResponse(body)).toEqual({ kind: "unconfirmed" }));
});

describe("mergeRetryLegs : une absence actuelle ne prouve jamais la révocation", () => {
  it("une branche déjà prouvée le reste", () => {
    expect(mergeRetryLegs({ cookie: "temporary", bearer: "revoked" }, { cookie: "revoked", bearer: "no_bearer" })).toEqual({ cookie: "revoked", bearer: "revoked" });
  });
  it("credentials disparus (cookie de nouvelle tentative expiré) → invalid_token, jamais no_cookie confirmé", () => {
    const merged = mergeRetryLegs({ cookie: "temporary", bearer: "revoked" }, { cookie: "no_cookie", bearer: "no_bearer" });
    expect(merged.cookie).toBe("invalid_token");
    expect(isLogoutConfirmed(merged)).toBe(false);
  });
  it("branche réellement absente depuis le début → no_cookie conservé", () => {
    expect(mergeRetryLegs({ cookie: "no_cookie", bearer: "temporary" }, { cookie: "no_cookie", bearer: "revoked" })).toEqual({ cookie: "no_cookie", bearer: "revoked" });
  });
});

describe("parseStoredLogoutState", () => {
  it("état valide relu, sans aucun jeton", () => {
    const s = parseStoredLogoutState(JSON.stringify({ legs: { cookie: "temporary", bearer: "revoked" }, pendingRetry: true, rateLimited: false, token: "x" }));
    expect(s).toEqual({ legs: { cookie: "temporary", bearer: "revoked" }, pendingRetry: true, rateLimited: false });
  });
  it.each([[null], [""], ["pas du json"], [JSON.stringify({ legs: { cookie: "x", bearer: "revoked" } })]])("%j → null", (raw) => expect(parseStoredLogoutState(raw)).toBeNull());
});
