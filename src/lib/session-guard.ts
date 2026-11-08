/**
 * Vérification « la session de ce jeton existe-t-elle encore ? » pour les routes Coach.
 *
 * Contexte : après `auth.admin.signOut(jwt, "local")`, l'access token déjà émis reste valide jusqu'à son expiration
 * (≤ 1 h) pour `getUser()`. Pour les COACH uniquement, on ajoute donc un contrôle explicite du `session_id`
 * auprès de `auth.sessions`, par la fonction SQL `session_is_active` (voir la migration 20261109, NON exécutée par
 * ce dépôt : à appliquer à la main).
 *
 * Règles :
 *  - le `session_id` n'est lu QUE dans un jeton déjà authentifié par le service Auth (`getUser`) : jamais un simple
 *    décodage comme preuve ;
 *  - désactivé par défaut (`COACH_REQUIRE_ACTIVE_SESSION` ≠ "true") : sans la migration, les coachs seraient refusés.
 *    Ne PAS l'activer avant d'avoir validé, sur un Supabase de développement, l'effet réel de `admin.signOut` sur
 *    `auth.sessions` et le comportement de `session_is_active` ;
 *  - activé : fail-closed (claim absent, erreur RPC, fonction absente → refus).
 */
import { getSupabaseAdmin } from "./supabase-admin";

export function isActiveSessionRequired(): boolean {
  return process.env.COACH_REQUIRE_ACTIVE_SESSION === "true";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `session_id` d'un jeton DÉJÀ vérifié par le service Auth. null si absent ou mal formé.
 * À ne jamais utiliser sur un jeton non authentifié.
 */
export function sessionIdOfVerifiedToken(verifiedToken: string): string | null {
  const parts = verifiedToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="))) as { session_id?: unknown };
    return typeof payload.session_id === "string" && UUID.test(payload.session_id) ? payload.session_id : null;
  } catch {
    return null;
  }
}

/** La session existe-t-elle encore côté Auth ? true/false ; toute erreur → false (fail-closed). */
export async function isSessionStillActive(verifiedToken: string): Promise<boolean> {
  const sessionId = sessionIdOfVerifiedToken(verifiedToken);
  if (!sessionId) return false;
  try {
    const { data, error } = await getSupabaseAdmin().rpc("session_is_active", { p_session_id: sessionId });
    return !error && data === true;
  } catch {
    return false;
  }
}

/**
 * Point de contrôle unique pour un COACH déjà authentifié : drapeau désactivé → accepté (comportement actuel) ;
 * activé → la session doit exister. Ne concerne jamais les membres.
 */
export async function isCoachSessionAccepted(verifiedToken: string): Promise<boolean> {
  if (!isActiveSessionRequired()) return true;
  return isSessionStillActive(verifiedToken);
}
