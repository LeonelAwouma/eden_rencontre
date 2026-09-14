"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { GardenIllustration } from "./illustration";

/** Promotional banner showcasing Garden of Alliance value proposition */
export function PromoBanner() {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  return (
    <section className="relative py-16 sm:py-24 bg-gradient-to-b from-background via-sage/5 to-background overflow-hidden">
      {/* Subtle top/bottom organic dividers */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sage/15 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sage/15 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image Column */}
          <motion.div
            initial={reduced ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative order-2 lg:order-1"
          >
            {/* Organic frame behind image */}
            <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-br from-sage/10 via-transparent to-deep-eden/5 rounded-3xl -rotate-1" aria-hidden="true" />
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-xl shadow-deep-eden/10 bg-white">
              <Image
                src="/image_pub.webp"
                alt={t("promo.imageAlt")}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

            </div>
          </motion.div>

          {/* Content Column */}
          <motion.div
            initial={reduced ? false : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6 order-1 lg:order-2 text-center lg:text-left"
          >
            <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">
              {t("promo.label")}
            </span>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
              {t("promo.title")}
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed font-body max-w-lg mx-auto lg:mx-0">
              {t("promo.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <Link
                href="/inscription"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-deep-eden text-white font-semibold hover:bg-deep-eden/90 transition-colors shadow-lg shadow-deep-eden/20"
              >
                {t("promo.cta")}
              </Link>
              <Link
                href="/concept"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-sage/30 text-deep-eden font-semibold hover:bg-sage/10 transition-colors"
              >
                {t("promo.learnMore")}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Illustration botanique — bouquet d'hibiscus et colibri, coin haut-droit */}
      <GardenIllustration
        src="/image_garden.png"
        placement="corner"
        corner="tr"
        opacity={0.55}
        fringe="heavy"
        width={1254}
        height={1254}
        className="hidden sm:block absolute -top-6 right-4 w-40 lg:w-56 z-0"
      />
    </section>
  );
}
