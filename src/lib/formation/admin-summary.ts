// Résumé de la progression d'un membre dans « Bâtir sur le roc », pour l'admin.
// Calculé côté serveur à partir de profiles.formation_completed (slugs des leçons
// terminées) : le contenu des leçons n'est pas embarqué dans la page admin.
// Seules les leçons terminées sont enregistrées sur la fiche ; la lecture en cours,
// les quiz et les réflexions restent sur l'appareil du membre.
import { BATIR_SUR_LE_ROC, ALL_LESSONS, pillarStatus, resumeLesson, type PillarStatus } from "./batir-sur-le-roc";

export interface FormationSummaryLesson { slug: string; number: string; title: string; done: boolean }
export interface FormationSummaryPillar {
  number: number;
  title: string;
  done: number;
  total: number;
  status: PillarStatus;
  lessons: FormationSummaryLesson[];
}
export interface FormationSummary {
  done: number;
  total: number;
  percent: number;
  pillars: FormationSummaryPillar[];
  /** Prochaine leçon à lire (null si tout est terminé). */
  current: { number: string; title: string; pillar: number } | null;
  /** Slugs enregistrés qui ne correspondent à aucune leçon (ignorés). */
  orphans: string[];
}

export function summarizeFormation(raw: unknown): FormationSummary {
  const completed = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
  const known = new Set(ALL_LESSONS.map(({ lesson }) => lesson.slug));
  const doneSet = new Set(completed.filter((s) => known.has(s)));

  const pillars = BATIR_SUR_LE_ROC.pillars
    .filter((p) => p.lessons.length > 0)
    .map((p) => {
      const lessons = p.lessons.map((l) => ({ slug: l.slug, number: l.number, title: l.title, done: doneSet.has(l.slug) }));
      return {
        number: p.number,
        title: p.title,
        done: lessons.filter((l) => l.done).length,
        total: lessons.length,
        status: pillarStatus(p, [...doneSet]),
        lessons,
      };
    });

  const total = ALL_LESSONS.length;
  const next = resumeLesson({ completed: [...doneSet], lastLesson: null });
  const nextPillar = next ? ALL_LESSONS.find(({ lesson }) => lesson.slug === next.slug)?.pillar.number : undefined;
  return {
    done: doneSet.size,
    total,
    percent: total ? Math.round((doneSet.size / total) * 100) : 0,
    pillars,
    current: next && nextPillar ? { number: next.number, title: next.title, pillar: nextPillar } : null,
    orphans: completed.filter((s) => !known.has(s)),
  };
}
