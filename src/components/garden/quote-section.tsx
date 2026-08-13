"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GardenSection } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export function QuoteSection() {
  const reduced = useReducedMotion();
  const { t } = useI18n();

  return (
    <GardenSection variant="garden" className="py-20 sm:py-32">
      <div className="container mx-auto px-5 sm:px-6 relative z-10 text-center">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto space-y-6 sm:space-y-10"
        >
          {/* Decorative olive branch icon */}
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ring-1 ring-sage/15 bg-deep-eden/5">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7 sm:w-9 sm:h-9" aria-hidden="true">
              <path d="M16 28C16 28 8 20 8 14C8 9 12 4 16 4C20 4 24 9 24 14C24 20 16 28 16 28Z" stroke="hsl(155 42% 18%)" strokeWidth="1.2" />
              <path d="M16 26V10" stroke="hsl(155 42% 18%)" strokeWidth="0.8" />
              <path d="M12 16C12 16 14 13 16 10" stroke="hsl(145 22% 62%)" strokeWidth="0.8" />
              <path d="M20 16C20 16 18 13 16 10" stroke="hsl(145 22% 62%)" strokeWidth="0.8" />
              <ellipse cx="11" cy="14" rx="3" ry="1.5" fill="hsl(145 22% 62% / 0.2)" transform="rotate(-40 11 14)" />
              <ellipse cx="21" cy="14" rx="3" ry="1.5" fill="hsl(145 22% 62% / 0.2)" transform="rotate(40 21 14)" />
            </svg>
          </div>

          <h2 className="font-headline text-[1.7rem] leading-snug sm:text-5xl md:text-6xl font-bold text-foreground sm:leading-tight italic">
            &ldquo;{t("quote.text")}&rdquo;
          </h2>

          {/* Olive leaf divider */}
          <div className="flex justify-center">
            <svg viewBox="0 0 160 20" className="w-36 h-5 opacity-30" fill="none" aria-hidden="true">
              <path d="M0 10 L50 10" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
              <ellipse cx="80" cy="10" rx="20" ry="8" fill="hsl(145 22% 62% / 0.2)" transform="rotate(-10 80 10)" />
              <ellipse cx="80" cy="10" rx="4" ry="10" fill="hsl(95 28% 38% / 0.1)" />
              <path d="M110 10 L160 10" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
            </svg>
          </div>

          <p className="text-lg sm:text-2xl text-primary font-headline tracking-widest uppercase opacity-80">
            {t("quote.reference")}
          </p>

          <div className="pt-4 sm:pt-6">
            <Button
              size="lg"
              className="garden-btn-primary px-8 sm:px-14 h-14 sm:h-20 text-lg sm:text-2xl font-bold rounded-xl w-full sm:w-auto"
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