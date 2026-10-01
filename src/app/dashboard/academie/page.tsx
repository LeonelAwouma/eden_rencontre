"use client";

import {
  Heart, MessageSquare, Wallet, Users, Flame, Briefcase, Church, Baby, Clock, Star, ScrollText,
  ArrowLeft, ArrowRight, Mountain, Sprout, HeartHandshake, CheckCircle2, BookOpen, MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Monogram, Flourish } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { FORMATION_BASE_PATH, ALL_LESSONS, resumeLesson } from "@/lib/formation/batir-sur-le-roc";
import { useFormationLocale } from "@/lib/formation/ui";
import { useFormationProgress, hasStarted } from "@/lib/formation/progress";
import { STORIES_BASE_PATH } from "@/lib/formation/paths";
import { storyReadingMinutes } from "@/lib/formation/stories";
import { RichText, frenchSpacing } from "@/components/formation/rich-text";

export default function AcademyIndexPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { progress, ready } = useFormationProgress();
  // Formation et textes dans la langue de l'interface (français ou anglais).
  const { formation, ui, localize, stories } = useFormationLocale();

  const doneCount = ALL_LESSONS.filter(({ lesson }) => progress.completed.includes(lesson.slug)).length;
  // Leçon en cours de lecture en priorité, sinon la première non terminée.
  const nextLesson = localize(resumeLesson(progress));
  const started = hasStarted(progress);
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
              Garden of Alliance <span className="text-primary italic font-normal">{ui.backToAcademy}</span>
            </span>
          </Link>
          <button onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13px] font-semibold text-[#3F4A43] hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t("academie.backToDashboard")}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-16">
        {/* ───── Académie du mariage ───── */}
        <section className="max-w-3xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary">{ui.academyEyebrow}</p>
          <h1 className="mt-3 font-headline text-[42px] sm:text-[56px] font-bold leading-[1.02] tracking-tight text-foreground">
            {ui.academyTitle} <span className="italic text-primary">{ui.academyTitleHighlight}</span>
          </h1>
          <p className="mt-4 text-[17px] sm:text-[18px] leading-relaxed text-[#3F4A43]">
            {ui.academyIntro}
          </p>
        </section>

        {/* ───── Premier parcours : Bâtir sur le roc ───── */}
        <section aria-labelledby="batir-sur-le-roc">
          <Link href={FORMATION_BASE_PATH}
            className="group grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] rounded-3xl border border-border bg-card overflow-hidden shadow-[0_10px_40px_rgba(38,70,52,0.08)] hover:shadow-[0_16px_48px_rgba(38,70,52,0.14)] hover:border-primary/40 transition-all">
            <span className="relative block aspect-[4/5] md:aspect-auto md:min-h-[460px] bg-muted overflow-hidden">
              <Image src="/batir_roc.png" alt={ui.coverAlt}
                fill priority sizes="(min-width: 768px) 42vw, 100vw"
                className="object-cover object-[center_45%] group-hover:scale-[1.03] transition-transform duration-700" />
              <span className="absolute top-4 left-4 h-8 px-3 rounded-full bg-white/95 text-[12px] font-bold text-foreground flex items-center shadow-sm">
                {ui.pillarBadge(1)}
              </span>
            </span>
            <span className="flex flex-col p-6 sm:p-8 lg:p-10">
              <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">{ui.lessonsAvailable(available)}</span>
              <span id="batir-sur-le-roc" className="mt-2 font-headline text-[36px] sm:text-[44px] font-bold leading-[1.05] text-foreground group-hover:text-primary transition-colors">
                {formation.title}
              </span>
              <span className="mt-3 text-[16px] leading-relaxed text-[#3F4A43]">{formation.tagline}</span>
              <span className="mt-5 pl-4 border-l-2 border-primary/40 block">
                <span className="block font-headline italic text-[17px] leading-snug text-foreground">{ui.quote(formation.verse.text)}</span>
                <span className="mt-1 block text-[13px] font-semibold text-primary">{formation.verse.ref}</span>
              </span>

              <span className="mt-auto pt-8 block">
                <span className="flex justify-between text-[13px] text-[#56615A] mb-1.5">
                  <span>{ready ? ui.lessonsDone(doneCount, available) : ui.progressLabel}</span>
                  {ready && <span>{Math.round((doneCount / available) * 100)} %</span>}
                </span>
                <span className="block h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={available} aria-valuenow={doneCount} aria-label={`${ui.progressLabel} · ${formation.title}`}>
                  <span className="block h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / available) * 100}%` }} />
                </span>
                {ready && started && nextLesson && (
                  <span className="mt-3 block text-[13px] text-[#56615A]">{ui.inProgress(nextLesson.number, nextLesson.title)}</span>
                )}
                {ready && !nextLesson && (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"><CheckCircle2 className="w-4 h-4" /> {ui.allDone}</span>
                )}
                <span className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-white text-[15px] font-bold group-hover:bg-primary/90 transition-colors">
                  <BookOpen className="w-4 h-4" />
                  {/* Masqué le temps de lire la progression : jamais « Continuer » affiché à tort. */}
                  <span className={ready ? "" : "invisible"}>{started ? ui.continue : ui.start}</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </span>
            </span>
          </Link>
        </section>

        {/* ───── Histoires ───── */}
        <section aria-labelledby="histoires" className="space-y-5">
          <div>
            <h2 id="histoires" className="font-headline text-[26px] font-bold text-foreground">{ui.storiesTitle}</h2>
            <p className="mt-1 text-[15px] text-[#56615A]">{ui.storiesDesc}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {stories.map((st) => (
              <Link key={st.slug} href={`${STORIES_BASE_PATH}/${st.slug}`}
                className="group flex flex-col rounded-3xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-[0_10px_32px_rgba(38,70,52,0.10)] transition-all">
                <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-primary">
                  <BookOpen className="w-4 h-4" /> {ui.storyEyebrow} · {ui.readingTime(storyReadingMinutes(st))}
                </span>
                <span className="mt-2 font-headline text-[24px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                  {frenchSpacing(st.title)}
                </span>
                <span className="mt-2 text-[14.5px] leading-relaxed text-[#3F4A43] line-clamp-3">
                  <RichText text={st.summary} />
                </span>
                <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-primary">
                  {ui.readStory} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ───── Forum ───── */}
        <Link href="/dashboard/forum"
          className="group flex items-center gap-4 rounded-3xl border border-border bg-card px-6 py-5 hover:border-primary/40 hover:shadow-[0_10px_32px_rgba(38,70,52,0.10)] transition-all">
          <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><MessagesSquare className="w-6 h-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-headline text-[22px] font-bold text-foreground group-hover:text-primary transition-colors">{ui.forumTitle}</span>
            <span className="block text-[14.5px] text-[#56615A]">{ui.forumAcademyDesc}</span>
          </span>
          <ArrowRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* ───── Pour aller plus loin (ancienne Académie) ───── */}
        <section aria-labelledby="complements" className="space-y-5">
          <div>
            <h2 id="complements" className="font-headline text-[26px] font-bold text-foreground">{ui.furtherTitle}</h2>
            <p className="mt-1 text-[15px] text-[#56615A]">{ui.furtherDesc}</p>
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
