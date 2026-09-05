
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GardenSection } from "./garden-section";
import { GardenCard } from "./garden-card";
import { OliveBirdDivider } from "./page-header";
import { SkyFlock, PerchOrnament } from "./bird-scene";
import { useI18n } from "@/lib/i18n";

/** Nature-inspired icons as SVG components */
function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.5" stroke="currentColor">
      <path d="M12 22C12 22 4 16 4 10C4 6 8 2 12 2C16 2 20 6 20 10C20 16 12 22 12 22Z" />
      <path d="M12 22V8" />
      <path d="M8 12C8 12 10 10 12 8" />
      <path d="M16 12C16 12 14 10 12 8" />
    </svg>
  );
}

function ShieldLeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.5" stroke="currentColor">
      <path d="M12 2L3 7V12C3 17.5 7.8 22.5 12 24C16.2 22.5 21 17.5 21 12V7L12 2Z" />
      <ellipse cx="12" cy="13" rx="4" ry="6" fill="none" stroke="currentColor" opacity="0.5" />
      <path d="M12 10V16" opacity="0.5" />
      <path d="M10 12C10 12 11 11 12 10" opacity="0.5" />
      <path d="M14 12C14 12 13 11 12 10" opacity="0.5" />
    </svg>
  );
}

function TreeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth="1.5" stroke="currentColor">
      <path d="M12 22V12" />
      <ellipse cx="12" cy="8" rx="8" ry="6" />
      <ellipse cx="12" cy="6" rx="5" ry="4" />
      <path d="M12 22H9" opacity="0.5" />
      <path d="M12 22H15" opacity="0.5" />
    </svg>
  );
}

export function FeaturesSection() {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  const features = [
    {
      icon: LeafIcon,
      title: t("features.faithProfileTitle"),
      description: t("features.faithProfileDesc"),
    },
    {
      icon: ShieldLeafIcon,
      title: t("features.securityTitle"),
      description: t("features.securityDesc"),
    },
    {
      icon: TreeIcon,
      title: t("features.eliteTitle"),
      description: t("features.eliteDesc"),
    },
  ];

  return (
    <GardenSection variant="muted" className="relative overflow-hidden">
      <SkyFlock count={4} className="hidden sm:block absolute top-12 right-[7%] w-32 lg:w-44 opacity-[0.12]" />
      <PerchOrnament className="hidden lg:block absolute bottom-12 left-[4%] w-24 opacity-[0.16]" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-14 sm:mb-20 space-y-5"
        >
          <span className="eden-eyebrow">
            <span className="w-7 h-px bg-deep-eden/25" aria-hidden="true" />
            {t("features.pillarsLabel")}
            <span className="w-7 h-px bg-deep-eden/25" aria-hidden="true" />
          </span>
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            {t("features.sectionTitle1")}{" "}
            <span className="text-primary italic">{t("features.sectionTitle2")}</span>
          </h2>
          {/* Rameau d'olivier ponctue d'un oiseau */}
          <div className="flex justify-center">
            <OliveBirdDivider />
          </div>
          <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed">
            {t("features.sectionDesc")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <GardenCard index={i} {...feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </GardenSection>
  );
}