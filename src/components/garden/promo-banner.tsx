"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

/** Promotional banner showcasing Eden Connexion value proposition */
export function PromoBanner() {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  return (
    <section className="relative py-16 sm:py-24 bg-gradient-to-b from-background via-sage/5 to-background overflow-hidden">
      {/* Subtle top/bottom organic dividers */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sage/15 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sage/15 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-4 sm:px-6">
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
                src="/image_pub.png"
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

      {/* Decorative botanical accent — top-right */}
      <div className="absolute -top-4 right-8 w-32 h-32 opacity-[0.07] pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none" className="w-full h-full text-sage">
          <path d="M60 10C60 10 20 40 20 70C20 100 60 110 60 110C60 110 100 100 100 70C100 40 60 10 60 10Z" stroke="currentColor" strokeWidth="1" />
          <path d="M60 30V90" stroke="currentColor" strokeWidth="0.5" />
          <path d="M40 50C40 50 50 45 60 40" stroke="currentColor" strokeWidth="0.5" />
          <path d="M80 50C80 50 70 45 60 40" stroke="currentColor" strokeWidth="0.5" />
          <path d="M35 70C35 70 48 62 60 55" stroke="currentColor" strokeWidth="0.5" />
          <path d="M85 70C85 70 72 62 60 55" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Decorative botanical accent — bottom-left */}
      <div className="absolute -bottom-4 left-8 w-24 h-24 opacity-[0.07] pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-sage">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.5" />
          <path d="M50 10V90" stroke="currentColor" strokeWidth="0.5" />
          <path d="M10 50H90" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>
    </section>
  );
}
