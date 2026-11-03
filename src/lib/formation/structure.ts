// Métadonnées LÉGÈRES de « Bâtir sur le roc » — uniquement ce qu'il faut
// pour savoir à quel pilier appartient une leçon (src/lib/formation/media.ts,
// /api/formation/lesson/[slug]), sans importer le contenu complet
// (src/lib/formation/batir-sur-le-roc.ts, réservé au serveur — voir son
// en-tête). Ne duplique pas la logique de déblocage progressif des piliers,
// qui reste dans batir-sur-le-roc.ts/lesson-reader.tsx (non modifiés par
// cette mission — voir le bilan de livraison pour cette limitation connue).

const PILLAR_LESSON_SLUGS: Record<number, string[]> = {
  1: ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6"],
  2: ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"],
  3: ["3-1", "3-2", "3-3", "3-4", "3-5", "3-6", "3-7"],
};

export function pillarOfLesson(slug: string): number | null {
  for (const [pillar, slugs] of Object.entries(PILLAR_LESSON_SLUGS)) {
    if (slugs.includes(slug)) return Number(pillar);
  }
  return null;
}
