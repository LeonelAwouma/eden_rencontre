/**
 * Admin → Matching : correspondance unique entre catégories, sous-filtres et étapes.
 * Partagée par l'API (filtrage + compteurs) et la page (navigation), pour qu'aucun
 * compteur ne diverge de la liste qu'il annonce. Données pures, sans React.
 *
 * Les six étapes d'un duo sont exclusives : chaque duo est dans exactement une.
 *  alliance_pending     demande d'alliance envoyée, sans réponse
 *  relation             alliance acceptée, aucun engagement demandé
 *  engagement_pending   « S'engager » envoyé, l'autre n'a pas encore validé
 *  match                engagement accepté (vrai match)
 *  engagement_declined  alliance acceptée, engagement refusé
 *  declined             demande d'alliance refusée
 *
 * Les quatre catégories sont, elles aussi, disjointes (sauf « Tous les duos ») :
 *  À traiter          = alliance_pending + engagement_pending (une réponse est attendue)
 *  Alliances en cours = relation (alliance acceptée, sans engagement)
 *  Finalisés          = match + engagement_declined + declined
 *
 * « Alliances acceptées » est un ensemble inclusif (relations, engagements en cours,
 * matchs et engagements refusés) : il traverse les catégories et n'existe donc que
 * comme sous-filtre de « Tous les duos ».
 */

export type MatchStage =
  | "alliance_pending" | "relation" | "engagement_pending"
  | "match" | "engagement_declined" | "declined";

export type MatchCategory = "all" | "todo" | "ongoing" | "done";

export const MATCH_STAGES: ReadonlyArray<MatchStage> = [
  "alliance_pending", "relation", "engagement_pending", "match", "engagement_declined", "declined",
];

/** Étapes où l'alliance a été acceptée. */
export const ACCEPTED_STAGES: ReadonlyArray<MatchStage> = ["relation", "engagement_pending", "match", "engagement_declined"];

export interface MatchSubFilter {
  id: string;
  label: string;
  stages: ReadonlyArray<MatchStage>;
}

export interface MatchCategoryDef {
  id: MatchCategory;
  label: string;
  /** Premier sous-filtre = « tout » de la catégorie (valeur par défaut). */
  subs: ReadonlyArray<MatchSubFilter>;
}

export const MATCH_CATEGORIES: ReadonlyArray<MatchCategoryDef> = [
  {
    id: "all", label: "Tous les duos",
    subs: [
      { id: "all", label: "Tous les duos", stages: MATCH_STAGES },
      { id: "accepted", label: "Alliances acceptées", stages: ACCEPTED_STAGES },
    ],
  },
  {
    id: "todo", label: "À traiter",
    subs: [
      { id: "all", label: "Toutes les demandes", stages: ["alliance_pending", "engagement_pending"] },
      { id: "alliance_pending", label: "Demandes d'alliance", stages: ["alliance_pending"] },
      { id: "engagement_pending", label: "Engagements à valider", stages: ["engagement_pending"] },
    ],
  },
  {
    // Une seule étape réelle (« en relation ») : pas de sous-filtre à proposer.
    id: "ongoing", label: "Alliances en cours",
    subs: [{ id: "all", label: "En relation", stages: ["relation"] }],
  },
  {
    id: "done", label: "Finalisés",
    subs: [
      { id: "all", label: "Tous les finalisés", stages: ["match", "engagement_declined", "declined"] },
      { id: "match", label: "Matchs confirmés", stages: ["match"] },
      { id: "declined", label: "Refusés", stages: ["declined", "engagement_declined"] },
    ],
  },
];

export const DEFAULT_CATEGORY: MatchCategory = "all";
export const DEFAULT_SUB = "all";

const categoryDef = (c: MatchCategory) => MATCH_CATEGORIES.find((d) => d.id === c);

export function isMatchCategory(v: unknown): v is MatchCategory {
  return typeof v === "string" && MATCH_CATEGORIES.some((c) => c.id === v);
}

/** Sous-filtres à proposer pour une catégorie (aucun si elle n'en a qu'un). */
export function subFiltersOf(category: MatchCategory): ReadonlyArray<MatchSubFilter> {
  const subs = categoryDef(category)?.subs ?? [];
  return subs.length > 1 ? subs : [];
}

/** Conserve le sous-filtre s'il existe dans la catégorie, sinon retombe sur « tout ». */
export function compatibleSub(category: MatchCategory, sub: string): string {
  return categoryDef(category)?.subs.some((s) => s.id === sub) ? sub : DEFAULT_SUB;
}

/** Étapes retenues par un couple catégorie / sous-filtre (null si inconnu). */
export function stagesForFilter(category: MatchCategory, sub: string): ReadonlyArray<MatchStage> | null {
  return categoryDef(category)?.subs.find((s) => s.id === sub)?.stages ?? null;
}

/** Anciennes valeurs du paramètre `stage` de l'API, toujours acceptées. */
const LEGACY_STAGE_FILTERS: Record<string, { category: MatchCategory; sub: string } | { stages: ReadonlyArray<MatchStage> }> = {
  all: { category: "all", sub: "all" },
  accepted: { category: "all", sub: "accepted" },
  alliance_pending: { category: "todo", sub: "alliance_pending" },
  engagement_pending: { category: "todo", sub: "engagement_pending" },
  relation: { category: "ongoing", sub: "all" },
  match: { category: "done", sub: "match" },
  declined: { category: "done", sub: "declined" },
  engagement_declined: { stages: ["engagement_declined"] },
};

/** Étapes demandées par les paramètres de l'API (`category` + `sub`, ou ancien `stage`). */
export function stagesFromParams(p: { category?: string | null; sub?: string | null; stage?: string | null }): ReadonlyArray<MatchStage> {
  if (p.category) {
    if (isMatchCategory(p.category)) {
      return stagesForFilter(p.category, compatibleSub(p.category, p.sub || DEFAULT_SUB)) ?? MATCH_STAGES;
    }
    return MATCH_STAGES;
  }
  const legacy = LEGACY_STAGE_FILTERS[p.stage || "all"];
  if (!legacy) return MATCH_STAGES;
  if ("stages" in legacy) return legacy.stages;
  return stagesForFilter(legacy.category, legacy.sub) ?? MATCH_STAGES;
}

export type StageCounts = Record<MatchStage, number>;

export const emptyStageCounts = (): StageCounts => ({
  alliance_pending: 0, relation: 0, engagement_pending: 0, match: 0, engagement_declined: 0, declined: 0,
});

export function countStages(stages: Iterable<MatchStage>): StageCounts {
  const counts = emptyStageCounts();
  for (const s of stages) counts[s]++;
  return counts;
}

/** Compteur d'un ensemble d'étapes : somme exacte, donc identique à la liste filtrée. */
export function countForStages(counts: StageCounts, stages: ReadonlyArray<MatchStage>): number {
  return stages.reduce((sum, s) => sum + counts[s], 0);
}

export const categoryCount = (counts: StageCounts, category: MatchCategory): number =>
  countForStages(counts, stagesForFilter(category, DEFAULT_SUB) ?? []);

export const subFilterCount = (counts: StageCounts, category: MatchCategory, sub: string): number =>
  countForStages(counts, stagesForFilter(category, sub) ?? []);
