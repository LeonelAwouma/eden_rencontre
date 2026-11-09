/**
 * Identité technique des comptes « téléphone seul ».
 *
 * Un membre inscrit uniquement avec son numéro n'a pas d'adresse e-mail. Supabase
 * Auth et tout le code de connexion s'appuient sur email + mot de passe : on lui
 * attribue donc une adresse technique dérivée de son numéro (jamais affichée,
 * jamais utilisée pour écrire). Aucun SMS ni OTP n'intervient (zéro coût).
 * Le vrai numéro vit dans profiles.phone ; profiles.email reste vide.
 */

export const PHONE_EMAIL_DOMAIN = "phone.eden.invalid";

/** « +237 690 12 34 56 » → « +237690123456 » (null si ce n'est pas un numéro E.164). */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const compact = input.replace(/[\s().-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? compact : null;
}

/** Adresse technique d'un numéro E.164, ou null si le numéro est invalide. */
export function phoneToSyntheticEmail(phone: unknown): string | null {
  const e164 = normalizePhone(phone);
  return e164 ? `${e164.slice(1)}@${PHONE_EMAIL_DOMAIN}` : null;
}

/** Vrai pour une adresse technique (à ne jamais afficher ni utiliser pour envoyer). */
export function isSyntheticEmail(email: unknown): boolean {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

/** Retrouve le numéro E.164 à partir de l'adresse technique. */
export function phoneFromSyntheticEmail(email: unknown): string | null {
  if (!isSyntheticEmail(email)) return null;
  const digits = String(email).split("@")[0];
  return /^\d{8,15}$/.test(digits) ? `+${digits}` : null;
}

/**
 * Identifiant de connexion saisi (e-mail OU numéro) → adresse Supabase.
 * Un texte contenant « @ » est un e-mail ; sinon on tente un numéro international.
 */
export function loginIdentifierToEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  if (value.includes("@")) return value.toLowerCase();
  return phoneToSyntheticEmail(value);
}

/** Adresse à afficher/utiliser pour écrire : null pour une adresse technique ou vide. */
export function realEmailOrNull(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim();
  return v && !isSyntheticEmail(v) ? v : null;
}
