"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { OliveBirdDivider } from "./page-header";
import { HeroFlipCard } from "./hero-flip-card";

/** Pollen porté par l'air — quelques grains, jamais une pluie. */
function PollenParticles() {
  const particles = [
    { x: "14%", y: "20%", delay: 0, duration: 7, size: 3 },
    { x: "76%", y: "32%", delay: 1.5, duration: 8, size: 2.5 },
    { x: "40%", y: "58%", delay: 3, duration: 9, size: 2 },
    { x: "86%", y: "14%", delay: 0.5, duration: 6, size: 3 },
    { x: "24%", y: "72%", delay: 2, duration: 7.5, size: 2 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pollen-float"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: "hsl(145 22% 62% / 0.32)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function GardenHero() {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden">
      {/* ── Filet végétal en tête de page ── */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-30 eden-hairline"
        aria-hidden="true"
      />

      {!reduced && (
        <div className="hidden lg:block">
          <PollenParticles />
        </div>
      )}

      {/* ── Mise en page : grille sur desktop, empilée sur mobile ── */}
      <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-[52fr_48fr] xl:grid-cols-2 min-h-[100vh] lg:min-h-[92vh]">
        {/* ═══ COLONNE GAUCHE : le texte, sur le ciel du jardin ═══ */}
        <div className="flex items-center relative eden-sky">
          <div className="container mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-24 lg:py-0">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl lg:max-w-lg xl:max-w-xl space-y-6 sm:space-y-7 text-center"
            >
              {/* Sur-titre */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="flex justify-center"
              >
                <span className="eden-eyebrow text-[10px] sm:text-[11px]">
                  <span className="w-6 sm:w-8 h-px bg-deep-eden/25" aria-hidden="true" />
                  {t("hero.eyebrow")}
                </span>
              </motion.div>

              {/* Titre */}
              <h1 className="font-headline text-[2.5rem] sm:text-5xl md:text-[3.5rem] lg:text-6xl xl:text-[4rem] font-bold leading-[1.08] sm:leading-[1.06] text-foreground tracking-tight">
                {t("hero.headline1")}
                <span className="block mt-1.5">
                  <span className="text-primary italic font-medium">
                    {t("hero.headline2")}
                  </span>
                </span>
              </h1>

              {/* Rameau d'olivier ponctué d'un oiseau */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex justify-center"
              >
                <OliveBirdDivider size="md" />
              </motion.div>

              {/* Chapô */}
              <p className="text-[0.95rem] sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-md font-body mx-auto">
                {t("hero.subtitle")}
              </p>

              {/* Appels à l'action */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.8 }}
                className="flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-3 sm:gap-4 pt-2 sm:pt-4"
              >
                <Button
                  size="lg"
                  className="garden-btn-primary px-8 sm:px-9 h-13 sm:h-14 text-[0.95rem] sm:text-base font-semibold rounded-xl w-full sm:w-auto tracking-wide"
                  asChild
                >
                  <Link href="/login">{t("hero.cta")}</Link>
                </Button>
                <Link
                  href="/concept"
                  className="growing-underline text-foreground/60 hover:text-primary font-medium text-[0.95rem] sm:text-base flex items-center gap-2.5 group transition-colors py-3 sm:py-0"
                >
                  {t("hero.visionLink")}
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300 text-sm">&rarr;</span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ═══ COLONNE DROITE : la carte qui pivote ═══ */}
        <div className="relative min-h-[50vh] sm:min-h-[55vh] lg:min-h-[92vh] p-4 sm:p-6 lg:p-8 pb-12 sm:pb-14 lg:pb-16">
          <HeroFlipCard
            label={t("hero.imageAlt")}
            className="w-full h-full min-h-[58vh] sm:min-h-[62vh] lg:min-h-0"
          />
        </div>
      </div>

      {/* ── Vague de séparation ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 1440 48" fill="none" className="w-full h-8 sm:h-10 lg:h-12" preserveAspectRatio="none">
          <path
            d="M0 48 L0 32 Q120 18 240 26 Q360 36 480 22 Q600 10 720 18 Q840 28 960 14 Q1080 4 1200 12 Q1320 22 1440 8 L1440 48 Z"
            fill="hsl(42 35% 97%)"
          />
          <path
            d="M0 44 Q120 30 240 38 Q360 48 480 34 Q600 22 720 30 Q840 40 960 26 Q1080 16 1200 24 Q1320 34 1440 20"
            stroke="hsl(145 22% 62% / 0.16)"
            strokeWidth="0.8"
            fill="none"
          />
        </svg>
      </div>
    </section>
  );
}
