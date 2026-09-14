"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Heart, ScrollText, ShieldCheck, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { PageHeader, OliveBirdDivider, GardenIllustration } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function ParcoursPage() {
  const { t } = useI18n();
  const reduced = useReducedMotion();

  const steps = [
    {
      title: t("parcours.step1Title"),
      description: t("parcours.step1Desc"),
      icon: ScrollText,
      detail: t("parcours.step1Detail"),
    },
    {
      title: t("parcours.step2Title"),
      description: t("parcours.step2Desc"),
      icon: ShieldCheck,
      detail: t("parcours.step2Detail"),
    },
    {
      title: t("parcours.step3Title"),
      description: t("parcours.step3Desc"),
      icon: Users,
      detail: t("parcours.step3Detail"),
    },
    {
      title: t("parcours.step4Title"),
      description: t("parcours.step4Desc"),
      icon: Heart,
      detail: t("parcours.step4Detail"),
    },
  ];

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        {/* ═══ Hero ═══ */}
        <section className="relative py-20 sm:py-28 overflow-hidden">
          {/* Halo chaud derrière l'ouverture de l'arche — se lit comme la lumière du portail */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 45% 55% at 50% 42%, hsl(45 55% 88% / 0.55) 0%, transparent 65%)",
            }}
          />

          <div className="container mx-auto px-4 sm:px-6 relative z-20">
            <PageHeader
              eyebrow={t("parcours.heroEyebrow")}
              title={t("parcours.heroTitle")}
              subtitle={t("parcours.heroDesc")}
            />

            <GardenIllustration
              src="/image_three_garden.png"
              placement="hero-frame"
              opacity={0.9}
              fringe="none"
              shadow
              width={1448}
              height={1086}
              className="w-[90vw] sm:w-[70vw] lg:w-[900px] mx-auto mt-10 sm:mt-14"
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 eden-hairline z-20" aria-hidden="true" />
        </section>

        {/* ═══ Le chemin : les étapes reliées par une liane ═══ */}
        <section className="relative py-20 sm:py-28 overflow-hidden">

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <ol className="relative max-w-3xl mx-auto">
              {/* La liane qui relie les étapes, du premier au dernier repère */}
              <div
                className="absolute left-[27px] sm:left-[35px] top-10 bottom-10 w-px hidden sm:block"
                aria-hidden="true"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(145 22% 62% / 0) 0%, hsl(145 22% 62% / 0.45) 12%, hsl(145 22% 62% / 0.45) 88%, hsl(145 22% 62% / 0) 100%)",
                }}
              />

              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.li
                    key={step.title}
                    initial={reduced ? false : { opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="relative flex gap-5 sm:gap-8 pb-10 sm:pb-14 last:pb-0"
                  >
                    {/* Repère sur la liane */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 sm:w-[70px] sm:h-[70px] rounded-full bg-card border border-sage/35 flex items-center justify-center shadow-[0_6px_20px_-10px_hsl(155_30%_20%_/_0.25)]">
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" strokeWidth={1.5} />
                      </div>
                      <span
                        className="absolute -top-1 -left-1 eden-step-index text-[1.6rem] sm:text-[2rem] select-none"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                    </div>

                    {/* Contenu */}
                    <div className="eden-leaf-card flex-1 p-6 sm:p-8 space-y-3.5">
                      <h3 className="font-headline text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed font-body">{step.description}</p>
                      <p className="flex items-start gap-2.5 text-sm text-primary/85 font-body pt-3 border-t border-sage/20">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.6} />
                        <span className="italic">{step.detail}</span>
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ═══ Appel à l'action ═══ */}
        <section className="relative py-20 sm:py-28 eden-undergrowth overflow-hidden">
          <div className="absolute top-0 left-0 right-0 eden-hairline" aria-hidden="true" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl mx-auto text-center space-y-6"
            >
              <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                {t("parcours.ctaTitle")}
              </h2>
              <OliveBirdDivider className="mx-auto" />
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-body max-w-2xl mx-auto">
                {t("parcours.ctaDesc")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
                <Button size="lg" className="garden-btn-primary px-9 h-13 sm:h-14 text-base font-semibold rounded-xl" asChild>
                  <Link href="/register">{t("parcours.ctaButton")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="eden-btn-ghost px-9 h-13 sm:h-14 text-base font-semibold rounded-xl" asChild>
                  <Link href="/concept">{t("parcours.ctaLink")}</Link>
                </Button>
              </div>

              <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 pt-8 text-muted-foreground">
                {[t("parcours.anonymousGuarantee"), t("parcours.moderation247"), t("parcours.seriousCommunity")].map((label) => (
                  <li key={label} className="flex items-center gap-2 text-sm font-body">
                    <CheckCircle2 className="w-4 h-4 text-primary/70" strokeWidth={1.6} />
                    {label}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
