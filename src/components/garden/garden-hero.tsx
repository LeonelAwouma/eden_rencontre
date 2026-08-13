"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/** Floating pollen particles */
function PollenParticles() {
  const particles = [
    { x: "12%", y: "18%", delay: 0, duration: 7, size: 3 },
    { x: "78%", y: "30%", delay: 1.5, duration: 8, size: 2.5 },
    { x: "42%", y: "55%", delay: 3, duration: 9, size: 2 },
    { x: "88%", y: "12%", delay: 0.5, duration: 6, size: 3 },
    { x: "22%", y: "70%", delay: 2, duration: 7.5, size: 2 },
    { x: "65%", y: "82%", delay: 4, duration: 8.5, size: 2 },
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
            background: "hsl(145 22% 62% / 0.3)",
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
      {/* ── Top Accent Line ── */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none z-30"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, hsl(145 22% 62% / 0.15) 25%, hsl(145 22% 62% / 0.3) 50%, hsl(145 22% 62% / 0.15) 75%, transparent 95%)",
        }}
      />

      {/* Pollen particles — only on desktop where image is separate */}
      <div className="hidden lg:block">
        {!reduced && <PollenParticles />}
      </div>

      {/* ── Main Layout: CSS Grid on desktop (avoids sub-pixel rounding gap), stacked on mobile ── */}
      <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-[52fr_48fr] xl:grid-cols-2 min-h-[100vh] lg:min-h-[92vh]">
        {/* ═══ LEFT COLUMN: Text Content ═══ */}
        <div className="flex items-center relative">
          <div className="container mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-24 lg:py-0">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl lg:max-w-lg xl:max-w-xl space-y-6 sm:space-y-7 text-center"
            >
              {/* Eyebrow */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="flex justify-center"
              >
                <span className="inline-flex items-center gap-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-deep-eden/50">
                  <span className="w-6 sm:w-8 h-[1px] bg-deep-eden/20" />
                  {t("hero.eyebrow")}
                </span>
              </motion.div>

              {/* Headline */}
              <h1 className="font-headline text-[2.5rem] sm:text-5xl md:text-[3.5rem] lg:text-6xl xl:text-[4rem] font-bold leading-[1.08] sm:leading-[1.06] text-foreground tracking-tight">
                {t("hero.headline1")}
                <span className="block mt-1.5">
                  <span className="text-primary italic font-medium">
                    {t("hero.headline2")}
                  </span>
                </span>
              </h1>

              {/* Olive leaf divider */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex justify-center"
              >
                <svg viewBox="0 0 80 14" className="w-16 sm:w-20 h-3.5 opacity-35" fill="none" aria-hidden="true">
                  <path d="M0 7 L25 7" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
                  <ellipse cx="40" cy="7" rx="11" ry="4.5" fill="hsl(145 22% 62% / 0.3)" transform="rotate(-15 40 7)" />
                  <ellipse cx="40" cy="7" rx="2.5" ry="5" fill="hsl(95 28% 38% / 0.15)" />
                  <path d="M55 7 L80 7" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
                </svg>
              </motion.div>

              {/* Subheading */}
              <p className="text-[0.95rem] sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-md font-body mx-auto">
                {t("hero.subtitle")}
              </p>

              {/* CTAs */}
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
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300 text-sm">→</span>
                </Link>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 1.1 }}
                className="flex items-center justify-center gap-5 sm:gap-7 pt-4 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground/25 font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-natural-sage/50" />
                  {t("hero.couples")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage/50" />
                  {t("hero.countries")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-deep-eden/30" />
                  {t("hero.moderated")}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Hero Image ═══ */}
        <div className="relative min-h-[50vh] sm:min-h-[55vh] lg:min-h-[92vh]">
          {/* Image fills this column naturally */}
          <div className="absolute inset-0">
            <Image
              src="/hero.png"
              alt="Couple chrétien — Eden Connexion"
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
            />
          </div>


        </div>
      </div>

      {/* ── Bottom Organic Divider ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 1440 48" fill="none" className="w-full h-8 sm:h-10 lg:h-12" preserveAspectRatio="none">
          <path
            d="M0 48 L0 32 Q120 18 240 26 Q360 36 480 22 Q600 10 720 18 Q840 28 960 14 Q1080 4 1200 12 Q1320 22 1440 8 L1440 48 Z"
            fill="hsl(42 35% 97%)"
          />
          <path
            d="M0 44 Q120 30 240 38 Q360 48 480 34 Q600 22 720 30 Q840 40 960 26 Q1080 16 1200 24 Q1320 34 1440 20"
            stroke="hsl(145 22% 62% / 0.12)"
            strokeWidth="0.8"
            fill="none"
          />
        </svg>
      </div>
    </section>
  );
}