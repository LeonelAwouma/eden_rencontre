import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPageClient } from "@/components/formation/lesson-page-client";
import { PILLAR_LESSON_SLUGS, pillarOfLesson, lessonMetaOf, pillarMetaOf } from "@/lib/formation/structure";

// Coquille : les métadonnées de base viennent des métadonnées légères
// (src/lib/formation/structure.ts) — le contenu réel de la leçon (texte,
// images/audio/pdf) est résolu côté serveur, après vérification de session et
// d'abonnement effectif, par /api/formation/lesson/[slug] — jamais importé ni
// pré-rendu statiquement ici. Voir src/lib/formation/batir-sur-le-roc.ts (son
// en-tête) pour la raison de cette séparation.

export function generateStaticParams() {
  return Object.values(PILLAR_LESSON_SLUGS).flat().map((lecon) => ({ lecon }));
}

export async function generateMetadata({ params }: { params: Promise<{ lecon: string }> }): Promise<Metadata> {
  const { lecon } = await params;
  const pillarNumber = pillarOfLesson(lecon);
  if (pillarNumber === null) return {};
  const lessonMeta = lessonMetaOf(lecon);
  const pillarMeta = pillarMetaOf(pillarNumber);
  if (!lessonMeta || !pillarMeta) return {};
  return { title: `Leçon ${lessonMeta.number} — ${lessonMeta.title} · Bâtir sur le roc` };
}

export default async function LessonPage({ params }: { params: Promise<{ lecon: string }> }) {
  const { lecon } = await params;
  if (pillarOfLesson(lecon) === null) notFound();
  return <LessonPageClient slug={lecon} />;
}
