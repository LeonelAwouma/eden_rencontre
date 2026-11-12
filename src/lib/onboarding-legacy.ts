// Reprise des anciennes réponses « vision du mariage » et « source de découverte ».
//
// Ces deux informations vivaient dans les colonnes `profiles.marriage_vision` / `profiles.discovery_source`
// (inscription, puis /dashboard/profile). Elles sont maintenant des questions du questionnaire, mais les
// colonnes restent la référence des autres fonctionnalités. Ce module (fonctions PURES, sans accès réseau)
// décide, sans jamais rien détruire :
//   - ce qu'une ancienne valeur veut dire (correspondance explicite, jamais approximative) ;
//   - ce qu'il faut pré-remplir dans le questionnaire ;
//   - ce qu'il faut écrire dans les colonnes quand le membre fait un choix ;
//   - ce qui part dans les archives (`marriageVisionLegacy`, `discoverySourceLegacy`).

import { MARRIAGE_VALUES } from "./values";
import {
  DISCOVERY_SOURCE_FIELD, DISCOVERY_SOURCE_LABELS_EN, DISCOVERY_SOURCE_VALUES,
  MARRIAGE_VALUE_LABELS_EN, MARRIAGE_VISION_FIELD, MARRIAGE_VISION_IDS, MARRIAGE_VISION_MAX,
} from "./questionnaire-choices";

export const MARRIAGE_VISION_ARCHIVE = "marriageVisionLegacy";
export const DISCOVERY_SOURCE_ARCHIVE = "discoverySourceLegacy";
/** Clés d'archive : jamais des questions, jamais écrites par le navigateur, toujours fusionnées par le serveur. */
export const ARCHIVE_KEYS = [MARRIAGE_VISION_ARCHIVE, DISCOVERY_SOURCE_ARCHIVE] as const;

type Answers = Record<string, unknown>;
export interface LegacyColumns { marriage_vision?: unknown; discovery_source?: unknown }

/** Comparaison tolérante à la casse, aux accents et aux espaces — mais toujours sur le texte ENTIER. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const hasKey = (o: Answers | null | undefined, key: string) => !!o && Object.prototype.hasOwnProperty.call(o, key);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : [];
const unique = (list: string[]) => [...new Set(list)];
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// ── Correspondances explicites ───────────────────────────────────────────────

/**
 * libellé français, libellé anglais → identifiant. L'identifiant lui-même n'est reconnu qu'à l'IDENTIQUE
 * (« priere », pas « Prière ») : un mot isolé qui lui ressemble n'est pas une valeur historique. Rien d'autre n'est reconnu.
 */
const MARRIAGE_VISION_LABEL_ALIASES = new Map<string, string>(
  MARRIAGE_VALUES.flatMap((v) => [
    [norm(v.label), v.id],
    [norm(MARRIAGE_VALUE_LABELS_EN[v.id]), v.id],
  ] as [string, string][])
);
const marriageVisionIdOf = (raw: string): string | undefined =>
  MARRIAGE_VISION_IDS.includes(raw) ? raw : MARRIAGE_VISION_LABEL_ALIASES.get(norm(raw));

/**
 * Libellés enregistrés tels quels par l'ancien formulaire de /dashboard/profile. Ils n'ont PAS d'équivalent
 * dans `MARRIAGE_VALUES` (« Mariage biblique » n'est pas « Prière Quotidienne ») : ils ne sont jamais convertis.
 * Liste documentaire : toute valeur que `marriageVisionIdOf` ne reconnaît pas est de toute façon conservée telle quelle.
 */
export const RETIRED_PROFILE_VISION_LABELS: readonly string[] = [
  "Mariage biblique", "Fondé sur la prière", "Ministère en couple", "Éducation chrétienne des enfants", "Fidélité absolue", "Communication ouverte",
  "Biblical marriage", "Prayer-based", "Ministry as a couple", "Christian education of children", "Absolute fidelity", "Open communication",
];

/** valeur canonique ou libellé anglais → valeur canonique. */
const DISCOVERY_SOURCE_ALIASES = new Map<string, string>(
  DISCOVERY_SOURCE_VALUES.flatMap((v) => [[norm(v), v], [norm(DISCOVERY_SOURCE_LABELS_EN[v]), v]] as [string, string][])
);

export interface MarriageVisionLegacy { recognized: string[]; unrecognized: string[] }

/** Trie le contenu de `profiles.marriage_vision` : identifiants reconnus d'un côté, valeurs à conserver de l'autre. */
export function classifyMarriageVision(column: unknown): MarriageVisionLegacy {
  const recognized: string[] = [];
  const unrecognized: string[] = [];
  for (const raw of strings(column)) {
    const id = marriageVisionIdOf(raw);
    if (id) { if (!recognized.includes(id)) recognized.push(id); }
    else if (!unrecognized.includes(raw)) unrecognized.push(raw);
  }
  return { recognized, unrecognized };
}

export interface DiscoverySourceLegacy { recognized: string | null; unrecognized: string | null }

export function classifyDiscoverySource(column: unknown): DiscoverySourceLegacy {
  const raw = typeof column === "string" ? column.trim() : "";
  if (!raw) return { recognized: null, unrecognized: null };
  const value = DISCOVERY_SOURCE_ALIASES.get(norm(raw));
  return value ? { recognized: value, unrecognized: null } : { recognized: null, unrecognized: raw };
}

// ── Lecture : pré-remplissage et complétion ──────────────────────────────────

/**
 * Réponses à présenter dans l'éditeur. Une question est pré-remplie UNIQUEMENT si sa clé est absente du
 * questionnaire (une réponse présente, même vide, appartient au membre) et seulement avec des valeurs reconnues.
 * Au-delà du maximum autorisé, rien n'est pré-rempli : tronquer reviendrait à choisir à la place du membre.
 */
export function mergeLegacyAnswers<T extends Answers>(answers: T | null | undefined, profile: LegacyColumns | null | undefined): T {
  const out: Answers = { ...(answers ?? {}) };
  if (!profile) return out as T;
  if (!hasKey(out, MARRIAGE_VISION_FIELD)) {
    const { recognized } = classifyMarriageVision(profile.marriage_vision);
    if (recognized.length > 0 && recognized.length <= MARRIAGE_VISION_MAX) out[MARRIAGE_VISION_FIELD] = recognized;
  }
  if (!hasKey(out, DISCOVERY_SOURCE_FIELD)) {
    const { recognized } = classifyDiscoverySource(profile.discovery_source);
    if (recognized) out[DISCOVERY_SOURCE_FIELD] = recognized;
  }
  return out as T;
}

/**
 * Réponses à utiliser pour CALCULER la complétion (badge, tableau de bord, parrainage, administration) :
 * un membre qui a déjà renseigné sa vision du mariage — quelle qu'en soit l'ancienne forme — a répondu à la
 * question. Calcul en mémoire : le questionnaire en base n'est jamais réécrit pour cela.
 */
export function answersForCompletion(answers: Answers | null | undefined, profile: LegacyColumns | null | undefined): Answers {
  const out: Answers = { ...(answers ?? {}) };
  if (strings(out[MARRIAGE_VISION_FIELD]).length === 0) {
    const legacy = strings(profile?.marriage_vision);
    if (legacy.length > 0) out[MARRIAGE_VISION_FIELD] = legacy;
  }
  return out;
}

/**
 * Anciennes réponses encore « en attente » pour une question : valeurs non reconnues toujours présentes dans la
 * colonne, tant que le membre n'a pas fait de choix explicite (sa réponse courante est encore celle qui a été
 * pré-remplie). Après un choix, l'avertissement disparaît ; les valeurs, elles, sont archivées.
 */
export function pendingLegacyValues(fieldId: string, currentAnswer: unknown, profile: LegacyColumns | null | undefined): string[] {
  if (!profile) return [];
  if (fieldId === MARRIAGE_VISION_FIELD) {
    const { recognized, unrecognized } = classifyMarriageVision(profile.marriage_vision);
    // Trop de valeurs reconnues pour être pré-remplies : toutes les anciennes réponses restent affichées telles quelles.
    if (recognized.length > MARRIAGE_VISION_MAX) return strings(currentAnswer).length === 0 ? unique(strings(profile.marriage_vision)) : [];
    return unrecognized.length > 0 && sameSet(strings(currentAnswer), recognized) ? unrecognized : [];
  }
  if (fieldId === DISCOVERY_SOURCE_FIELD) {
    const { unrecognized } = classifyDiscoverySource(profile.discovery_source);
    const current = typeof currentAnswer === "string" ? currentAnswer.trim() : "";
    return unrecognized && !current ? [unrecognized] : [];
  }
  return [];
}

/**
 * Vision du mariage à AFFICHER (lecture seule) : la réponse du questionnaire si elle existe, sinon le contenu de
 * la colonne ; les anciennes valeurs encore en attente restent visibles à la suite. Valeurs brutes : l'appelant
 * les traduit avec `marriageVisionLabel` (une valeur inconnue s'affiche telle quelle).
 */
export function displayedMarriageVision(answers: Answers | null | undefined, profile: LegacyColumns | null | undefined): string[] {
  const answered = unique(strings(answers?.[MARRIAGE_VISION_FIELD]));
  if (answered.length > 0) return unique([...answered, ...pendingLegacyValues(MARRIAGE_VISION_FIELD, answered, profile)]);
  const { recognized, unrecognized } = classifyMarriageVision(profile?.marriage_vision);
  return [...recognized, ...unrecognized];
}

/** Valeurs archivées (réponses précédentes remplacées par un choix explicite) : consultation seule. */
export function archivedLegacyValues(answers: Answers | null | undefined): { marriageVision: string[]; discoverySource: string[] } {
  return {
    marriageVision: unique(strings(answers?.[MARRIAGE_VISION_ARCHIVE])),
    discoverySource: unique(strings(answers?.[DISCOVERY_SOURCE_ARCHIVE])),
  };
}

// ── Écriture : validation, colonnes, archives ────────────────────────────────

export type SyncedAnswerError = "marriage_vision_invalid" | "marriage_vision_too_many" | "discovery_source_invalid";

/**
 * Validation SERVEUR des deux questions synchronisées. Clé absente : rien à valider. Réponse vide : acceptée
 * (elle ne modifie aucune colonne). Sinon : valeurs autorisées uniquement, sans doublon, dans les bornes.
 */
export function validateSyncedAnswers(answers: Answers): { ok: true } | { ok: false; code: SyncedAnswerError; field: string } {
  if (hasKey(answers, MARRIAGE_VISION_FIELD)) {
    const raw = answers[MARRIAGE_VISION_FIELD];
    if (raw !== null && raw !== undefined) {
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string" || !MARRIAGE_VISION_IDS.includes(v)) || new Set(raw).size !== raw.length) {
        return { ok: false, code: "marriage_vision_invalid", field: MARRIAGE_VISION_FIELD };
      }
      if (raw.length > MARRIAGE_VISION_MAX) return { ok: false, code: "marriage_vision_too_many", field: MARRIAGE_VISION_FIELD };
    }
  }
  if (hasKey(answers, DISCOVERY_SOURCE_FIELD)) {
    const raw = answers[DISCOVERY_SOURCE_FIELD];
    if (raw !== null && raw !== undefined && raw !== "" && (typeof raw !== "string" || !DISCOVERY_SOURCE_VALUES.includes(raw))) {
      return { ok: false, code: "discovery_source_invalid", field: DISCOVERY_SOURCE_FIELD };
    }
  }
  return { ok: true };
}

export interface QuestionnaireSavePlan {
  /** Questionnaire à enregistrer : réponses reçues + archives fusionnées. */
  questionnaire: Answers;
  /** Colonnes à mettre à jour — seulement celles qui changent réellement, jamais vers une valeur vide. */
  columns: { marriage_vision?: string[]; discovery_source?: string };
}

/**
 * Prépare une sauvegarde à partir des réponses reçues (déjà validées) et de la ligne ACTUELLE en base.
 *
 * Règles de non-destruction :
 *   - une clé absente ou une réponse vide ne touche jamais la colonne ;
 *   - une réponse identique à ce que la colonne contient déjà (c'est le cas d'un simple pré-remplissage)
 *     n'est PAS un choix : rien n'est réécrit, rien n'est archivé ;
 *   - un choix différent remplace la colonne ; les anciennes valeurs non reconnues partent dans l'archive ;
 *   - les archives viennent de la base et ne font que grossir : ce que le navigateur envoie sous ces clés
 *     est ignoré (un ancien onglet qui ne les connaît pas ne peut donc pas les effacer).
 */
export function planQuestionnaireSave(incoming: Answers, current: { questionnaire?: unknown } & LegacyColumns): QuestionnaireSavePlan {
  const stored = (current.questionnaire && typeof current.questionnaire === "object" && !Array.isArray(current.questionnaire)
    ? current.questionnaire
    : {}) as Answers;

  const questionnaire: Answers = { ...incoming };
  for (const key of ARCHIVE_KEYS) delete questionnaire[key];

  const columns: QuestionnaireSavePlan["columns"] = {};
  let visionArchive = unique(strings(stored[MARRIAGE_VISION_ARCHIVE]));
  let sourceArchive = unique(strings(stored[DISCOVERY_SOURCE_ARCHIVE]));

  const selection = hasKey(incoming, MARRIAGE_VISION_FIELD) ? unique(strings(incoming[MARRIAGE_VISION_FIELD])) : [];
  if (selection.length > 0) {
    const before = classifyMarriageVision(current.marriage_vision);
    if (!sameSet(selection, before.recognized)) {
      columns.marriage_vision = selection;
      visionArchive = unique([...visionArchive, ...before.unrecognized]);
    }
  }

  const source = hasKey(incoming, DISCOVERY_SOURCE_FIELD) && typeof incoming[DISCOVERY_SOURCE_FIELD] === "string"
    ? (incoming[DISCOVERY_SOURCE_FIELD] as string).trim()
    : "";
  if (source) {
    const before = classifyDiscoverySource(current.discovery_source);
    if (source !== before.recognized) {
      columns.discovery_source = source;
      if (before.unrecognized) sourceArchive = unique([...sourceArchive, before.unrecognized]);
    }
  }

  if (visionArchive.length > 0) questionnaire[MARRIAGE_VISION_ARCHIVE] = visionArchive;
  if (sourceArchive.length > 0) questionnaire[DISCOVERY_SOURCE_ARCHIVE] = sourceArchive;
  return { questionnaire, columns };
}
