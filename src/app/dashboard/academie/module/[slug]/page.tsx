"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  BookOpen,
  Lightbulb,
  Quote,
  Church,
  MessageSquare,
  Wallet,
  Users,
  Flame,
  Briefcase,
  Heart,
  Baby,
  Clock,
  Mountain,
  Sprout,
  HeartHandshake,
} from "lucide-react";
import { Monogram, Flourish, VitrailPattern } from "@/components/ornaments";
import { ACADEMY_MODULES, getModule } from "@/lib/academy";

const ICONS: Record<string, any> = {
  church: Church,
  message: MessageSquare,
  wallet: Wallet,
  users: Users,
  flame: Flame,
  briefcase: Briefcase,
  heart: Heart,
  baby: Baby,
  clock: Clock,
  mountain: Mountain,
  sprout: Sprout,
  handshake: HeartHandshake,
};

export default function AcademyModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const mod = getModule(slug);
  if (!mod) notFound();

  const idx = ACADEMY_MODULES.findIndex((m) => m.slug === slug);
  const prev = idx > 0 ? ACADEMY_MODULES[idx - 1] : null;
  const next = idx < ACADEMY_MODULES.length - 1 ? ACADEMY_MODULES[idx + 1] : null;
  const Icon = ICONS[mod.icon] || BookOpen;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-secondary/15 px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link href="/dashboard/academie" className="flex items-center gap-2.5 group">
          <Monogram className="w-9 h-8 text-primary group-hover:text-secondary transition-colors" />
          <span className="font-headline text-xl font-bold text-foreground">Eden <span className="text-primary italic font-normal">Académie</span></span>
        </Link>
        <Button variant="ghost" onClick={() => router.push("/dashboard/academie")} className="text-foreground/60 gap-2 hover:bg-foreground/5 hover:text-secondary">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">L'Académie</span>
        </Button>
      </header>

      <main className="px-4 sm:px-6 py-12 sm:py-16 max-w-3xl mx-auto space-y-14">
        {/* Hero du module */}
        <section className="text-center flex flex-col items-center space-y-5">
          <div className="w-16 h-16 bg-secondary/10 border border-secondary/25 rounded-t-3xl rounded-b-lg flex items-center justify-center">
            <Icon className="w-8 h-8 text-secondary" />
          </div>
          <Badge className="bg-secondary/10 text-secondary border border-secondary/25 font-bold px-5 py-1.5 uppercase tracking-[0.25em] text-[10px] rounded-full">
            Module {String(idx + 1).padStart(2, "0")} / {ACADEMY_MODULES.length}
          </Badge>
          <h1 className="font-headline text-3xl sm:text-5xl font-bold text-foreground leading-tight">{mod.title}</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">{mod.subtitle}</p>
          <Flourish className="w-44 h-3 text-secondary/50" />
        </section>

        {/* Verset — panneau vitrail */}
        <section className="relative overflow-hidden rounded-t-[60px] rounded-b-2xl border border-secondary/25 bg-gradient-to-br from-secondary/10 to-card p-8 sm:p-10 text-center">
          <VitrailPattern className="absolute inset-0 w-full h-full text-secondary/[0.08] pointer-events-none" />
          <div className="relative z-10">
            <Quote className="w-6 h-6 text-secondary mx-auto mb-4" />
            <p className="font-headline text-xl sm:text-2xl italic leading-relaxed text-foreground">&ldquo;{mod.verse.text}&rdquo;</p>
            <p className="text-secondary text-xs font-bold tracking-[0.28em] uppercase mt-5">{mod.verse.ref}</p>
          </div>
        </section>

        {/* Intro */}
        <p className="text-lg text-foreground/80 leading-relaxed text-center max-w-2xl mx-auto">{mod.intro}</p>

        {/* Sections */}
        <div className="space-y-6">
          {mod.sections.map((s, i) => (
            <Card key={i} className="border border-secondary/15 bg-card rounded-t-2xl rounded-b-lg p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-headline text-2xl font-black text-secondary/50">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-headline text-xl font-bold text-foreground">{s.title}</h3>
              </div>
              <p className="text-foreground/70 leading-relaxed">{s.body}</p>
              {s.tip && (
                <div className="mt-4 bg-secondary/5 border border-secondary/15 rounded-xl p-4 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/70 italic">{s.tip}</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Prière */}
        <Card className="border border-secondary/15 bg-card rounded-2xl p-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary mb-4">Prière du module</p>
          <p className="font-headline text-xl italic leading-relaxed text-foreground/85">&ldquo;{mod.prayer}&rdquo;</p>
        </Card>

        {/* Navigation prev/next */}
        <div className="flex items-center justify-between gap-4 pt-2">
          {prev ? (
            <button onClick={() => router.push(`/dashboard/academie/module/${prev.slug}`)} className="group flex items-center gap-2 text-left text-foreground/60 hover:text-secondary transition-colors min-w-0">
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-widest text-foreground/30">Précédent</span>
                <span className="block text-sm font-bold truncate">{prev.title}</span>
              </span>
            </button>
          ) : <span />}
          {next ? (
            <button onClick={() => router.push(`/dashboard/academie/module/${next.slug}`)} className="group flex items-center gap-2 text-right text-foreground/60 hover:text-secondary transition-colors min-w-0 ml-auto">
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-widest text-foreground/30">Suivant</span>
                <span className="block text-sm font-bold truncate">{next.title}</span>
              </span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>
          ) : (
            <Button onClick={() => router.push("/dashboard/academie")} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 rounded-xl gap-2">
              Terminer le parcours
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center text-center pt-2">
          <Flourish className="w-36 h-3 text-secondary/40 mb-3" />
          <p className="text-foreground/30 text-xs font-headline italic">« Si l'Éternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain. » — Psaume 127:1</p>
        </div>
      </main>
    </div>
  );
}
