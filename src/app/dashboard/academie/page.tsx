"use client";

import {
  Heart, MessageSquare, Wallet, Users, Flame, Briefcase, Church, Baby, Clock, Star, ScrollText,
  ArrowLeft, ArrowRight, Mountain, Sprout, HeartHandshake, CheckCircle2, Lock, Play,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Monogram, Flourish } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { BATIR_SUR_LE_ROC, FORMATION_BASE_PATH, ALL_LESSONS } from "@/lib/formation/batir-sur-le-roc";
import { useFormationProgress } from "@/lib/formation/progress";

export default function AcademyIndexPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { progress, ready } = useFormationProgress();
  const formation = BATIR_SUR_LE_ROC;

  const doneCount = ALL_LESSONS.filter(({ lesson }) => progress.completed.includes(lesson.slug)).length;
  const nextLesson = ALL_LESSONS.find(({ lesson }) => !progress.completed.includes(lesson.slug))?.lesson ?? null;
  const started = doneCount > 0;
  const available = ALL_LESSONS.length;

  // Ressources complémentaires, conservées de l'ancienne Académie.
  const discernementLessons = [
    { title: t("academie.lessons.criteresEssentiels.title"), icon: Star, href: "/dashboard/academie/criteres-essentiels", duration: t("academie.lessons.criteresEssentiels.duration") },
    { title: t("academie.lessons.periodeConnaissance.title"), icon: Clock, href: "/dashboard/academie/periode-connaissance", duration: t("academie.lessons.periodeConnaissance.duration") },
    { title: t("academie.lessons.prieDiscernement.title"), icon: ScrollText, href: "/dashboard/academie/prie-discernement", duration: t("academie.lessons.prieDiscernement.duration") },
  ];
  const academyThemes = [
    { slug: "vision-biblique", icon: Church }, { slug: "communication", icon: MessageSquare },
    { slug: "finances", icon: Wallet }, { slug: "belle-famille", icon: Users }, { slug: "intimite", icon: Flame },
    { slug: "roles", icon: Briefcase }, { slug: "vie-spirituelle", icon: Heart }, { slug: "enfants", icon: Baby },
    { slug: "temps-loisirs", icon: Clock }, { slug: "cinq-piliers", icon: Mountain },
    { slug: "celibat-foi", icon: Sprout }, { slug: "conflits-bibliques", icon: HeartHandshake },
  ].map((m) => ({ ...m, title: t(`academie.themes.${m.slug}.title`) }));

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <Monogram className="w-8 h-7 text-primary" />
            <span className="font-headline text-lg sm:text-xl font-bold text-foreground">
              Garden of Alliance <span className="text-primary italic font-normal">Académie</span>
            </span>
          </Link>
          <button onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13px] font-semibold text-[#3F4A43] hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t("academie.backToDashboard")}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-16">
        {/* ───── Présentation de la formation ───── */}
        <section className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12 items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary">Formation · Préparation au mariage</p>
            <h1 className="mt-3 font-headline text-[42px] sm:text-[56px] font-bold leading-[1.02] tracking-tight text-foreground">
              {formation.title}
            </h1>
            <p className="mt-4 text-[17px] sm:text-[18px] leading-relaxed text-[#3F4A43] max-w-xl">{formation.tagline}</p>
            <figure className="mt-6 pl-5 border-l-2 border-primary/40 max-w-xl">
              <blockquote className="font-headline italic text-[18px] leading-snug text-foreground">« {formation.verse.text} »</blockquote>
              <figcaption className="mt-1.5 text-[13px] font-semibold text-primary">{formation.verse.ref}</figcaption>
            </figure>
          </div>

          {/* Carte de progression — image d'identité de la formation, stable
              même une fois toutes les leçons terminées (contrairement à la
              vignette de la prochaine leçon, qui disparaissait alors). */}
          <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-[0_10px_40px_rgba(38,70,52,0.08)]">
            <div className="relative aspect-[16/10] bg-muted">
              <Image src={formation.coverImage.card} alt={formation.coverImage.alt} fill sizes="380px"
                className="object-cover" style={{ objectPosition: formation.coverImage.position || "center" }} priority />
            </div>
            <div className="p-6">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#56615A]">
                {!ready ? "Ta progression" : started ? (nextLesson ? "Reprendre" : "Pilier 1 terminé") : "Commencer"}
              </p>
              {nextLesson ? (
                <p className="mt-1.5 font-headline text-[22px] font-bold leading-tight text-foreground">
                  Leçon {nextLesson.number} — {nextLesson.title}
                </p>
              ) : (
                <p className="mt-1.5 font-headline text-[22px] font-bold leading-tight text-foreground">Bravo, les six leçons sont terminées.</p>
              )}
              <div className="mt-4">
                <div className="flex justify-between text-[12.5px] text-[#56615A] mb-1.5">
                  <span>{doneCount} / {available} leçons</span>
                  <span>{Math.round((doneCount / available) * 100)} %</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={available} aria-valuenow={doneCount} aria-label="Progression dans le pilier 1">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / available) * 100}%` }} />
                </div>
              </div>
              {nextLesson && (
                <Link href={`${FORMATION_BASE_PATH}/${nextLesson.slug}`}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-white text-[15px] font-bold hover:bg-primary/90 transition-colors">
                  <Play className="w-4 h-4 fill-current" /> {started ? "Continuer" : "Commencer la formation"}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ───── Les six piliers ───── */}
        <section aria-labelledby="piliers" className="space-y-6">
          <div>
            <h2 id="piliers" className="font-headline text-[30px] sm:text-[34px] font-bold text-foreground">Les six piliers</h2>
            <p className="mt-1 text-[15px] text-[#56615A]">Un chemin progressif : chaque pilier pose une pierre de fondation avant la suivante.</p>
          </div>

          {formation.pillars.filter((p) => p.lessons.length > 0).map((pillar) => {
            const done = pillar.lessons.filter((l) => progress.completed.includes(l.slug)).length;
            return (
              <div key={pillar.slug} className="rounded-3xl border border-border bg-card p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary">Pilier {pillar.number}</p>
                    <h3 className="mt-1 font-headline text-[26px] font-bold text-foreground leading-tight">{pillar.title}</h3>
                    {pillar.summary && <p className="mt-2 text-[15px] leading-relaxed text-[#3F4A43]">{pillar.summary}</p>}
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-semibold",
                    done === pillar.lessons.length ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                    {done === pillar.lessons.length && <CheckCircle2 className="w-4 h-4" />}
                    {done} / {pillar.lessons.length} leçons
                  </span>
                </div>

                <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pillar.lessons.map((l) => {
                    const isDone = progress.completed.includes(l.slug);
                    const isNext = nextLesson?.slug === l.slug;
                    return (
                      <li key={l.slug}>
                        <Link href={`${FORMATION_BASE_PATH}/${l.slug}`}
                          className={cn("group flex flex-col h-full rounded-2xl border overflow-hidden bg-background transition-all hover:shadow-[0_8px_28px_rgba(38,70,52,0.10)]",
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
                          </span>
                          <span className="flex flex-col flex-1 p-4">
                            <span className="font-headline text-[19px] font-bold leading-snug text-foreground group-hover:text-primary transition-colors">{l.title}</span>
                            <span className="mt-auto pt-3 flex items-center justify-between text-[12.5px] text-[#56615A]">
                              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {l.readingMinutes} min · {l.quiz.length} questions</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                {isNext ? (started ? "Reprendre" : "Commencer") : isDone ? "Relire" : "Lire"} <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}

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

        {/* ───── Pour aller plus loin (ancienne Académie) ───── */}
        <section aria-labelledby="complements" className="space-y-5">
          <div>
            <h2 id="complements" className="font-headline text-[26px] font-bold text-foreground">Pour aller plus loin</h2>
            <p className="mt-1 text-[15px] text-[#56615A]">Des lectures courtes sur le discernement et la vie de couple.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {discernementLessons.map((l) => (
              <Link key={l.href} href={l.href}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:border-primary/40 transition-colors">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><l.icon className="w-5 h-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground leading-snug group-hover:text-primary">{l.title}</span>
                  <span className="block text-[12.5px] text-[#56615A]">{l.duration}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {academyThemes.map((m) => (
              <Link key={m.slug} href={`/dashboard/academie/module/${m.slug}`}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-card text-[13.5px] font-medium text-[#2E3A33] hover:border-primary/40 hover:text-primary transition-colors">
                <m.icon className="w-4 h-4 text-primary" /> {m.title}
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-col items-center text-center">
          <Flourish className="w-40 h-3 text-primary/40 mb-3" />
          <p className="text-[#56615A] text-[13px] font-headline italic">{t("academie.footerVerse")}</p>
        </div>
      </main>
    </div>
  );
}
