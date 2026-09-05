"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GardenSection } from "./garden-section";
import { DoveWithOliveBranch } from "./birds";
import { SkyFlock } from "./bird-scene";
import { OliveBirdDivider } from "./page-header";
import { useI18n } from "@/lib/i18n";

export function QuoteSection() {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  return (
    <GardenSection variant="garden" className="py-20 sm:py-32 relative overflow-hidden">
      {/* Deux nuées lointaines encadrent la citation sans jamais la toucher */}
      <SkyFlock count={4} className="hidden sm:block absolute top-12 left-[6%] w-32 lg:w-44 opacity-[0.12]" />
      <SkyFlock count={3} className="hidden lg:block absolute bottom-16 right-[7%] w-28 opacity-[0.1]" />

      <div className="container mx-auto px-5 sm:px-6 relative z-10 text-center">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto space-y-6 sm:space-y-10"
        >
          {/* La colombe au rameau — l'emblème de l'alliance, en ouverture */}
          <div className="flex justify-center">
            <DoveWithOliveBranch className="w-28 sm:w-36 h-auto text-deep-eden/45" />
          </div>

          <h2 className="font-headline text-[1.7rem] leading-snug sm:text-5xl md:text-6xl font-bold text-foreground sm:leading-tight italic">
            &ldquo;{t("quote.text")}&rdquo;
          </h2>

          <div className="flex justify-center">
            <OliveBirdDivider className="w-40 sm:w-52" />
          </div>

          <p className="text-base sm:text-xl text-primary font-headline tracking-[0.2em] uppercase opacity-85">
            {t("quote.reference")}
          </p>

          <div className="pt-4 sm:pt-6">
            <Button
              size="lg"
              className="garden-btn-primary px-9 sm:px-14 h-14 sm:h-16 text-base sm:text-xl font-bold rounded-xl w-full sm:w-auto"
              asChild
            >
              <Link href="/login">{t("quote.cta")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </GardenSection>
  );
}
