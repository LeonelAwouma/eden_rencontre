// Questions du questionnaire dont la réponse est aussi une colonne historique de `profiles`
// (`marriage_vision`, `discovery_source`). La réponse enregistrée est la VALEUR canonique ci-dessous,
// jamais un libellé ni une position dans une liste : le libellé seul dépend de la langue.

import { MARRIAGE_VALUES } from "./values";
import { DISCOVERY_SOURCE_OPTIONS } from "./discovery-sources";

export interface Choice { value: string; label: string }

export const MARRIAGE_VISION_FIELD = "marriageVision";
export const DISCOVERY_SOURCE_FIELD = "discoverySource";
export const MARRIAGE_VISION_MIN = 1;
export const MARRIAGE_VISION_MAX = 3;

/** Libellés anglais des valeurs de `MARRIAGE_VALUES`, par identifiant (correspondance explicite). */
export const MARRIAGE_VALUE_LABELS_EN: Record<string, string> = {
  priere: "Daily Prayer",
  famille: "United Home",
  travail: "Ambition & Work",
  respect: "Mutual Respect",
  enfants: "Christian Upbringing",
  service: "Serving the Church",
};

/** Libellés anglais des sources de découverte, par valeur canonique (celle stockée en base). */
export const DISCOVERY_SOURCE_LABELS_EN: Record<string, string> = {
  TikTok: "TikTok",
  Instagram: "Instagram",
  Facebook: "Facebook",
  WhatsApp: "WhatsApp",
  "Bouche à oreille": "Word of mouth",
  YouTube: "YouTube",
  Autre: "Other",
};

/** Libellé d'une valeur de vision du mariage dans la langue demandée ; une valeur inconnue s'affiche telle quelle. */
export function marriageVisionLabel(value: string, locale: string): string {
  const known = MARRIAGE_VALUES.find((v) => v.id === value);
  if (!known) return value;
  return locale === "en" ? MARRIAGE_VALUE_LABELS_EN[known.id] : known.label;
}

/** Libellé d'une source de découverte dans la langue demandée ; une valeur inconnue s'affiche telle quelle. */
export function discoverySourceLabel(value: string, locale: string): string {
  return locale === "en" ? DISCOVERY_SOURCE_LABELS_EN[value] ?? value : value;
}

export const MARRIAGE_VISION_IDS: readonly string[] = MARRIAGE_VALUES.map((v) => v.id);
export const DISCOVERY_SOURCE_VALUES: readonly string[] = [...DISCOVERY_SOURCE_OPTIONS];

export const MARRIAGE_VISION_CHOICES_FR: Choice[] = MARRIAGE_VALUES.map((v) => ({ value: v.id, label: v.label }));
export const MARRIAGE_VISION_CHOICES_EN: Choice[] = MARRIAGE_VALUES.map((v) => ({ value: v.id, label: MARRIAGE_VALUE_LABELS_EN[v.id] }));
export const DISCOVERY_SOURCE_CHOICES_FR: Choice[] = DISCOVERY_SOURCE_VALUES.map((v) => ({ value: v, label: v }));
export const DISCOVERY_SOURCE_CHOICES_EN: Choice[] = DISCOVERY_SOURCE_VALUES.map((v) => ({ value: v, label: DISCOVERY_SOURCE_LABELS_EN[v] }));
