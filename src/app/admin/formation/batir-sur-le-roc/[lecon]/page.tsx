import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonReader } from "@/components/formation/lesson-reader";
import { findLesson } from "@/lib/formation/batir-sur-le-roc";

// Aperçu admin d'une leçon : même lecteur que les membres (/dashboard/academie/…),
// affiché en plein écran par le layout admin, sans rien enregistrer.

export async function generateMetadata({ params }: { params: Promise<{ lecon: string }> }): Promise<Metadata> {
  const found = findLesson((await params).lecon);
  return {
    title: found ? `Aperçu · Leçon ${found.lesson.number} — ${found.lesson.title}` : "Aperçu de leçon",
    robots: { index: false, follow: false },
  };
}

export default async function AdminLessonPreviewPage({ params }: { params: Promise<{ lecon: string }> }) {
  const found = findLesson((await params).lecon);
  if (!found) notFound();
  return <LessonReader lesson={found.lesson} pillar={found.pillar} previous={found.previous} next={found.next} preview />;
}
