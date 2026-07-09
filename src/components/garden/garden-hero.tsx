"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

  return (
    <section className="relative overflow-hidden bg-background">
      {/* ── Top Accent Line ── */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none z-30"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, hsl(145 22% 62% / 0.15) 25%, hsl(145 22% 62% / 0.3) 50%, hsl(145 22% 62% / 0.15) 75%, transparent 95%)",
        }}
      />

      {/* ── Botanical Atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-sage/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-olive/[0.03] blur-[100px]" />
      </div>

      {/* Subtle botanical pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M100 180 Q95 140 100 100 Q105 60 100 20' stroke='hsl(155 42%25 18%25)' stroke-width='0.5' fill='none'/%3E%3Cellipse cx='85' cy='60' rx='15' ry='8' fill='hsl(145 22%25 62%25)' opacity='0.3' transform='rotate(-30 85 60)'/%3E%3Cellipse cx='118' cy='100' rx='13' ry='7' fill='hsl(95 28%25 38%25)' opacity='0.25' transform='rotate(25 118 100)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Pollen particles — only on desktop where image is separate */}
      <div className="hidden lg:block">
        {!reduced && <PollenParticles />}
      </div>

      {/* ── Main Layout: Split on desktop, stacked on mobile ── */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-[100vh] lg:min-h-[92vh]">

        {/* ═══ LEFT COLUMN: Text Content ═══ */}
        <div className="flex items-center lg:w-[52%] xl:w-[50%] relative">
          <div className="container mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-20 sm:py-24 lg:py-0">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl lg:max-w-lg xl:max-w-xl space-y-6 sm:space-y-7 text-center lg:text-left"
            >
              {/* Eyebrow */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="flex justify-center lg:justify-start"
              >
                <span className="inline-flex items-center gap-2.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-deep-eden/50">
                  <span className="w-6 sm:w-8 h-[1px] bg-deep-eden/20" />
                  Sanctuaire Numérique
                </span>
              </motion.div>

              {/* Headline */}
              <h1 className="font-headline text-[2.5rem] sm:text-5xl md:text-[3.5rem] lg:text-6xl xl:text-[4rem] font-bold leading-[1.08] sm:leading-[1.06] text-foreground tracking-tight">
                L'union bénie,
                <span className="block mt-1.5">
                  <span className="text-primary italic font-medium">
                    scellée par la foi,
                  </span>
                </span>
                <span className="block mt-1">commence ici.</span>
              </h1>

              {/* Olive leaf divider */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex justify-center lg:justify-start"
              >
                <svg viewBox="0 0 80 14" className="w-16 sm:w-20 h-3.5 opacity-35" fill="none" aria-hidden="true">
                  <path d="M0 7 L25 7" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
                  <ellipse cx="40" cy="7" rx="11" ry="4.5" fill="hsl(145 22% 62% / 0.3)" transform="rotate(-15 40 7)" />
                  <ellipse cx="40" cy="7" rx="2.5" ry="5" fill="hsl(95 28% 38% / 0.15)" />
                  <path d="M55 7 L80 7" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
                </svg>
              </motion.div>

              {/* Subheading */}
              <p className="text-[0.95rem] sm:text-base lg:text-lg text-muted-foreground leading-relaxed max-w-md font-body mx-auto lg:mx-0">
                Rejoignez la communauté de référence pour les célibataires chrétiens d'Afrique et de la diaspora. Un sanctuaire dédié à la vérité et à l'engagement sacré.
              </p>

              {/* CTAs */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.8 }}
                className="flex flex-col sm:flex-row items-center sm:items-stretch justify-center lg:justify-start gap-3 sm:gap-4 pt-2 sm:pt-4"
              >
                <Button
                  size="lg"
                  className="garden-btn-primary px-8 sm:px-9 h-13 sm:h-14 text-[0.95rem] sm:text-base font-semibold rounded-xl w-full sm:w-auto tracking-wide"
                  asChild
                >
                  <Link href="/login">Chercher son alliance</Link>
                </Button>
                <Link
                  href="/concept"
                  className="growing-underline text-foreground/60 hover:text-primary font-medium text-[0.95rem] sm:text-base flex items-center gap-2.5 group transition-colors py-3 sm:py-0"
                >
                  Notre Vision Sacrée
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300 text-sm">→</span>
                </Link>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 1.1 }}
                className="flex items-center justify-center lg:justify-start gap-5 sm:gap-7 pt-4 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground/25 font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-natural-sage/50" />
                  2 500+ Couples
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage/50" />
                  15+ Pays
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-deep-eden/30" />
                  100% Modéré
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Hero Image ═══ */}
        <div className="relative lg:w-[48%] xl:w-[50%] min-h-[50vh] sm:min-h-[55vh] lg:min-h-[92vh]">
          {/* Image fills this column naturally */}
          <div className="absolute inset-0">
            <Image
              src="/hero.png"
              alt="Couple chrétien — Eden Rencontre"
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
            />
          </div>

          {/* Soft edge blend — left side on desktop only */}
          <div className="hidden lg:block absolute inset-y-0 left-0 w-24 z-10" aria-hidden="true"
            style={{
              background: "linear-gradient(to right, hsl(42 35% 97% / 0.9), hsl(42 35% 97% / 0.4), transparent)",
            }}
          />

          {/* Mobile: top/bottom fade for stacked layout */}
          <div className="lg:hidden absolute inset-x-0 top-0 h-24 z-10" aria-hidden="true"
            style={{
              background: "linear-gradient(to bottom, hsl(42 35% 97%), hsl(42 35% 97% / 0.3), transparent)",
            }}
          />
          <div className="lg:hidden absolute inset-x-0 bottom-0 h-20 z-10" aria-hidden="true"
            style={{
              background: "linear-gradient(to top, hsl(42 35% 97%), hsl(42 35% 97% / 0.5), transparent)",
            }}
          />

          {/* Subtle warm light overlay */}
          <div
            className="absolute inset-0 z-[5] mix-blend-soft-light opacity-15 pointer-events-none"
            aria-hidden="true"
            style={{
              background: "radial-gradient(ellipse at 50% 40%, hsl(145 22% 62% / 0.15) 0%, transparent 70%)",
            }}
          />
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