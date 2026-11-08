/**
 * Révocation SERVEUR des sessions Supabase d'un utilisateur qui se déconnecte.
 *
 * Une connexion par mot de passe crée DEUX sessions indépendantes :
 *   A = session serveur (cookies `sb-access-token` / `sb-refresh-token`, créée par /api/auth/login) ;
 *   B = session navigateur (localStorage ; jeton transmis en `Authorization: Bearer`).
 * Une connexion Google ne crée que B. Révoquer l'une ne révoque pas l'autre : on traite les deux branches.
 *
 * Règles (voir `logout-outcome.ts`) :
 *  - chaque access token est vérifié par `getUser()` ; un `session_id` simplement décodé ne sert JAMAIS à dédupliquer ;
 *  - A expiré avec un refresh token → UNE récupération, nouvel access token re-vérifié par `getUser()` ;
 *  - A et B ne sont dédupliquées que si leurs deux `session_id` VÉRIFIÉS existent et sont égaux ;
 *  - scope TOUJOURS « local » : les autres appareils de l'utilisateur ne sont pas déconnectés ;
 *  - une seule nouvelle tentative de `signOut`, côté serveur, tant que le jeton est disponible ;
 *  - aucun jeton n'est journalisé.
 */
import {
  classifyRefreshFailure, classifySignOut, isRetryable, type AuthErrorLike, type Outcome,
} from "@/lib/coach/logout-outcome";
import * as authOps from "@/lib/coach/auth-ops";

export interface Credentials {
  /** Access tokens de la branche cookie A : `sb-access-token`, `sb-revoke-pending-a`. */
  cookieAccess: string[];
  /** Refresh tokens de la branche A : `sb-refresh-token`, `sb-revoke-pending-a-refresh`. */
  cookieRefresh: string[];
  /** Branche B : Bearer, `sb-revoke-pending-b`. */
  bearer: string[];
}

export interface LegResult {
  outcome: Outcome;
  /** Identité de session VÉRIFIÉE (jeton authentifié), sinon null. */
  sessionId: string | null;
  userId: string | null;
  /** Jeton d'accès à conserver dans un cookie de nouvelle tentative (non confirmé seulement). */
  retainAccess: string | null;
  /** Refresh token à conserver dans un cookie de nouvelle tentative (non confirmé seulement). */
  retainRefresh: string | null;
}

export interface RevokeResult {
  cookie: LegResult;
  bearer: LegResult;
  deduplicated: boolean;
  /** Nombre d'appels `admin.signOut` effectués (tests : jamais de double révocation inutile). */
  signOutCalls: number;
  rateLimited: boolean;
}

export interface RevokeDeps {
  verify: typeof authOps.verifyAccessToken;
  signOut: typeof authOps.adminSignOutLocal;
  refresh: typeof authOps.refreshAccessTokenOnce;
  sleep: (ms: number) => Promise<void>;
}

const defaultDeps: RevokeDeps = {
  verify: authOps.verifyAccessToken,
  signOut: authOps.adminSignOutLocal,
  refresh: authOps.refreshAccessTokenOnce,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export const SERVER_RETRY_DELAY_MS = 300;

const uniq = (list: string[]) => [...new Set(list.filter((t) => typeof t === "string" && t.length > 0))];

const settled = (outcome: Outcome, extra: Partial<LegResult> = {}): LegResult => ({
  outcome, sessionId: null, userId: null, retainAccess: null, retainRefresh: null, ...extra,
});

interface Resolved { token: string; sessionId: string | null; userId: string; refresh: string | null }
type Resolution = { resolved: Resolved } | { final: LegResult };

/** Obtient, pour une branche, un jeton d'accès VÉRIFIÉ — ou le résultat final si la branche ne peut pas être révoquée. */
async function resolveLeg(access: string[], refresh: string[], absent: Outcome, deps: RevokeDeps): Promise<Resolution> {
  const accessTokens = uniq(access);
  const refreshTokens = uniq(refresh);
  if (accessTokens.length === 0 && refreshTokens.length === 0) return { final: settled(absent) };

  let unavailable = false;
  for (const token of accessTokens) {
    const v = await deps.verify(token);
    if (v.state === "valid") return { resolved: { token, sessionId: v.sessionId, userId: v.userId, refresh: refreshTokens[0] ?? null } };
    if (v.state === "unavailable") unavailable = true;
  }

  // Aucun access token vérifiable : un access token expiré ne prouve PAS que son refresh token est révoqué.
  if (refreshTokens.length > 0) {
    const r = await deps.refresh(refreshTokens[0]);
    if (!r.ok) {
      const outcome = classifyRefreshFailure(r.error, r.timedOut);
      return { final: settled(outcome, { retainRefresh: isRetryable(outcome) ? refreshTokens[0] : null }) };
    }
    // Nouvel access token : re-vérifié par getUser() avant d'en lire l'identité de session.
    const v = await deps.verify(r.accessToken);
    if (v.state === "valid") return { resolved: { token: r.accessToken, sessionId: v.sessionId, userId: v.userId, refresh: refreshTokens[0] } };
    // Rotation faite mais jeton non vérifiable : la session existe peut-être encore, on ne peut rien prouver.
    return { final: settled(v.state === "unavailable" ? "temporary" : "refresh_rotation_unconfirmed", { retainRefresh: refreshTokens[0] }) };
  }

  return { final: settled(unavailable ? "temporary" : "invalid_token", { retainAccess: unavailable ? accessTokens[0] : null }) };
}

async function signOutWithOneRetry(token: string, deps: RevokeDeps, counter: { n: number }): Promise<Outcome> {
  counter.n += 1;
  let outcome = classifySignOut(await deps.signOut(token) as AuthErrorLike | null);
  if (outcome === "temporary") {
    await deps.sleep(SERVER_RETRY_DELAY_MS);
    counter.n += 1;
    outcome = classifySignOut(await deps.signOut(token) as AuthErrorLike | null);
  }
  return outcome;
}

/**
 * @param gate appelé une fois, après vérification et avant toute révocation, avec les utilisateurs concernés ;
 *             `false` ⇒ limiteur dépassé : AUCUNE révocation, résultat `rateLimited`.
 */
export async function revokeCredentials(
  creds: Credentials,
  opts: { gate?: (userIds: string[]) => Promise<boolean>; deps?: Partial<RevokeDeps> } = {}
): Promise<RevokeResult> {
  const deps = { ...defaultDeps, ...opts.deps };
  const [a, b] = await Promise.all([
    resolveLeg(creds.cookieAccess, creds.cookieRefresh, "no_cookie", deps),
    resolveLeg(creds.bearer, [], "no_bearer", deps),
  ]);

  const resolvedUsers = [a, b].flatMap((r) => ("resolved" in r ? [r.resolved.userId] : []));
  if (resolvedUsers.length > 0 && opts.gate && !(await opts.gate([...new Set(resolvedUsers)]))) {
    const idle = (r: Resolution) => ("final" in r ? r.final : settled("temporary", { userId: r.resolved.userId }));
    return { cookie: idle(a), bearer: idle(b), deduplicated: false, signOutCalls: 0, rateLimited: true };
  }

  const counter = { n: 0 };
  let deduplicated = false;
  let cookie: LegResult;
  let bearer: LegResult;

  const finish = (r: Resolved, outcome: Outcome): LegResult => ({
    outcome, sessionId: r.sessionId, userId: r.userId,
    // Tout résultat non confirmé conserve les credentials (cookie de nouvelle tentative) : aucun refresh token n'est
    // abandonné sans preuve de révocation. `invalid_token` est exclu : le service Auth a déclaré le credential inutilisable.
    retainAccess: outcome === "revoked" || outcome === "already_revoked" || outcome === "invalid_token" ? null : r.token,
    retainRefresh: outcome === "revoked" || outcome === "already_revoked" || outcome === "invalid_token" ? null : r.refresh,
  });

  if ("resolved" in a && "resolved" in b && a.resolved.sessionId !== null && a.resolved.sessionId === b.resolved.sessionId) {
    // Deux identités de session VÉRIFIÉES et identiques : une seule révocation, même résultat sur les deux branches.
    deduplicated = true;
    const outcome = await signOutWithOneRetry(a.resolved.token, deps, counter);
    cookie = finish(a.resolved, outcome);
    bearer = { ...finish(b.resolved, outcome), retainRefresh: null };
  } else {
    cookie = "final" in a ? a.final : finish(a.resolved, await signOutWithOneRetry(a.resolved.token, deps, counter));
    bearer = "final" in b ? b.final : finish(b.resolved, await signOutWithOneRetry(b.resolved.token, deps, counter));
  }

  return { cookie, bearer, deduplicated, signOutCalls: counter.n, rateLimited: false };
}

export interface ReconcileResult {
  /** `same_session` : identités de session VÉRIFIÉES et identiques → aucune révocation ; `identity_mismatch` : autre utilisateur. */
  outcome: Outcome | "same_session" | "identity_mismatch";
  signOutCalls: number;
}

/**
 * Réconciliation lors de la synchronisation du cookie (POST /api/auth/session) : traite l'ANCIENNE session serveur A
 * avant que son cookie soit remplacé par le jeton de B (session navigateur, DÉJÀ vérifié par l'appelant).
 *
 *  - A expiré avec un refresh token : UNE récupération, nouvel access token re-vérifié par `getUser()` ;
 *  - identités de session vérifiées et égales → `same_session`, aucune révocation (jamais de double révocation) ;
 *  - identité de A incertaine → jamais déclarée identique à B : A est révoquée avec son propre jeton ;
 *  - B n'est JAMAIS révoquée ici.
 */
export async function reconcileOldSession(
  input: { oldAccess: string; oldRefresh: string; bearer: { token: string; userId: string; sessionId: string | null } },
  depsOverride: Partial<RevokeDeps> = {}
): Promise<ReconcileResult> {
  const deps = { ...defaultDeps, ...depsOverride };
  if (input.oldAccess === input.bearer.token && !input.oldRefresh) return { outcome: "same_session", signOutCalls: 0 };
  const a = await resolveLeg(input.oldAccess ? [input.oldAccess] : [], input.oldRefresh ? [input.oldRefresh] : [], "no_cookie", deps);
  if ("final" in a) return { outcome: a.final.outcome, signOutCalls: 0 };
  if (a.resolved.userId !== input.bearer.userId) return { outcome: "identity_mismatch", signOutCalls: 0 };
  if (a.resolved.sessionId !== null && a.resolved.sessionId === input.bearer.sessionId) return { outcome: "same_session", signOutCalls: 0 };
  const counter = { n: 0 };
  const outcome = await signOutWithOneRetry(a.resolved.token, deps, counter);
  return { outcome, signOutCalls: counter.n };
}
