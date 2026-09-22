import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonReader } from "@/components/formation/lesson-reader";
import { ALL_LESSONS, BATIR_SUR_LE_ROC, findLesson } from "@/lib/formation/batir-sur-le-roc";

export function generateStaticParams() {
  return ALL_LESSONS.map(({ lesson }) => ({ lecon: lesson.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ lecon: string }> }): Promise<Metadata> {
  const found = findLesson((await params).lecon);
  if (!found) return {};
  return {
    title: `Leçon ${found.lesson.number} — ${found.lesson.title} · ${BATIR_SUR_LE_ROC.title}`,
    description: found.lesson.objective,
  };
}

export default async function LessonPage({ params }: { params: Promise<{ lecon: string }> }) {
  const found = findLesson((await params).lecon);
  if (!found) notFound();
  return <LessonReader lesson={found.lesson} pillar={found.pillar} previous={found.previous} next={found.next} />;
}
