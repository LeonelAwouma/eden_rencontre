// Métadonnées LÉGÈRES de « Bâtir sur le roc » — uniquement ce qu'il faut pour
// savoir à quel pilier appartient une leçon et calculer le déblocage
// progressif des piliers, SANS jamais importer le contenu complet
// (src/lib/formation/batir-sur-le-roc.ts, réservé au serveur — voir son
// en-tête). Les numéros/slugs de pilier et de leçon sont communs au français
// et à l'anglais (garde-fou vérifié dans src/lib/formation/ui.ts) : ces
// métadonnées n'ont donc pas besoin d'être dupliquées par langue.
//
// Limitation connue (voir le bilan de livraison) : useFormationLocale()
// (src/lib/formation/ui.ts) importe lui-même BATIR_SUR_LE_ROC/_EN/STORIES/_EN
// en entier pour la localisation FR/EN instantanée du contenu — ce module
// réduit seulement les imports directs de batir-sur-le-roc.ts listés
// ci-dessous, il ne supprime pas cette autre source du même problème.

export const PILLAR_LESSON_SLUGS: Record<number, string[]> = {
  1: ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6"],
  2: ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"],
  3: ["3-1", "3-2", "3-3", "3-4", "3-5", "3-6", "3-7"],
  4: [],
  5: [],
  6: [],
};

const BASE = "/formation/batir-sur-le-roc";

export interface LessonMeta { number: string; slug: string; title: string }
export interface PillarMeta { number: number; slug: string; title: string; card: string; lessons: LessonMeta[] }

/**
 * Métadonnées de catalogue (titre, vignette — publique, simple aperçu —, et
 * titre/numéro de chaque leçon) : jamais le corps d'une leçon. Doit rester en
 * phase avec batir-sur-le-roc.ts/pilier-2.ts/pilier-3.ts (titres/numéros), un
 * garde-fou dev-only existe déjà dans ui.ts pour la parité FR/EN du contenu
 * riche ; ces métadonnées-ci sont communes aux deux langues par construction.
 */
export const PILLAR_META: PillarMeta[] = [
  {
    number: 1, slug: "vision-sacree", title: "La vision sacrée du mariage", card: `${BASE}/images/pilier-1-carte.webp`,
    lessons: [
      { number: "1.1", slug: "1-1", title: "Entre éloge et réalité" },
      { number: "1.2", slug: "1-2", title: "Le mariage comme sanctuaire" },
      { number: "1.3", slug: "1-3", title: "Le mariage comme réponse à un but" },
      { number: "1.4", slug: "1-4", title: "Alignement théologique et spirituel" },
      { number: "1.5", slug: "1-5", title: "Le renoncement et le service mutuel" },
      { number: "1.6", slug: "1-6", title: "L'autel familial et la présence de Dieu" },
    ],
  },
  {
    number: 2, slug: "connaissance-de-soi", title: "Connaissance de soi, tempéraments & guérison intérieure", card: `${BASE}/images/pilier-2-carte.webp`,
    lessons: [
      { number: "2.1", slug: "2-1", title: "Se connaître pour mieux aimer" },
      { number: "2.2", slug: "2-2", title: "Identifier et guérir ses blessures" },
      { number: "2.3", slug: "2-3", title: "La rupture avec les schémas toxiques" },
      { number: "2.4", slug: "2-4", title: "Clarifier ses attentes, valeurs et besoins" },
      { number: "2.5", slug: "2-5", title: "Estime de soi et célibat épanoui" },
      { number: "2.6", slug: "2-6", title: "Le pardon et la réconciliation" },
      { number: "2.7", slug: "2-7", title: "Brisement de liens spirituels" },
    ],
  },
  {
    number: 3, slug: "bilan-de-maturite", title: "Bilan de maturité & préparation multidimensionnelle", card: `${BASE}/images/pilier-3-carte.webp`,
    lessons: [
      { number: "3.1", slug: "3-1", title: "La maturité spirituelle" },
      { number: "3.2", slug: "3-2", title: "La maturité émotionnelle" },
      { number: "3.3", slug: "3-3", title: "La maturité financière" },
      { number: "3.4", slug: "3-4", title: "La maturité sociale et professionnelle" },
      { number: "3.5", slug: "3-5", title: "La préparation physique" },
      { number: "3.6", slug: "3-6", title: "Les 5 langages de l'amour" },
      { number: "3.7", slug: "3-7", title: "Auto-évaluation globale" },
    ],
  },
  { number: 4, slug: "pilier-4", title: "Pilier 4", card: "", lessons: [] },
  { number: 5, slug: "pilier-5", title: "Pilier 5", card: "", lessons: [] },
  { number: 6, slug: "pilier-6", title: "Pilier 6", card: "", lessons: [] },
];

/** Même structure, titres anglais (voir batir-sur-le-roc.en.ts / pilier-{2,3}.en.ts). */
export const PILLAR_META_EN: PillarMeta[] = [
  {
    number: 1, slug: "vision-sacree", title: "The sacred vision of marriage", card: `${BASE}/images/pilier-1-carte.webp`,
    lessons: [
      { number: "1.1", slug: "1-1", title: "Between praise and reality" },
      { number: "1.2", slug: "1-2", title: "Marriage as a sanctuary" },
      { number: "1.3", slug: "1-3", title: "Marriage as the answer to a purpose" },
      { number: "1.4", slug: "1-4", title: "Theological and spiritual alignment" },
      { number: "1.5", slug: "1-5", title: "Self-denial and mutual service" },
      { number: "1.6", slug: "1-6", title: "The family altar and the presence of God" },
    ],
  },
  {
    number: 2, slug: "connaissance-de-soi", title: "Self-knowledge, temperaments & inner healing", card: `${BASE}/images/pilier-2-carte.webp`,
    lessons: [
      { number: "2.1", slug: "2-1", title: "Know yourself to love better" },
      { number: "2.2", slug: "2-2", title: "Identifying and healing your wounds" },
      { number: "2.3", slug: "2-3", title: "Breaking with toxic and family relationship patterns" },
      { number: "2.4", slug: "2-4", title: "Clarifying your expectations, non-negotiable values and emotional needs" },
      { number: "2.5", slug: "2-5", title: "Self-esteem, emotional autonomy and a fulfilled single life" },
      { number: "2.6", slug: "2-6", title: "Handling forgiveness and making peace with your story" },
      { number: "2.7", slug: "2-7", title: "Breaking spiritual ties: witchcraft, curses and generational covenants" },
    ],
  },
  {
    number: 3, slug: "bilan-de-maturite", title: "Maturity review & multidimensional preparation", card: `${BASE}/images/pilier-3-carte.webp`,
    lessons: [
      { number: "3.1", slug: "3-1", title: "Spiritual maturity: independent faith and spiritual leadership" },
      { number: "3.2", slug: "3-2", title: "Emotional maturity: self-control, managing stress and anger" },
      { number: "3.3", slug: "3-3", title: "Financial maturity: budget, managing debt, saving and the home's financial vision" },
      { number: "3.4", slug: "3-4", title: "Social and professional maturity: balancing career, ministry and family life" },
      { number: "3.5", slug: "3-5", title: "Physical preparation and lifestyle in the couple" },
      { number: "3.6", slug: "3-6", title: "The 5 love languages and managing emotional reservoirs" },
      { number: "3.7", slug: "3-7", title: "Overall self-assessment: am I ready to take on the responsibility of marriage?" },
    ],
  },
  { number: 4, slug: "pilier-4", title: "Pillar 4", card: "", lessons: [] },
  { number: 5, slug: "pilier-5", title: "Pillar 5", card: "", lessons: [] },
  { number: 6, slug: "pilier-6", title: "Pillar 6", card: "", lessons: [] },
];

export function pillarMetaOf(pillarNumber: number, lang: "fr" | "en" = "fr"): PillarMeta | undefined {
  return (lang === "en" ? PILLAR_META_EN : PILLAR_META).find((p) => p.number === pillarNumber);
}

/** Métadonnées légères (numéro affiché, titre) d'une leçon par son slug. */
export function lessonMetaOf(slug: string, lang: "fr" | "en" = "fr"): LessonMeta | undefined {
  const list = lang === "en" ? PILLAR_META_EN : PILLAR_META;
  for (const p of list) {
    const found = p.lessons.find((l) => l.slug === slug);
    if (found) return found;
  }
  return undefined;
}

export const ALL_PILLAR_NUMBERS = Object.keys(PILLAR_LESSON_SLUGS).map(Number).sort((a, b) => a - b);

/** Piliers rédigés (au moins une leçon) — 4 à 6 sont encore en préparation. */
const writtenPillars = () => ALL_PILLAR_NUMBERS.filter((n) => PILLAR_LESSON_SLUGS[n].length > 0);

export function pillarOfLesson(slug: string): number | null {
  for (const [pillar, slugs] of Object.entries(PILLAR_LESSON_SLUGS)) {
    if (slugs.includes(slug)) return Number(pillar);
  }
  return null;
}

export function isPillarCompleteLight(pillarNumber: number, completed: string[]): boolean {
  const slugs = PILLAR_LESSON_SLUGS[pillarNumber] ?? [];
  return slugs.length > 0 && slugs.every((s) => completed.includes(s));
}

/** Leçons à terminer avant d'accéder au matching : tout le pilier 1 (toujours gratuit). */
export const MATCHING_REQUIRED_LESSONS = PILLAR_LESSON_SLUGS[1];

export function isPillarOneCompleteLight(completed: string[]): boolean {
  return isPillarCompleteLight(1, completed);
}

export function isPillarUnlockedLight(pillarNumber: number, completed: string[]): boolean {
  return writtenPillars().filter((n) => n < pillarNumber).every((n) => isPillarCompleteLight(n, completed));
}

export type PillarStatus = "locked" | "todo" | "inProgress" | "done";

export function pillarStatusLight(pillarNumber: number, completed: string[]): PillarStatus {
  if (!isPillarUnlockedLight(pillarNumber, completed)) return "locked";
  if (isPillarCompleteLight(pillarNumber, completed)) return "done";
  const slugs = PILLAR_LESSON_SLUGS[pillarNumber] ?? [];
  return slugs.some((s) => completed.includes(s)) ? "inProgress" : "todo";
}

/** Numéros de tous les piliers rédigés à terminer pour ouvrir celui-ci. */
export function requiredPillarsLight(pillarNumber: number): number[] {
  return writtenPillars().filter((n) => n < pillarNumber);
}

/** Pilier rédigé encore à terminer avant celui-ci (null s'il est ouvert). Métadonnées légères seulement. */
export function blockingPillarMeta(pillarNumber: number, completed: string[], lang: "fr" | "en" = "fr"): PillarMeta | null {
  const n = writtenPillars().filter((x) => x < pillarNumber).find((x) => !isPillarCompleteLight(x, completed));
  return n === undefined ? null : pillarMetaOf(n, lang) ?? null;
}

/** Pilier rédigé suivant (null pour le dernier). Métadonnées légères seulement. */
export function nextPillarMeta(pillarNumber: number, lang: "fr" | "en" = "fr"): PillarMeta | null {
  const n = writtenPillars().filter((x) => x > pillarNumber)[0];
  return n === undefined ? null : pillarMetaOf(n, lang) ?? null;
}

/** Slug de la leçon à rouvrir avec « Continuer » (null si tout est lu). */
export function resumeLessonSlug(progress: { completed: string[]; lastLesson: string | null }): string | null {
  const allSlugs = writtenPillars().flatMap((n) => PILLAR_LESSON_SLUGS[n]);
  const lastPillar = progress.lastLesson ? pillarOfLesson(progress.lastLesson) : null;
  if (
    progress.lastLesson &&
    lastPillar !== null &&
    !progress.completed.includes(progress.lastLesson) &&
    isPillarUnlockedLight(lastPillar, progress.completed)
  ) {
    return progress.lastLesson;
  }
  return allSlugs.find((slug) => !progress.completed.includes(slug)) ?? null;
}
