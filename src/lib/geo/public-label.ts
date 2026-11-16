/**
 * Étiquette publique de la ville dans `profiles.city`.
 *
 * `profiles.city` est lisible par tous les membres approuvés (RLS ligne seulement). On n'y écrit donc
 * JAMAIS plus que ce que le membre accepte d'exposer : la ville réelle seulement si son niveau
 * d'affichage est « ville », sinon une valeur générique non vide (pour que `isRegistrationComplete`
 * reste inchangé). Une valeur générique n'est jamais une vraie ville : deux membres qui la partagent
 * ne sont pas « dans la même ville ».
 */

export const GENERIC_CITY_LABEL = "Non précisée";

/** Variantes reconnues comme génériques (casse/accents ignorés). */
const GENERIC_NORMALIZED = new Set(["non precisee", "not specified", "non renseignee", "unspecified"]);

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function isGenericCityLabel(value: string | null | undefined): boolean {
  if (!value) return true; // vide = inconnu : jamais une ville
  return GENERIC_NORMALIZED.has(fold(value));
}

export type DisplayLevel = "none" | "country" | "region" | "department" | "arrondissement" | "city";

export const DISPLAY_LEVELS: readonly DisplayLevel[] = [
  "none",
  "country",
  "region",
  "department",
  "arrondissement",
  "city",
];

export function isDisplayLevel(v: unknown): v is DisplayLevel {
  return typeof v === "string" && (DISPLAY_LEVELS as readonly string[]).includes(v);
}

/** Valeur à écrire dans `profiles.city` selon le consentement d'affichage. */
export function publicCityLabel(cityName: string | null | undefined, level: DisplayLevel): string {
  if (level === "city" && cityName && !isGenericCityLabel(cityName)) return cityName.trim();
  return GENERIC_CITY_LABEL;
}

function isExplicitGenericLabel(value: string | null | undefined): boolean {
  return !!value && GENERIC_NORMALIZED.has(fold(value));
}

/**
 * « Même ville » pour le score de compatibilité : faux dès qu'une des deux valeurs est une étiquette
 * générique explicite. Pour tout le reste (profils historiques, y compris valeurs vides) le résultat est
 * strictement identique à l'ancienne comparaison `a?.toLowerCase() === b?.toLowerCase()`.
 */
export function isSameRealCity(a: string | null | undefined, b: string | null | undefined): boolean {
  if (isExplicitGenericLabel(a) || isExplicitGenericLabel(b)) return false;
  return a?.toLowerCase() === b?.toLowerCase();
}
