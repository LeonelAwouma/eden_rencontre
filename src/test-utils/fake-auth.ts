/**
 * Faux service d'authentification À ÉTAT pour les tests de révocation (sessions, access tokens, refresh tokens).
 *
 * ATTENTION : ce faux modélise le comportement DOCUMENTÉ de Supabase Auth ; il ne prouve rien sur le comportement
 * réel de GoTrue (ex. l'access token d'une session révoquée reste valide jusqu'à son expiration pour `getUser`,
 * comme ici). Les tests qui l'utilisent vérifient la logique de l'application, pas Supabase.
 */
import type { AuthErrorLike } from "@/lib/coach/logout-outcome";
import type { RefreshResult, VerifyResult } from "@/lib/coach/auth-ops";

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
/** JWT de forme valide (signature factice) ; `jti` garantit l'unicité de chaque jeton émis. */
const makeJwt = (secondsFromNow: number, jti: number) => `${b64url({ alg: "HS256" })}.${b64url({ exp: Math.floor(Date.now() / 1000) + secondsFromNow, jti })}.signature`;

interface Session { userId: string; revoked: boolean }
interface Access { sessionId: string; userId: string; expiresAtMs: number }
interface Refresh { sessionId: string; used: boolean }

export function createFakeAuth() {
  let counter = 0;
  const state = {
    sessions: new Map<string, Session>(),
    access: new Map<string, Access>(),
    refresh: new Map<string, Refresh>(),
    /** Si vrai, le service Auth est injoignable (verify → unavailable). */
    down: false,
    /** Files d'erreurs injectées, consommées une par appel. */
    signOutErrors: [] as (AuthErrorLike | null)[],
    refreshErrors: [] as ({ error: AuthErrorLike | null; timedOut?: boolean } | null)[],
    signOutCalls: [] as { sessionId: string | null; token: string }[],
    refreshCalls: 0,
    verifyCalls: 0,
  };

  const reset = () => {
    state.sessions.clear(); state.access.clear(); state.refresh.clear();
    state.down = false; state.signOutErrors = []; state.refreshErrors = [];
    state.signOutCalls = []; state.refreshCalls = 0; state.verifyCalls = 0; counter = 0;
  };

  /** Crée une session et émet un couple de jetons (access = JWT de forme valide, `expSeconds` négatif = expiré). */
  function issue(userId: string, sessionId = `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`, expSeconds = 1800) {
    if (!state.sessions.has(sessionId)) state.sessions.set(sessionId, { userId, revoked: false });
    const access = makeJwt(expSeconds, ++counter);
    const refresh = `refresh-${sessionId}-${counter}`;
    state.access.set(access, { sessionId, userId, expiresAtMs: Date.now() + expSeconds * 1000 });
    state.refresh.set(refresh, { sessionId, used: false });
    return { access, refresh, sessionId };
  }

  const ops = {
    async verifyAccessToken(jwt: string): Promise<VerifyResult> {
      state.verifyCalls += 1;
      if (state.down) return { state: "unavailable" };
      const a = state.access.get(jwt);
      // Comportement documenté : getUser accepte un access token non expiré, même si sa session a été révoquée.
      if (!a || a.expiresAtMs <= Date.now()) return { state: "invalid" };
      return { state: "valid", userId: a.userId, sessionId: a.sessionId };
    },
    async adminSignOutLocal(jwt: string): Promise<AuthErrorLike | null> {
      const a = state.access.get(jwt);
      state.signOutCalls.push({ sessionId: a?.sessionId ?? null, token: jwt });
      if (state.signOutErrors.length > 0) {
        const injected = state.signOutErrors.shift() ?? null;
        if (injected) return injected;
      }
      if (!a) return { name: "AuthApiError", status: 401, code: "bad_jwt" };
      const s = state.sessions.get(a.sessionId);
      if (!s || s.revoked) return { name: "AuthSessionMissingError", status: 400 }; // forme RÉELLE de session_not_found dans auth-js 2.108.2
      s.revoked = true; // scope « local » : UNE session ; les autres sessions de l'utilisateur ne sont pas touchées
      return null;
    },
    async refreshAccessTokenOnce(refreshToken: string): Promise<RefreshResult> {
      state.refreshCalls += 1;
      const injected = state.refreshErrors.length > 0 ? state.refreshErrors.shift() : undefined;
      if (injected) return { ok: false, error: injected.error, timedOut: injected.timedOut === true };
      const r = state.refresh.get(refreshToken);
      if (!r) return { ok: false, error: { name: "AuthApiError", status: 400, code: "refresh_token_not_found" }, timedOut: false };
      if (r.used) return { ok: false, error: { name: "AuthApiError", status: 400, code: "refresh_token_already_used" }, timedOut: false };
      const s = state.sessions.get(r.sessionId);
      if (!s || s.revoked) return { ok: false, error: { name: "AuthSessionMissingError", status: 400 }, timedOut: false };
      r.used = true; // rotation : l'ancien refresh token ne sert qu'une fois
      const next = issue(s.userId, r.sessionId, 1800);
      return { ok: true, accessToken: next.access };
    },
  };

  return { state, reset, issue, ops };
}

/** Instance partagée par les tests de route (le module mocké de `auth-ops` s'y branche). */
export const fakeAuth = createFakeAuth();

export const sessionOf = (sessionId: string) => fakeAuth.state.sessions.get(sessionId);
