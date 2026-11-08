/**
 * Résultats de révocation de session et contrat de réponse de `DELETE /api/auth/session`.
 *
 * Module PUR (sans dépendance serveur ni navigateur), partagé par la route, le client et les tests.
 *
 * Principe : une révocation n'est « confirmée » que sur une PREUVE explicite renvoyée par le service Auth
 * (`revoked`, `already_revoked`). Ni l'absence de cookie, ni un jeton expiré, ni un code ambigu, ni un nettoyage
 * local ne prouvent quoi que ce soit.
 */

export const REVOKE_PENDING_A = "sb-revoke-pending-a";
export const REVOKE_PENDING_A_REFRESH = "sb-revoke-pending-a-refresh";
export const REVOKE_PENDING_B = "sb-revoke-pending-b";
/** Chemin des cookies de nouvelle tentative : invisibles pour toute autre route. */
export const REVOKE_PENDING_PATH = "/api/auth/session";
/** Durée de vie maximale (s) d'un cookie de nouvelle tentative. */
export const REVOKE_PENDING_MAX_SECONDS = 120;

export type Outcome =
  /** `admin.signOut(jwt,"local")` a réussi. */
  | "revoked"
  /** Le service Auth a explicitement répondu `session_not_found` pour un jeton bien formé. */
  | "already_revoked"
  /** TOUS les credentials de la branche cookie A sont absents (aucun des quatre cookies). */
  | "no_cookie"
  /** Branche B (Bearer) : aucun jeton transmis. */
  | "no_bearer"
  /** Credential absent, expiré, illisible ou rejeté : ne prouve RIEN sur la révocation du refresh token. */
  | "invalid_token"
  /** Une rotation du refresh token a peut-être eu lieu sans que le nouveau couple nous parvienne. */
  | "refresh_rotation_unconfirmed"
  /** Erreur réseau / 5xx / 429 du service Auth : nouvelle tentative possible. */
  | "temporary"
  /** Toute autre erreur (code inconnu inclus) : jamais assimilée à une révocation. */
  | "failed";

export const OUTCOMES: readonly Outcome[] = [
  "revoked", "already_revoked", "no_cookie", "no_bearer", "invalid_token", "refresh_rotation_unconfirmed", "temporary", "failed",
];

/** Forme minimale d'une erreur d'auth-js (AuthApiError, AuthRetryableFetchError…). */
export interface AuthErrorLike { name?: string; status?: number; code?: string }

const isNetworkLike = (e: AuthErrorLike) =>
  e.name === "AuthRetryableFetchError" || e.status === undefined || e.status === 0 || e.status >= 500 || e.status === 429 || e.code === "over_request_rate_limit";

/** Codes de `/logout` qui désignent un jeton inutilisable (rien n'est prouvé sur la session). */
const INVALID_TOKEN_CODES = new Set(["bad_jwt", "no_authorization", "unexpected_audience", "invalid_jwt"]);

/**
 * Classe le résultat de `auth.admin.signOut(jwt,"local")`.
 * LISTE EXPLICITE : seul `session_not_found` vaut `already_revoked`. Aucun 401/403/404 générique.
 *
 * Constat dans auth-js 2.108.2 (`lib/fetch.js`, handleError) : une réponse portant le code `session_not_found` est
 * CONVERTIE par le SDK en `AuthSessionMissingError` (name = "AuthSessionMissingError", status 400, code absent). Sur
 * le chemin `admin.signOut(jwt)` (une requête HTTP avec jeton explicite), cette erreur ne peut venir que de ce code
 * serveur : elle est donc reconnue comme équivalente. Le `code` brut reste reconnu (versions antérieures/ultérieures).
 */
export function classifySignOut(error: AuthErrorLike | null | undefined): Outcome {
  if (!error) return "revoked";
  if (error.code === "session_not_found" || error.name === "AuthSessionMissingError") return "already_revoked";
  if (isNetworkLike(error)) return "temporary";
  if (error.code && INVALID_TOKEN_CODES.has(error.code)) return "invalid_token";
  return "failed";
}

/**
 * Classe l'échec d'un `refreshSession` du jeton de rafraîchissement.
 *  - réseau avant traitement → `temporary` ;
 *  - délai dépassé, ou `refresh_token_already_used` (rotation déjà faite : le nouveau couple est perdu) →
 *    `refresh_rotation_unconfirmed` : JAMAIS une confirmation, ni une affirmation sur l'ancien jeton ;
 *  - `refresh_token_not_found`, `session_expired`, `invalid_grant` ou tout autre code → `invalid_token` : le
 *    credential est inutilisable, mais cela ne PROUVE aucune révocation.
 */
export function classifyRefreshFailure(error: AuthErrorLike | null | undefined, timedOut = false): Outcome {
  if (timedOut) return "refresh_rotation_unconfirmed";
  if (!error) return "failed";
  if (error.code === "refresh_token_already_used") return "refresh_rotation_unconfirmed";
  if (error.name === "AuthRetryableFetchError" || error.status === undefined || error.status === 0 || error.status >= 500 || error.status === 429) return "temporary";
  return "invalid_token";
}

/** Confirmation globale : B explicitement révoquée ET A révoquée, déjà révoquée, ou réellement sans credentials. */
export function isLogoutConfirmed(legs: { cookie: Outcome; bearer: Outcome }): boolean {
  const b = legs.bearer === "revoked" || legs.bearer === "already_revoked";
  const a = legs.cookie === "revoked" || legs.cookie === "already_revoked" || legs.cookie === "no_cookie";
  return b && a;
}

/** Une branche qui mérite une nouvelle tentative explicite (cookie de retry). */
export const isRetryable = (o: Outcome) => o === "temporary" || o === "refresh_rotation_unconfirmed";

/** Corps de réponse du DELETE : c'est lui, jamais le seul statut HTTP, qui dit ce qui a été prouvé. */
export interface LogoutResponse {
  /** Révocation globale confirmée (voir `isLogoutConfirmed`). */
  confirmed: boolean;
  legs: { cookie: Outcome; bearer: Outcome };
  /** Le serveur a ÉMIS des instructions de suppression de cookies (rien ne prouve leur application côté navigateur). */
  serverCookieClearIssued: boolean;
  /** Un cookie HttpOnly de nouvelle tentative a été émis. */
  pendingRetry: boolean;
  /** Les deux branches désignaient la même session : une seule révocation a été effectuée. */
  deduplicated: boolean;
  /** Limiteur de l'application dépassé : AUCUNE révocation n'a été tentée. */
  rateLimited: boolean;
}

export type ParsedLogout =
  | { kind: "response"; response: LogoutResponse }
  /** Corps absent, illisible ou incohérent : rien n'est prouvé. */
  | { kind: "unconfirmed" };

const isOutcome = (v: unknown): v is Outcome => typeof v === "string" && (OUTCOMES as readonly string[]).includes(v);

/**
 * Lit le corps de la réponse. `confirmed` n'est jamais pris tel quel : il est RECALCULÉ à partir des branches, et
 * un corps mal formé donne `unconfirmed`. Le statut HTTP n'intervient pas.
 */
export function parseLogoutResponse(body: unknown): ParsedLogout {
  if (!body || typeof body !== "object") return { kind: "unconfirmed" };
  const b = body as Record<string, unknown>;
  const legs = b.legs as Record<string, unknown> | undefined;
  if (!legs || typeof legs !== "object" || !isOutcome(legs.cookie) || !isOutcome(legs.bearer)) return { kind: "unconfirmed" };
  const rateLimited = b.rateLimited === true;
  const response: LogoutResponse = {
    legs: { cookie: legs.cookie, bearer: legs.bearer },
    confirmed: !rateLimited && isLogoutConfirmed({ cookie: legs.cookie, bearer: legs.bearer }),
    serverCookieClearIssued: b.serverCookieClearIssued === true,
    pendingRetry: b.pendingRetry === true,
    deduplicated: b.deduplicated === true,
    rateLimited,
  };
  return { kind: "response", response };
}

/** Les quatre faits de déconnexion, indépendants les uns des autres. */
export interface LogoutFacts {
  /** Session locale (stockage Supabase du navigateur) effectivement absente après coup. */
  localSessionCleared: boolean;
  /** Le serveur a émis les instructions de suppression des cookies (non vérifiable depuis le navigateur). */
  serverCookieClearIssued: boolean;
  /** Preuve explicite de révocation pour CHAQUE session existante (voir `isLogoutConfirmed`). */
  refreshTokenRevocationConfirmed: boolean;
  /** Jamais déclaré côté client : seul le serveur, sur les routes Coach protégées, peut refuser un ancien JWT. */
  accessTokenRejected: false;
  /** Détail des branches si le serveur a répondu de façon exploitable. */
  legs: { cookie: Outcome; bearer: Outcome } | null;
  rateLimited: boolean;
  pendingRetry: boolean;
}

const isProven = (o: Outcome) => o === "revoked" || o === "already_revoked";
const isAbsent = (o: Outcome) => o === "no_cookie" || o === "no_bearer";

/**
 * Fusionne le résultat d'une nouvelle tentative avec l'état précédent, branche par branche :
 *  - une branche déjà PROUVÉE le reste ;
 *  - une branche qui avait des credentials et qui n'en a plus (cookie de nouvelle tentative expiré…) devient
 *    `invalid_token` : l'absence actuelle ne prouve JAMAIS la révocation ;
 *  - sinon, le résultat le plus récent s'applique.
 */
export function mergeRetryLegs(
  prev: { cookie: Outcome; bearer: Outcome },
  next: { cookie: Outcome; bearer: Outcome }
): { cookie: Outcome; bearer: Outcome } {
  const merge = (p: Outcome, n: Outcome): Outcome => {
    if (isProven(p)) return p;
    if (isAbsent(n) && !isAbsent(p)) return "invalid_token";
    return n;
  };
  return { cookie: merge(prev.cookie, next.cookie), bearer: merge(prev.bearer, next.bearer) };
}

/** État conservé le temps d'afficher l'avertissement sur la page de connexion : jamais de jeton. */
export interface StoredLogoutState {
  legs: { cookie: Outcome; bearer: Outcome };
  pendingRetry: boolean;
  rateLimited: boolean;
}

export const LOGOUT_STATE_KEY = "eden-logout-state";

export function parseStoredLogoutState(raw: string | null): StoredLogoutState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const legs = v.legs as Record<string, unknown> | undefined;
    if (!legs || !isOutcome(legs.cookie) || !isOutcome(legs.bearer)) return null;
    return { legs: { cookie: legs.cookie, bearer: legs.bearer }, pendingRetry: v.pendingRetry === true, rateLimited: v.rateLimited === true };
  } catch {
    return null;
  }
}
