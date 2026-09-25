"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoaderEmblem } from "@/components/loading-screen";
import { MemberGate } from "@/components/member-gate";
import { useI18n } from "@/lib/i18n";

function SearchingPageContent() {
  const router = useRouter();
  const { t } = useI18n();
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  const PHASES = [
    t("searching.phase1"),
    t("searching.phase2"),
    t("searching.phase3"),
    t("searching.phase4"),
  ];
  const RETURNING_PHASES = [
    t("searching.returningPhase1"),
    t("searching.returningPhase2"),
    t("searching.returningPhase3"),
    t("searching.returningPhase4"),
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("returning") === "1") setReturning(true);

    // Pseudonyme public en priorité (nom affiché sur la plateforme), prénom à défaut.
    getSession().then((session) => {
      const display = session?.pseudo?.trim() || session?.name?.trim();
      if (display) setName(display);
    });

    // Progression visuelle
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100));
    }, 80);

    // Rotation des messages
    const phaseTimer = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 1100);

    // Redirection vers la plateforme
    const redirect = setTimeout(() => {
      router.push("/dashboard");
    }, 4500);

    return () => {
      clearInterval(progressTimer);
      clearInterval(phaseTimer);
      clearTimeout(redirect);
    };
  }, [router]);

  const phases = returning ? RETURNING_PHASES : PHASES;

  return (
    <div role="status" aria-live="polite" aria-busy="true"
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Halo d'ambiance, fixe (l'animation est portée par l'emblème) */}
      <div aria-hidden className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[120px] opacity-40"
        style={{ background: "radial-gradient(circle, hsl(145 30% 55% / 0.35) 0%, transparent 70%)" }} />

      <div className="eden-loader-fade relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Emblème animé — même famille que l'écran de chargement */}
        <LoaderEmblem size="lg" className="mb-8" />

        {/* Marque */}
        <span className="font-headline text-2xl font-bold tracking-tight text-foreground">
          Garden <span className="italic font-normal text-primary">of Alliance</span>
        </span>

        {/* Accueil personnalisé avec le pseudo ; la place est réservée pour éviter un saut de mise en page */}
        <p className="text-[#56615A] text-sm mt-2 mb-10 min-h-[1.25rem]">
          {name && <>{returning ? t("searching.welcomeBack") : t("searching.welcome")}<span className="text-primary font-bold">{name}</span></>}
        </p>

        {/* Message principal */}
        <h1
          key={phase}
          className="font-headline text-2xl sm:text-3xl font-bold text-foreground min-h-[2.5em] flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {phases[phase]}
        </h1>

        {/* Barre de progression */}
        <div className="w-full max-w-xs mt-8">
          <div className="h-[3px] w-full bg-primary/10 rounded-full overflow-hidden"
            role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div
              className="h-full rounded-full transition-all duration-100 ease-out bg-gradient-to-r from-primary/60 to-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B746E] mt-4 tabular-nums">
            {progress}{t("searching.progressFooter")}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Réservé aux comptes approuvés par l'admin. */
export default function SearchingPage() {
  return <MemberGate><SearchingPageContent /></MemberGate>;
}
