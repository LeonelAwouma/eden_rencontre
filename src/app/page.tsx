"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenHero, PromoBanner, AnnouncementBar } from "@/components/garden";
import { FeaturesSection } from "@/components/garden/features-section";
import { QuoteSection } from "@/components/garden/quote-section";
import { useI18n } from "@/lib/i18n";

/** Compteur qui monte de 0 à `end` dès qu'il entre dans le champ de vision. */
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setCount(end);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;

          const startTime = performance.now();
          const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Sortie cubique : la décélération paraît naturelle
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, reduced]);

  return <span ref={ref}>{count.toLocaleString("fr-FR")}{suffix}</span>;
}

/** Bandeau de chiffres, posé entre le hero et les piliers. */
function StatsBar() {
  const { t } = useI18n();

  const stats = [
    { end: 2500, suffix: "+", label: t("home.blessedCouples") },
    { end: 15, suffix: "+", label: t("home.countriesRepresented") },
    { end: 98, suffix: "%", label: t("home.verifiedProfiles") },
  ];

  return (
    <section className="py-14 sm:py-20 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 eden-hairline" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 eden-hairline" aria-hidden="true" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 text-center">
          {stats.map((stat, i) => (
            <div key={stat.label} className="space-y-1.5 relative">
              {/* Séparateur végétal entre les colonnes, sur écran large */}
              {i > 0 && (
                <div
                  className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-sage/30 to-transparent"
                  aria-hidden="true"
                />
              )}
              <div className="text-3xl sm:text-4xl font-headline font-bold text-deep-eden">
                <AnimatedCounter end={stat.end} suffix={stat.suffix} duration={2200} />
              </div>
              <p className="text-muted-foreground text-sm sm:text-base font-body">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <Navigation />

      <main>
        <GardenHero />
        <StatsBar />
        <PromoBanner />
        <FeaturesSection />
        <QuoteSection />
      </main>

      <Footer />
    </div>
  );
}
