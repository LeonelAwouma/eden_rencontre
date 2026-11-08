import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_COOKIE, COACH_COOKIE_REFRESH_MS, COACH_SYNC_BREAKER_KEY, COACH_SYNC_COOLDOWN_MS, MAX_ACCESS_COOKIE_SECONDS, REFRESH_COOKIE,
  canAttemptCoachSync, cookieMaxAgeFor, jwtSecondsLeft, markCoachSyncAttempt, readLastCoachSyncAttempt,
} from "./session-cookie";

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
/** JWT de test (signature factice) dont la revendication `exp` est dans `secondsFromNow` secondes. */
export const fakeJwt = (secondsFromNow: number, nowMs = Date.now()) => `${b64url({ alg: "HS256" })}.${b64url({ exp: Math.floor(nowMs / 1000) + secondsFromNow })}.signature`;

describe("jwtSecondsLeft / cookieMaxAgeFor", () => {
  const now = Date.UTC(2026, 10, 8, 12, 0, 0);

  it("lit la validité restante dans `exp`", () => {
    expect(jwtSecondsLeft(fakeJwt(600, now), now)).toBe(600);
    expect(jwtSecondsLeft(fakeJwt(-30, now), now)).toBe(-30);
  });

  it.each(["", "abc", "a.b", "a.b.c.d", "a.%%%.c", `x.${Buffer.from("{}").toString("base64url")}.y`, `x.${Buffer.from("pas du json").toString("base64url")}.y`,
    `x.${b64url({ exp: "soon" })}.y`, `x.${b64url({ exp: null })}.y`])("jeton illisible (%s) → null", (token) => {
    expect(jwtSecondsLeft(token, now)).toBeNull();
    expect(cookieMaxAgeFor(token, now)).toBeNull();
  });

  it("durée du cookie : reste de validité, plafonné à 1 h", () => {
    expect(cookieMaxAgeFor(fakeJwt(90, now), now)).toBe(90);
    expect(cookieMaxAgeFor(fakeJwt(3600, now), now)).toBe(3600);
    expect(cookieMaxAgeFor(fakeJwt(5 * 3600, now), now)).toBe(MAX_ACCESS_COOKIE_SECONDS);
  });

  it("jeton expiré ou sur le point de l'être → aucun cookie", () => {
    expect(cookieMaxAgeFor(fakeJwt(0, now), now)).toBeNull();
    expect(cookieMaxAgeFor(fakeJwt(-1, now), now)).toBeNull();
    expect(cookieMaxAgeFor(fakeJwt(-86400, now), now)).toBeNull();
  });
});

describe("garde-fou anti-boucle de la page de connexion", () => {
  it("la première tentative est permise", () => {
    expect(canAttemptCoachSync(1_000_000, null)).toBe(true);
    expect(canAttemptCoachSync(1_000_000, Number.NaN)).toBe(true);
  });

  it("une seconde tentative dans la fenêtre est refusée, puis permise après", () => {
    const t0 = 1_000_000;
    expect(COACH_SYNC_COOLDOWN_MS).toBe(20_000);
    expect(canAttemptCoachSync(t0 + 1, t0)).toBe(false);
    expect(canAttemptCoachSync(t0 + COACH_SYNC_COOLDOWN_MS - 1, t0)).toBe(false);
    expect(canAttemptCoachSync(t0 + COACH_SYNC_COOLDOWN_MS, t0)).toBe(true);
    expect(canAttemptCoachSync(t0 + 10 * 60_000, t0)).toBe(true);
  });

  it("un horodatage dans le futur (horloge modifiée) ne bloque pas définitivement", () => {
    expect(canAttemptCoachSync(1_000, 9_999_999)).toBe(true);
  });
});

describe("mémorisation de la tentative (sessionStorage)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("écrit puis relit l'horodatage ; le stockage absent ou en erreur ne lève jamais", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", { sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } });
    expect(readLastCoachSyncAttempt()).toBeNull();
    markCoachSyncAttempt(123456);
    expect(store.get(COACH_SYNC_BREAKER_KEY)).toBe("123456");
    expect(readLastCoachSyncAttempt()).toBe(123456);

    vi.stubGlobal("window", { sessionStorage: { getItem: () => { throw new Error("bloqué"); }, setItem: () => { throw new Error("bloqué"); } } });
    expect(readLastCoachSyncAttempt()).toBeNull();
    expect(() => markCoachSyncAttempt()).not.toThrow();
  });
});

describe("constantes", () => {
  it("noms de cookies identiques à ceux de la connexion (api-auth, /api/auth/login)", () => {
    expect(ACCESS_COOKIE).toBe("sb-access-token");
    expect(REFRESH_COOKIE).toBe("sb-refresh-token");
    expect(COACH_COOKIE_REFRESH_MS).toBeLessThan(MAX_ACCESS_COOKIE_SECONDS * 1000); // rafraîchi avant l'expiration
  });
});
