/**
 * Cookie de session lu par la garde SERVEUR de l'espace Coach.
 *
 * Pourquoi un cookie : la session du navigateur vit dans `localStorage` (client Supabase) et n'accompagne jamais
 * une navigation de page. Le serveur ne peut vérifier l'accès à `/coach` qu'à partir d'un cookie `httpOnly`.
 * Le cookie posé à la connexion expire avec le jeton (≈ 1 h) alors que la session du navigateur est renouvelée :
 * `POST /api/auth/session` le ré-établit à partir de la session du navigateur, UNIQUEMENT pour un coach actif.
 *
 * Ce module est volontairement pur et sans dépendance serveur : constantes, calculs testables, et fonctions
 * navigateur qui n'importent leurs dépendances qu'à l'appel.
 */

export const ACCESS_COOKIE = "sb-access-token";
export const REFRESH_COOKIE = "sb-refresh-token";
/** Durée de vie maximale du cookie d'accès : celle d'un jeton Supabase par défaut. */
export const MAX_ACCESS_COOKIE_SECONDS = 3600;
/** Rafraîchissement périodique pendant que l'espace Coach est ouvert. */
export const COACH_COOKIE_REFRESH_MS = 30 * 60 * 1000;

/** Garde-fou anti-boucle de la page de connexion : au plus une resynchronisation automatique par fenêtre. */
export const COACH_SYNC_BREAKER_KEY = "eden-coach-cookie-sync";
export const COACH_SYNC_COOLDOWN_MS = 20_000;

/**
 * Secondes de validité restantes d'un JWT, d'après sa revendication `exp` ; null si illisible.
 * À n'appliquer qu'à un jeton DÉJÀ vérifié par le service d'authentification : la valeur sert seulement à borner
 * la durée de vie du cookie, jamais à décider d'un accès.
 */
export function jwtSecondsLeft(token: string, nowMs: number = Date.now()): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="))) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
    return Math.floor(payload.exp - nowMs / 1000);
  } catch {
    return null;
  }
}

/** Durée de vie du cookie : le reste de validité du jeton, plafonné ; null si le jeton est expiré ou illisible. */
export function cookieMaxAgeFor(token: string, nowMs: number = Date.now()): number | null {
  const left = jwtSecondsLeft(token, nowMs);
  if (left === null || left <= 0) return null;
  return Math.min(left, MAX_ACCESS_COOKIE_SECONDS);
}

/** Une resynchronisation automatique est-elle permise ? Jamais deux dans la fenêtre ; un horodatage futur ne bloque pas. */
export function canAttemptCoachSync(nowMs: number, lastAttemptMs: number | null): boolean {
  if (lastAttemptMs === null || !Number.isFinite(lastAttemptMs)) return true;
  const elapsed = nowMs - lastAttemptMs;
  return elapsed < 0 || elapsed >= COACH_SYNC_COOLDOWN_MS;
}

export function readLastCoachSyncAttempt(): number | null {
  try {
    const raw = window.sessionStorage.getItem(COACH_SYNC_BREAKER_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function markCoachSyncAttempt(nowMs: number = Date.now()): void {
  try { window.sessionStorage.setItem(COACH_SYNC_BREAKER_KEY, String(nowMs)); } catch { /* stockage indisponible : le garde-fou ne bloque alors rien */ }
}

/**
 * Interprète la réponse du serveur à la synchronisation. Fonction pure : le statut décide, sans confondre un refus
 * d'autorisation (401/403/409 → `denied`) avec une panne (réseau, 5xx → `network_error`) ni avec une ancienne session
 * serveur qu'il n'a pas pu traiter (502/503 avec `oldSession` → `unconfirmed_old_session`).
 */
export function interpretSyncResponse(status: number, body: unknown): "ok" | "denied" | "network_error" | "unconfirmed_old_session" {
  if (status === 200) return "ok";
  if (status === 401 || status === 403 || status === 409) return "denied";
  const hasOldSession = Boolean(body && typeof body === "object" && "oldSession" in (body as Record<string, unknown>));
  if ((status === 502 || status === 503) && hasOldSession) return "unconfirmed_old_session";
  return "network_error";
}

/**
 * (Navigateur) Demande au serveur de ré-établir le cookie de session du coach à partir de la session courante.
 * `authHeaders()` passe par `supabase.auth.getSession()`, qui renouvelle le jeton si nécessaire. Le résultat est
 * typé : seul `ok` signifie « jeton valide ET coach actif, cookie posé ». Aucune redirection ni déconnexion ici.
 */
export async function syncCoachSessionCookie(): Promise<"ok" | "denied" | "network_error" | "no_session" | "unconfirmed_old_session"> {
  try {
    const { authHeaders } = await import("@/lib/auth");
    const headers = await authHeaders();
    if (!headers.Authorization) return "no_session";
    const res = await fetch("/api/auth/session", { method: "POST", headers, credentials: "same-origin", cache: "no-store" });
    let body: unknown = null;
    try { body = await res.json(); } catch { /* corps illisible */ }
    return interpretSyncResponse(res.status, body);
  } catch {
    return "network_error";
  }
}
