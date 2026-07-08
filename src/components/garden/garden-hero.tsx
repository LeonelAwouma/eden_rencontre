"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Elegant olive branch SVG for hero decoration */
function OliveBranch({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 400"
      fill="none"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    >
      {/* Main stem */}
      <path
        d="M100 380 Q95 300 100 220 Q105 140 98 60 Q96 30 100 5"
        stroke="hsl(95 28% 38% / 0.25)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Olive leaves */}
      <ellipse cx="85" cy="80" rx="18" ry="8" fill="hsl(145 22% 62% / 0.12)" transform="rotate(-35 85 80)" />
      <ellipse cx="115" cy="110" rx="16" ry="7" fill="hsl(95 28% 38% / 0.1)" transform="rotate(30 115 110)" />
      <ellipse cx="82" cy="150" rx="20" ry="8" fill="hsl(145 22% 62% / 0.1)" transform="rotate(-25 82 150)" />
      <ellipse cx="118" cy="185" rx="17" ry="7" fill="hsl(95 28% 38% / 0.08)" transform="rotate(35 118 185)" />
      <ellipse cx="80" cy="225" rx="19" ry="8" fill="hsl(145 22% 62% / 0.09)" transform="rotate(-30 80 225)" />
      <ellipse cx="120" cy="260" rx="16" ry="7" fill="hsl(95 28% 38% / 0.07)" transform="rotate(25 120 260)" />
      <ellipse cx="85" cy="300" rx="18" ry="8" fill="hsl(145 22% 62% / 0.08)" transform="rotate(-20 85 300)" />
      <ellipse cx="115" cy="340" rx="15" ry="7" fill="hsl(95 28% 38% / 0.06)" transform="rotate(30 115 340)" />
      {/* Small olives */}
      <circle cx="92" cy="130" r="3.5" fill="hsl(95 28% 38% / 0.15)" />
      <circle cx="108" cy="200" r="3" fill="hsl(95 28% 38% / 0.12)" />
      <circle cx="90" cy="270" r="3.5" fill="hsl(95 28% 38% / 0.1)" />
    </svg>
  );
}

/** Floating pollen particles */
function PollenParticles() {
  const particles = [
    { x: "15%", y: "20%", delay: 0, duration: 7, size: 3 },
    { x: "75%", y: "35%", delay: 1.5, duration: 8, size: 2.5 },
    { x: "45%", y: "60%", delay: 3, duration: 9, size: 2 },
    { x: "85%", y: "15%", delay: 0.5, duration: 6, size: 3.5 },
    { x: "25%", y: "75%", delay: 2, duration: 7.5, size: 2 },
    { x: "60%", y: "80%", delay: 4, duration: 8.5, size: 2.5 },
    { x: "90%", y: "55%", delay: 1, duration: 7, size: 3 },
    { x: "10%", y: "45%", delay: 2.5, duration: 9, size: 2 },
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
            background: `hsl(145 22% 62% / 0.4)`,
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
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden bg-background">
      {/* Layered botanical depth background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Morning sunrise radial */}
        <div
          className="absolute top-0 right-1/4 w-[800px] h-[800px] rounded-full opacity-60"
          style={{
            background: "radial-gradient(circle, hsl(145 22% 62% / 0.08) 0%, hsl(145 22% 62% / 0.03) 30%, transparent 60%)",
          }}
        />
        {/* Sage glow bottom-left */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-sage/5 blur-[100px]" />
        {/* Deep eden ambient */}
        <div className="absolute top-1/3 right-0 w-[400px] h-[600px] rounded-full bg-deep-eden/3 blur-[80px]" />
        {/* Olive warmth */}
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-olive/4 blur-[60px]" />
      </div>

      {/* Subtle botanical leaf pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M100 180 Q95 140 100 100 Q105 60 100 20' stroke='hsl(155 42%25 18%25)' stroke-width='0.5' fill='none'/%3E%3Cellipse cx='85' cy='60' rx='15' ry='8' fill='hsl(145 22%25 62%25)' opacity='0.3' transform='rotate(-30 85 60)'/%3E%3Cellipse cx='118' cy='100' rx='13' ry='7' fill='hsl(95 28%25 38%25)' opacity='0.25' transform='rotate(25 118 100)'/%3E%3Cellipse cx='82' cy='140' rx='14' ry='7' fill='hsl(145 22%25 62%25)' opacity='0.2' transform='rotate(-20 82 140)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Hero image — right side, atmospheric */}
      <div className="absolute top-0 right-0 w-full sm:w-[55%] lg:w-[50%] h-full z-0 pointer-events-none select-none">
        <div className="relative w-full h-full opacity-15 sm:opacity-85">
          <Image
            src="/mariage.png"
            alt=""
            fill
            className="object-contain object-bottom object-right"
            priority
            aria-hidden="true"
          />
          {/* Elegant edge blends */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/20 to-background z-10" />
          <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-background to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-background via-background/90 to-transparent z-10" />
          {/* Golden light overlay on image */}
          <div
            className="absolute inset-0 z-10 mix-blend-soft-light opacity-30"
            style={{
              background: "radial-gradient(ellipse at 60% 40%, hsl(145 22% 62% / 0.2) 0%, transparent 60%)",
            }}
          />
        </div>
      </div>

      {/* Olive branch — left side */}
      <div className="absolute top-0 left-0 w-24 sm:w-32 lg:w-40 h-full pointer-events-none hidden lg:block" aria-hidden="true">
        <OliveBranch className="w-full h-full opacity-60" />
      </div>

      {/* Olive branch — right edge, flipped */}
      <div className="absolute top-0 right-0 w-20 sm:w-28 h-[70%] pointer-events-none hidden xl:block" aria-hidden="true">
        <OliveBranch className="w-full h-full opacity-40" flip />
      </div>

      {/* Pollen particles */}
      {!reduced && <PollenParticles />}

      {/* Golden accent line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none z-30"
        aria-hidden="true"
        style={{
          background: "linear-gradient(90deg, transparent 5%, hsl(145 22% 62% / 0.2) 20%, hsl(145 22% 62% / 0.35) 50%, hsl(145 22% 62% / 0.2) 80%, transparent 95%)",
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-5 sm:px-6 lg:px-0 relative z-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl lg:max-w-xl space-y-6 sm:space-y-8 text-center lg:text-left pt-10 sm:pt-16 lg:pt-0 lg:pl-[80px]"
        >
          {/* Eyebrow label */}
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center lg:justify-start"
          >
            <span className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.3em] text-deep-eden/60">
              <span className="w-8 h-[1px] bg-deep-eden/20" />
              Sanctuaire Numérique
              <span className="w-8 h-[1px] bg-deep-eden/20" />
            </span>
          </motion.div>

          {/* Main headline — Cormorant Garamond editorial */}
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] sm:leading-[1.06] text-foreground tracking-tight">
            L'union bénie,
            <span className="block mt-1">
              <span className="text-primary italic font-medium">
                scellée par la foi,
              </span>
            </span>
            <span className="block mt-1">commence ici.</span>
          </h1>

          {/* Botanical divider — olive leaf */}
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex justify-center lg:justify-start"
          >
            <svg viewBox="0 0 80 16" className="w-20 h-4 opacity-40" fill="none" aria-hidden="true">
              <path d="M0 8 L25 8" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
              <ellipse cx="40" cy="8" rx="12" ry="5" fill="hsl(145 22% 62% / 0.3)" transform="rotate(-15 40 8)" />
              <ellipse cx="40" cy="8" rx="3" ry="6" fill="hsl(95 28% 38% / 0.15)" />
              <path d="M55 8 L80 8" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
            </svg>
          </motion.div>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg font-body mx-auto lg:mx-0">
            Rejoignez la communauté de référence pour les célibataires chrétiens d'Afrique et de la diaspora. Un sanctuaire dédié à la vérité et à l'engagement sacré.
          </p>

          {/* CTA — elegant, nature-inspired */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-4 sm:pt-6 pb-12 lg:pb-0"
          >
            <Button
              size="lg"
              className="garden-btn-primary px-8 sm:px-10 h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-xl w-full sm:w-auto tracking-wide"
              asChild
            >
              <Link href="/login">Chercher son alliance</Link>
            </Button>
            <Link
              href="/concept"
              className="growing-underline text-foreground/70 hover:text-primary font-medium text-base sm:text-lg flex items-center gap-3 group transition-colors"
            >
              Notre Vision Sacrée
              <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex items-center justify-center lg:justify-start gap-6 sm:gap-8 pt-4 text-[11px] uppercase tracking-[0.2em] text-foreground/30 font-medium"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-natural-sage/60" />
              2 500+ Couples
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage/60" />
              15+ Pays
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-deep-eden/40" />
              100% Modéré
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}