/**
 * Validation du lien d'une visioconférence hébergée hors Eden (Meet, Zoom, Teams…).
 * Utilisée côté serveur (source de vérité) et côté admin (aperçu en direct).
 */

export type ExternalUrlCheck =
  | { ok: true; url: string; host: string }
  | { ok: false; reason: "empty" | "invalid" | "not_https" | "credentials" | "too_long" | "private_host" };

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?$)/i;

export function validateExternalMeetUrl(raw: unknown): ExternalUrlCheck {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, reason: "empty" };
  const value = raw.trim();
  if (value.length > 500) return { ok: false, reason: "too_long" };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "not_https" };
  if (u.username || u.password) return { ok: false, reason: "credentials" };
  if (PRIVATE_HOST.test(u.hostname)) return { ok: false, reason: "private_host" };
  if (!u.hostname.includes(".")) return { ok: false, reason: "invalid" };
  return { ok: true, url: u.toString(), host: u.hostname.replace(/^www\./, "") };
}

export const EXTERNAL_URL_ERRORS: Record<string, string> = {
  empty: "Collez le lien de la visioconférence.",
  invalid: "Ce lien n'est pas une adresse valide.",
  not_https: "Seuls les liens HTTPS sont acceptés.",
  credentials: "Le lien ne doit pas contenir d'identifiant ni de mot de passe.",
  too_long: "Ce lien est trop long.",
  private_host: "Ce lien pointe vers une adresse non publique.",
};
