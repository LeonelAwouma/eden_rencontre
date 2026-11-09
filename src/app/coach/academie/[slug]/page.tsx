"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataState, PageTitle } from "@/components/coach/coach-ui";
import { useCoachChrome } from "@/components/coach/coach-chrome";
import { useCoachData } from "@/components/coach/use-coach-data";
import { ProtectedLesson } from "@/components/coach/protected-lesson";
import { useI18n } from "@/lib/i18n";
import type { CoachLesson } from "@/lib/coach/academie";

interface LessonLink { slug: string; number: string; title: string }
interface Payload { lesson: CoachLesson; pillar: { number: number; title: string }; previous: LessonLink | null; next: LessonLink | null }

/** Fiche d'une leçon de l'Académie : texte et audio associé, lecture seule. */
export default function CoachAcademieLessonPage() {
  const { t, locale } = useI18n();
  const { coach } = useCoachChrome();
  const { slug } = useParams<{ slug: string }>();
  const lang = locale === "en" ? "en" : "fr";
  const { state, reload } = useCoachData<Payload>(`/api/coach/academie/lesson/${encodeURIComponent(slug)}?lang=${lang}`);

  const back = (
    <Link href="/coach/academie" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3F704D]">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("coachAcademie.back")}
    </Link>
  );

  return (
    <>
      {back}
      <DataState state={state} reload={reload} notFound={<p className="rounded-2xl border border-dashed p-8 text-center text-sm text-[#56615A]">{t("coachAcademie.notFound")}</p>}>
        {(d) => (
          <div className="max-w-3xl">
            <PageTitle title={`${d.lesson.number} — ${d.lesson.title}`} subtitle={`${t("coachAcademie.pillar", { n: d.pillar.number })} · ${d.pillar.title}`} />
            <ProtectedLesson lesson={d.lesson} coachName={coach.name} coachId={coach.id} />
            <nav className="mt-10 flex justify-between gap-3 text-sm font-semibold text-[#3F704D]">
              {d.previous ? <Link href={`/coach/academie/${d.previous.slug}`}>← {t("coachAcademie.previous")} ({d.previous.number})</Link> : <span />}
              {d.next ? <Link href={`/coach/academie/${d.next.slug}`}>{t("coachAcademie.next")} ({d.next.number}) →</Link> : <span />}
            </nav>
          </div>
        )}
      </DataState>
    </>
  );
}
