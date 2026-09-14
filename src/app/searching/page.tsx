"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";

export default function SearchingPage() {
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

    getSession().then((session) => {
      if (session?.name) setName(session.name);
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Halos d'ambiance */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Logo avec anneaux animés */}
        <div className="relative mb-12">
          <span className="absolute inset-0 -m-6 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "2.5s" }} />
          <span className="absolute inset-0 -m-12 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "3.5s" }} />
          <div className="w-28 h-28 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/20">
            <Monogram
              className="w-16 h-16 text-primary animate-pulse"
              style={{ animationDuration: "2s" }}
            />
          </div>
        </div>

        {/* Marque */}
        <span className="font-headline text-2xl font-bold tracking-tight text-foreground mb-2">
          Garden <span>of Alliance</span>
        </span>

        {name && (
          <p className="text-foreground/40 text-sm mb-10">
            {returning ? t("searching.welcomeBack") : t("searching.welcome")}<span className="text-primary font-bold">{name}</span>
          </p>
        )}

        {/* Message principal */}
        <h1
          key={phase}
          className="font-headline text-2xl sm:text-3xl font-bold text-foreground min-h-[2.5em] flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {phases[phase]}
        </h1>

        {/* Barre de progression */}
        <div className="w-full max-w-xs mt-8">
          <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(198, 166, 79,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30 mt-4">
            {progress}{t("searching.progressFooter")}
          </p>
        </div>
      </div>
    </div>
  );
}
