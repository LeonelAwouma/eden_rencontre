/**
 * Localisation des TITRES de « Bâtir sur le roc » pour l'espace Coach — module SERVEUR (il charge le contenu
 * anglais, volumineux : ne jamais l'importer depuis un composant client).
 *
 * La progression et la structure viennent toujours de `summarizeFormation` (contenu français) : identifiants
 * (slugs), numéros, ordre et statuts restent donc identiques dans les deux langues. Seuls les titres sont
 * remplacés par ceux de `BATIR_SUR_LE_ROC_EN` (même structure : 6 piliers, mêmes slugs et numéros). Une entrée
 * absente de la version anglaise garde son titre français : jamais de titre vide.
 */
import { BATIR_SUR_LE_ROC_EN } from "@/lib/formation/batir-sur-le-roc.en";
import type {
  CoachFormationSummary, FormationOverviewPillar, FormationOverviewRow,
} from "@/lib/coach/members-view";

export type CoachLang = "fr" | "en";

export type LangParam = { ok: true; lang: CoachLang } | { ok: false };

/** Paramètre `lang` de l'API : absent → français ; « fr » ou « en » ; toute autre valeur → refus (400). */
export function parseCoachLang(raw: string | null): LangParam {
  if (raw === null || raw === "") return { ok: true, lang: "fr" };
  return raw === "fr" || raw === "en" ? { ok: true, lang: raw } : { ok: false };
}

const EN_PILLAR_TITLES = new Map<number, string>(BATIR_SUR_LE_ROC_EN.pillars.map((p) => [p.number, p.title]));
const EN_LESSON_TITLES = new Map<string, string>(BATIR_SUR_LE_ROC_EN.pillars.flatMap((p) => p.lessons.map((l) => [l.slug, l.title] as const)));
const EN_LESSON_TITLES_BY_NUMBER = new Map<string, string>(BATIR_SUR_LE_ROC_EN.pillars.flatMap((p) => p.lessons.map((l) => [l.number, l.title] as const)));

const pillarTitle = (number: number, fallback: string, lang: CoachLang) => (lang === "en" ? EN_PILLAR_TITLES.get(number) ?? fallback : fallback);
const lessonTitle = (slug: string, fallback: string, lang: CoachLang) => (lang === "en" ? EN_LESSON_TITLES.get(slug) ?? fallback : fallback);
const lessonTitleByNumber = (number: string, fallback: string, lang: CoachLang) => (lang === "en" ? EN_LESSON_TITLES_BY_NUMBER.get(number) ?? fallback : fallback);

/** Titres de pilier, de leçon et de prochaine leçon dans la langue demandée ; tout le reste est inchangé. */
export function localizeCoachFormation(summary: CoachFormationSummary, lang: CoachLang): CoachFormationSummary {
  return {
    ...summary,
    pillars: summary.pillars.map((p) => ({
      ...p,
      title: pillarTitle(p.number, p.title, lang),
      lessons: p.lessons.map((l) => ({ ...l, title: lessonTitle(l.slug, l.title, lang) })),
    })),
    current: summary.current
      ? { ...summary.current, title: lessonTitleByNumber(summary.current.number, summary.current.title, lang) }
      : null,
  };
}

/** Page Formation : titres de pilier et de prochaine leçon dans la langue demandée. */
export function localizeFormationOverview(
  overview: { pillars: FormationOverviewPillar[]; rows: FormationOverviewRow[] },
  lang: CoachLang
): { pillars: FormationOverviewPillar[]; rows: FormationOverviewRow[] } {
  return {
    pillars: overview.pillars.map((p) => ({ ...p, title: pillarTitle(p.number, p.title, lang) })),
    rows: overview.rows.map((r) => ({
      ...r,
      nextLesson: r.nextLesson ? { ...r.nextLesson, title: lessonTitleByNumber(r.nextLesson.number, r.nextLesson.title, lang) } : null,
    })),
  };
}
