"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import { BATIR_SUR_LE_ROC, FORMATION_BASE_PATH, ALL_LESSONS, resumeLesson } from "@/lib/formation/batir-sur-le-roc";
import { useFormationProgress } from "@/lib/formation/progress";

/**
 * « Bâtir sur le roc » : liste des leçons (Académie → Bâtir sur le roc → leçon).
 * La progression (leçons terminées, position de lecture, quiz, réflexions) est
 * enregistrée au fil de la lecture par le lecteur de leçon.
 */
export default function BatirSurLeRocLessonsPage() {
  const { progress, ready } = useFormationProgress();
  const formation = BATIR_SUR_LE_ROC;

  const doneCount = ALL_LESSONS.filter(({ lesson }) => progress.completed.includes(lesson.slug)).length;
  const nextLesson = resumeLesson(progress);
  const started = doneCount > 0 || progress.lastLesson !== null;
  const available = ALL_LESSONS.length;
  const pct = available ? Math.round((doneCount / available) * 100) : 0;

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/dashboard/academie" className="flex items-center gap-2 min-w-0 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <Monogram className="w-7 h-6 text-primary shrink-0 hidden sm:block" />
            <span className="truncate">Académie du mariage</span>
          </Link>
          {ready && (
            <span className="shrink-0 text-[13px] font-semibold text-[#56615A]">{doneCount} / {available} leçons</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* ───── En-tête de la formation + reprise ───── */}
        <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12 items-start">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary">Académie du mariage · Formation</p>
            <h1 className="mt-3 font-headline text-[40px] sm:text-[52px] font-bold leading-[1.02] tracking-tight text-foreground">{formation.title}</h1>
            <p className="mt-4 text-[17px] leading-relaxed text-[#3F4A43] max-w-xl">{formation.tagline}</p>
            <figure className="mt-6 pl-5 border-l-2 border-primary/40 max-w-xl">
              <blockquote className="font-headline italic text-[18px] leading-snug text-foreground">« {formation.verse.text} »</blockquote>
              <figcaption className="mt-1.5 text-[13px] font-semibold text-primary">{formation.verse.ref}</figcaption>
            </figure>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_10px_40px_rgba(38,70,52,0.08)]">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#56615A]">
              {!ready ? "Ta progression" : started ? (nextLesson ? "Reprendre" : "Pilier 1 terminé") : "Commencer"}
            </p>
            <p className="mt-1.5 font-headline text-[21px] font-bold leading-tight text-foreground">
              {nextLesson ? <>Leçon {nextLesson.number} — {nextLesson.title}</> : "Bravo, toutes les leçons sont terminées."}
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-[12.5px] text-[#56615A] mb-1.5">
                <span>{doneCount} / {available} leçons terminées</span>
                <span>{pct} %</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={available} aria-valuenow={doneCount} aria-label="Progression dans la formation">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {nextLesson && (
              <Link href={`${FORMATION_BASE_PATH}/${nextLesson.slug}`}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-white text-[15px] font-bold hover:bg-primary/90 transition-colors">
                <Play className="w-4 h-4 fill-current" /> {started ? "Continuer" : "Commencer la première leçon"}
              </Link>
            )}
            <p className="mt-3 text-[12px] text-[#6B746E] text-center">Ta progression est enregistrée automatiquement.</p>
          </div>
        </section>

        {/* ───── Leçons, par pilier ───── */}
        {formation.pillars.filter((p) => p.lessons.length > 0).map((pillar) => {
          const done = pillar.lessons.filter((l) => progress.completed.includes(l.slug)).length;
          return (
            <section key={pillar.slug} aria-labelledby={`pilier-${pillar.number}`} className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary">Pilier {pillar.number}</p>
                  <h2 id={`pilier-${pillar.number}`} className="mt-1 font-headline text-[28px] sm:text-[32px] font-bold text-foreground leading-tight">{pillar.title}</h2>
                  {pillar.summary && <p className="mt-2 text-[15px] leading-relaxed text-[#3F4A43]">{pillar.summary}</p>}
                </div>
                <span className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-semibold",
                  done === pillar.lessons.length ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                  {done === pillar.lessons.length && <CheckCircle2 className="w-4 h-4" />}
                  {done} / {pillar.lessons.length} leçons
                </span>
              </div>

              <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pillar.lessons.map((l) => {
                  const isDone = progress.completed.includes(l.slug);
                  const isNext = nextLesson?.slug === l.slug;
                  const position = progress.positions[l.slug] ?? 0;
                  const inProgress = !isDone && position > 0.05;
                  return (
                    <li key={l.slug}>
                      <Link href={`${FORMATION_BASE_PATH}/${l.slug}`}
                        className={cn("group flex flex-col h-full rounded-2xl border overflow-hidden bg-card transition-all hover:shadow-[0_8px_28px_rgba(38,70,52,0.10)]",
                          isNext ? "border-primary/50 ring-1 ring-primary/20" : "border-border hover:border-primary/35")}>
                        <span className="relative block aspect-[16/10] bg-muted">
                          <Image src={l.image.card} alt={l.image.alt} fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                          <span className="absolute top-3 left-3 h-7 px-2.5 rounded-full bg-white/95 text-[12px] font-bold text-foreground flex items-center shadow-sm">
                            {l.number}
                          </span>
                          {isDone && (
                            <span className="absolute top-3 right-3 h-7 px-2.5 rounded-full bg-primary text-white text-[12px] font-bold flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Terminée
                            </span>
                          )}
                          {inProgress && (
                            <span className="absolute inset-x-0 bottom-0 h-1 bg-black/15" aria-hidden>
                              <span className="block h-full bg-primary" style={{ width: `${Math.round(position * 100)}%` }} />
                            </span>
                          )}
                        </span>
                        <span className="flex flex-col flex-1 p-4">
                          <span className="font-headline text-[19px] font-bold leading-snug text-foreground group-hover:text-primary transition-colors">{l.title}</span>
                          <span className="mt-auto pt-3 flex items-center justify-between text-[12.5px] text-[#56615A]">
                            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {l.readingMinutes} min · {l.quiz.length} questions</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              {isDone ? "Relire" : inProgress ? `Reprendre · ${Math.round(position * 100)} %` : "Lire"} <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        {/* ───── Piliers à venir ───── */}
        <section aria-labelledby="a-venir" className="space-y-4">
          <h2 id="a-venir" className="font-headline text-[22px] font-bold text-foreground">Prochains piliers</h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {formation.pillars.filter((p) => p.lessons.length === 0).map((p) => (
              <li key={p.slug} className="rounded-2xl border border-dashed border-[#CFC9BE] px-4 py-4">
                <p className="flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.16em] text-[#56615A]">
                  Pilier {p.number} <Lock className="w-3.5 h-3.5" />
                </p>
                <p className="mt-1.5 text-[14px] text-[#3F4A43]">En préparation</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
