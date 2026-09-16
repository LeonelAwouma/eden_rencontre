/**
 * Source unique du secret de signature des sessions/jetons.
 *
 * Aucun repli : si ADMIN_SESSION_SECRET est absent (ou trop court), on échoue.
 * Un secret par défaut présent dans le dépôt permettrait de forger n'importe
 * quelle session admin. Ne lit que process.env — donc compatible Edge runtime
 * (middleware) autant que Node (routes API).
 */
export function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET manquant ou trop court (≥ 32 caractères requis)."
    );
  }
  return secret;
}
