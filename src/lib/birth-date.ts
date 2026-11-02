/**
 * Conversion et validation de la date de naissance saisie au format JJ/MM/AAAA
 * (affichage) vers/depuis le format interne AAAA-MM-JJ (ISO, stocké en base).
 * Pur, sans dépendance React ni serveur — importable côté client pour une
 * validation immédiate, en réutilisant les mêmes règles que le serveur
 * (isRealBirthDateIso / isAdultBirthDate de registration-rules.ts), jamais un
 * second calcul d'âge.
 */

import { isRealBirthDateIso, isAdultBirthDate, MIN_REGISTRATION_AGE } from "./registration-rules";

export type BirthDateErrorKey =
  | "incomplete"
  | "invalidDate"
  | "future"
  | "tooYoung"
  | "implausibleYear"
  | null;

export interface BirthDateValidation {
  ok: boolean;
  iso: string | null;
  errorKey: BirthDateErrorKey;
}

const MIN_BIRTH_YEAR = 1900;

/** Ne garde que les chiffres saisis, insère les "/" automatiquement, limite à 10 caractères (JJ/MM/AAAA). */
export function maskBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let out = day;
  if (month) out += `/${month}`;
  if (year) out += `/${year}`;
  return out;
}

/** AAAA-MM-JJ -> JJ/MM/AAAA (chaîne vide si entrée vide/invalide). */
export function formatBirthDateDisplay(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * JJ/MM/AAAA -> AAAA-MM-JJ, sans valider que la date existe réellement (juste
 * la forme). Retourne null si la saisie n'est pas complète/bien formée.
 */
export function parseBirthDateDisplay(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

/**
 * Valide une saisie JJ/MM/AAAA complète : forme, réalité calendaire (déléguée à
 * isRealBirthDateIso), puis majorité (déléguée à isAdultBirthDate) — aucun calcul
 * d'âge dupliqué ici.
 */
export function validateBirthDateDisplay(display: string, minAge = MIN_REGISTRATION_AGE): BirthDateValidation {
  const trimmed = display.trim();
  if (trimmed.length < 10) return { ok: false, iso: null, errorKey: trimmed.length === 0 ? "incomplete" : "incomplete" };

  const candidate = parseBirthDateDisplay(trimmed);
  if (!candidate) return { ok: false, iso: null, errorKey: "invalidDate" };

  if (!isRealBirthDateIso(candidate)) {
    return { ok: false, iso: null, errorKey: "invalidDate" };
  }

  const year = Number(candidate.slice(0, 4));
  const currentYear = new Date().getUTCFullYear();
  if (year < MIN_BIRTH_YEAR) {
    return { ok: false, iso: null, errorKey: "implausibleYear" };
  }
  if (new Date(`${candidate}T00:00:00Z`).getTime() > Date.now()) {
    return { ok: false, iso: null, errorKey: "future" };
  }
  if (year > currentYear) {
    return { ok: false, iso: null, errorKey: "future" };
  }

  if (!isAdultBirthDate(candidate, minAge)) {
    return { ok: false, iso: null, errorKey: "tooYoung" };
  }

  return { ok: true, iso: candidate, errorKey: null };
}
