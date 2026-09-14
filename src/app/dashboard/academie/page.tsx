"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageSquare,
  Wallet,
  Users,
  Flame,
  Briefcase,
  Church,
  Baby,
  Clock,
  Star,
  ScrollText,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Mountain,
  Sprout,
  HeartHandshake,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Monogram, Flourish, VitrailPattern } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";

export default function AcademyIndexPage() {
  const router = useRouter();
  const { t } = useI18n();

  const discernementLessons = [
    {
      title: t("academie.lessons.criteresEssentiels.title"),
      desc: t("academie.lessons.criteresEssentiels.desc"),
      icon: Star,
      href: "/dashboard/academie/criteres-essentiels",
      duration: t("academie.lessons.criteresEssentiels.duration"),
    },
    {
      title: t("academie.lessons.periodeConnaissance.title"),
      desc: t("academie.lessons.periodeConnaissance.desc"),
      icon: Clock,
      href: "/dashboard/academie/periode-connaissance",
      duration: t("academie.lessons.periodeConnaissance.duration"),
    },
    {
      title: t("academie.lessons.prieDiscernement.title"),
      desc: t("academie.lessons.prieDiscernement.desc"),
      icon: ScrollText,
      href: "/dashboard/academie/prie-discernement",
      duration: t("academie.lessons.prieDiscernement.duration"),
    },
  ];

  const academyThemes = [
    { slug: "vision-biblique", title: t("academie.themes.vision-biblique.title"), description: t("academie.themes.vision-biblique.description"), icon: Church },
    { slug: "communication", title: t("academie.themes.communication.title"), description: t("academie.themes.communication.description"), icon: MessageSquare },
    { slug: "finances", title: t("academie.themes.finances.title"), description: t("academie.themes.finances.description"), icon: Wallet },
    { slug: "belle-famille", title: t("academie.themes.belle-famille.title"), description: t("academie.themes.belle-famille.description"), icon: Users },
    { slug: "intimite", title: t("academie.themes.intimite.title"), description: t("academie.themes.intimite.description"), icon: Flame },
    { slug: "roles", title: t("academie.themes.roles.title"), description: t("academie.themes.roles.description"), icon: Briefcase },
    { slug: "vie-spirituelle", title: t("academie.themes.vie-spirituelle.title"), description: t("academie.themes.vie-spirituelle.description"), icon: Heart },
    { slug: "enfants", title: t("academie.themes.enfants.title"), description: t("academie.themes.enfants.description"), icon: Baby },
    { slug: "temps-loisirs", title: t("academie.themes.temps-loisirs.title"), description: t("academie.themes.temps-loisirs.description"), icon: Clock },
    { slug: "cinq-piliers", title: t("academie.themes.cinq-piliers.title"), description: t("academie.themes.cinq-piliers.description"), icon: Mountain },
    { slug: "celibat-foi", title: t("academie.themes.celibat-foi.title"), description: t("academie.themes.celibat-foi.description"), icon: Sprout },
    { slug: "conflits-bibliques", title: t("academie.themes.conflits-bibliques.title"), description: t("academie.themes.conflits-bibliques.description"), icon: HeartHandshake },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-secondary/15 px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <Monogram className="w-9 h-8 text-primary group-hover:text-secondary transition-colors" />
          <span className="font-headline text-xl font-bold text-foreground">Garden of Alliance <span className="text-primary italic font-normal">Académie</span></span>
        </Link>
        <Button variant="ghost" onClick={() => router.back()} className="text-foreground/60 gap-2 hover:bg-foreground/5 hover:text-secondary">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t("academie.backToDashboard")}</span>
        </Button>
      </header>

      <main className="px-4 sm:px-6 py-12 sm:py-16 max-w-6xl mx-auto space-y-16">
        {/* Hero */}
        <section className="text-center flex flex-col items-center space-y-5">
          <Monogram className="w-12 h-10 text-secondary" />
          <Badge className="bg-secondary/10 text-secondary border border-secondary/25 font-bold px-5 py-1.5 uppercase tracking-[0.25em] text-[10px] rounded-full">
            {t("academie.badge")}
          </Badge>
          <h1 className="font-headline text-3xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight max-w-3xl">
            {t("academie.heroTitle")} <span className="text-primary italic font-normal">{t("academie.heroTitleHighlight")}</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            {t("academie.heroSubtitle")}
          </p>
          <Flourish className="w-48 h-3 text-secondary/50" />
        </section>

        {/* Discernement — leçons réelles */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-secondary/10 border border-secondary/25 rounded-t-2xl rounded-b-md flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-foreground">{t("academie.beforeCommitting")}</h2>
              <p className="text-muted-foreground text-sm">{t("academie.discernmentSubtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {discernementLessons.map((l) => (
              <button
                key={l.href}
                onClick={() => router.push(l.href)}
                className="group text-left rounded-t-3xl rounded-b-xl border border-secondary/20 bg-card hover:border-secondary/45 transition-all p-6 flex flex-col shadow-xl hover:shadow-2xl"
              >
                <div className="w-12 h-12 bg-secondary/10 border border-secondary/25 rounded-t-2xl rounded-b-md flex items-center justify-center mb-5">
                  <l.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-headline text-lg font-bold text-foreground group-hover:text-primary transition-colors">{l.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mt-2 flex-1">{l.desc}</p>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-secondary/10">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {l.duration}</span>
                  <span className="text-secondary text-xs font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all">{t("academie.study")} <ArrowRight className="w-4 h-4" /></span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Programme — modules vie de couple */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-secondary/10 border border-secondary/25 rounded-t-2xl rounded-b-md flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold text-foreground">{t("academie.program")}</h2>
              <p className="text-muted-foreground text-sm">{t("academie.programSubtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {academyThemes.map((theme, index) => (
              <Card
                key={index}
                onClick={() => router.push(`/dashboard/academie/module/${theme.slug}`)}
                className="group border border-secondary/15 bg-card rounded-t-2xl rounded-b-lg p-6 hover:border-secondary/40 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-secondary/10 border border-secondary/20 rounded-t-xl rounded-b-md flex items-center justify-center shrink-0">
                    <theme.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-[10px] font-black text-secondary/60">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{theme.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mt-1.5">{theme.description}</p>
                    <span className="inline-flex items-center gap-1 text-secondary text-xs font-bold mt-3 group-hover:gap-2 transition-all">{t("academie.study")} <ArrowRight className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={() => router.push(discernementLessons[0].href)} className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2">
              {t("academie.startJourney")} <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Mentor — panneau vitrail */}
        <section>
          <div className="relative overflow-hidden rounded-t-[60px] sm:rounded-t-[90px] rounded-b-2xl border border-secondary/25 bg-gradient-to-br from-secondary/10 to-card p-8 sm:p-14">
            <VitrailPattern className="absolute inset-0 w-full h-full text-secondary/[0.08] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-secondary/15 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
              <div className="flex-1 space-y-5">
                <Monogram className="w-11 h-9 text-secondary mx-auto md:mx-0" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary/80 block">{t("academie.mentorBadge")}</span>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{t("academie.mentorTitle")}</h2>
                <p className="text-foreground/60 leading-relaxed max-w-xl">
                  {t("academie.mentorText")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center md:justify-start">
                  <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold h-12 px-7 rounded-xl gap-2">
                    {t("academie.findMentor")} <Users className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" className="border-secondary/30 text-foreground hover:bg-secondary/15 hover:text-foreground h-12 px-7 rounded-xl gap-2 bg-transparent">
                    {t("academie.suggestedReadings")} <BookOpen className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="w-52 h-52 relative rounded-t-[3rem] rounded-b-2xl overflow-hidden shadow-2xl border border-secondary/30 shrink-0">
                <Image src="/couple-bible.webp" alt="Couple lisant la Bible ensemble" fill className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col items-center text-center pt-2">
          <Flourish className="w-40 h-3 text-secondary/40 mb-3" />
          <p className="text-foreground/30 text-xs font-headline italic">{t("academie.footerVerse")}</p>
        </div>
      </main>
    </div>
  );
}
