/**
 * Règles communes de l'inscription, partagées par le navigateur et le serveur
 * (aucune dépendance) : une seule définition, au lieu d'une par page.
 */

export const MIN_REGISTRATION_AGE = 18;

/**
 * Profil de base complet = genre, pays et ville renseignés dans profiles.
 * Utilisé par la garde de l'espace membre, la page « Complétez votre profil »
 * (Google) et l'admin. Le pseudo a sa propre fenêtre (member-gate) : il ne doit
 * pas renvoyer un membre vers tout le formulaire d'inscription, selfie compris.
 */
export function isRegistrationComplete(p: { gender?: unknown; country?: unknown; city?: unknown } | null | undefined): boolean {
  return !!(p && p.gender && p.country && p.city);
}

/** Date de naissance au format du formulaire (AAAA-MM-JJ), réelle, et majeure. */
export function isAdultBirthDate(iso: unknown, minAge = MIN_REGISTRATION_AGE): boolean {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const birth = new Date(`${iso}T00:00:00Z`);
  if (isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== iso) return false;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= minAge && age < 120;
}
