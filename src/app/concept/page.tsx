"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, PageHeader, GardenIllustration } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

/** Botanical vine ornament for section dividers */
function VineDivider() {
  return (
    <div className="flex justify-center py-6" aria-hidden="true">
      <svg viewBox="0 0 240 30" fill="none" className="w-48 sm:w-60 h-8 opacity-35">
        <path
          d="M0 15 Q30 5 60 15 Q90 25 120 15 Q150 5 180 15 Q210 25 240 15"
          stroke="hsl(155 42% 18%)"
          strokeWidth="0.8"
        />
        <path
          d="M0 15 Q30 10 60 15 Q90 20 120 15 Q150 10 180 15 Q210 20 240 15"
          stroke="hsl(95 28% 38%)"
          strokeWidth="0.4"
          opacity="0.5"
        />
        {/* Olive leaf accents */}
        <ellipse cx="60" cy="10" rx="5" ry="8" fill="hsl(145 22% 62%)" opacity="0.2" transform="rotate(-30 60 10)" />
        <ellipse cx="120" cy="20" rx="4" ry="7" fill="hsl(145 22% 62%)" opacity="0.18" transform="rotate(25 120 20)" />
        <ellipse cx="180" cy="10" rx="5" ry="8" fill="hsl(145 22% 62%)" opacity="0.2" transform="rotate(-20 180 10)" />
        {/* Center olive */}
        <circle cx="120" cy="15" r="2.5" fill="hsl(95 28% 38%)" opacity="0.2" />
      </svg>
    </div>
  );
}

export default function ConceptPage() {
  const { t } = useI18n();
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero Vision */}
        <GardenSection variant="garden" className="py-20 sm:py-28 relative overflow-hidden">
          <GardenIllustration
            src="/image_three_garden.png"
            placement="corner"
            corner="tr"
            opacity={0.5}
            fringe="light"
            width={1448}
            height={1086}
            className="hidden lg:block absolute top-0 right-0 w-64 xl:w-80 z-0"
          />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <PageHeader
              eyebrow={t("concept.philosophyLabel")}
              title={t("concept.sacredVision")}
              highlight={t("concept.sacredHighlight")}
              subtitle={t("concept.visionDesc")}
            />
          </div>
        </GardenSection>

        <VineDivider />

        {/* Values */}
        <section className="py-20 sm:py-28 container mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative">
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-deep-eden">
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v18M3 12h18M7 7l10 10M17 7L7 17"/></svg>
                  <h3 className="font-headline text-3xl font-bold tracking-tight">{t("concept.ethicsTitle")}</h3>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed pl-12 font-body">
                  {t("concept.ethicsDesc")}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-deep-eden">
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7V12C3 17.5 7.8 22.5 12 24C16.2 22.5 21 17.5 21 12V7L12 2Z"/><path d="M9 12l2 2 4-4"/></svg>
                  <h3 className="font-headline text-3xl font-bold tracking-tight">{t("concept.communityTitle")}</h3>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed pl-12 font-body">
                  Nous luttons activement contre la fraude. Chaque membre est encouragé à vérifier son identité, créant ainsi un climat de confiance mutuelle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-deep-eden">
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <h3 className="font-headline text-3xl font-bold tracking-tight">Valeurs Bibliques</h3>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed pl-12 font-body">
                  Le mariage est une institution sacrée. Nous facilitons les rencontres entre personnes partageant la même vision du foyer, de l'éducation et de la spiritualité.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="relative rounded-2xl overflow-hidden shadow-botanical-lg border border-sage/10 group">
                <img
                  src="/concept.webp"
                  alt="Concept Visual"
                  className="object-contain w-full h-auto transition-transform duration-700 group-hover:scale-105"
                />
                {/* Botanical vignette overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ boxShadow: "inset 0 0 60px 15px hsl(42 35% 97% / 0.3)" }}
                />
                {/* Sage light overlay */}
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-soft-light opacity-20"
                  style={{
                    background: "radial-gradient(ellipse at 60% 40%, hsl(145 22% 62% / 0.2) 0%, transparent 60%)",
                  }}
                />
              </div>

              <div className="relative eden-leaf-card p-10 text-center overflow-hidden">
                {/* Decorative botanical corners */}
                <div className="absolute top-3 left-3 opacity-30 pointer-events-none" aria-hidden="true">
                  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
                    <ellipse cx="12" cy="12" rx="10" ry="5" fill="hsl(145 22% 62% / 0.15)" transform="rotate(-40 12 12)" />
                    <ellipse cx="10" cy="18" rx="7" ry="4" fill="hsl(95 28% 38% / 0.1)" transform="rotate(20 10 18)" />
                  </svg>
                </div>
                <div className="absolute bottom-3 right-3 opacity-30 pointer-events-none" aria-hidden="true">
                  <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
                    <ellipse cx="28" cy="28" rx="10" ry="5" fill="hsl(145 22% 62% / 0.15)" transform="rotate(40 28 28)" />
                    <ellipse cx="30" cy="22" rx="7" ry="4" fill="hsl(95 28% 38% / 0.1)" transform="rotate(-20 30 22)" />
                  </svg>
                </div>

                <div className="relative z-10">
                  {/* Olive branch icon */}
                  <svg viewBox="0 0 32 32" className="w-8 h-8 mx-auto mb-4 opacity-30" fill="none" aria-hidden="true">
                    <path d="M16 28C16 28 8 20 8 14C8 9 12 4 16 4C20 4 24 9 24 14C24 20 16 28 16 28Z" stroke="hsl(155 42% 18%)" strokeWidth="1" />
                    <path d="M16 26V10" stroke="hsl(155 42% 18%)" strokeWidth="0.6" />
                    <ellipse cx="11" cy="14" rx="3" ry="1.5" fill="hsl(145 22% 62% / 0.2)" transform="rotate(-40 11 14)" />
                    <ellipse cx="21" cy="14" rx="3" ry="1.5" fill="hsl(145 22% 62% / 0.2)" transform="rotate(40 21 14)" />
                  </svg>
                  <h4 className="font-headline text-2xl font-bold text-sage mb-4 italic">
                    &ldquo;L'alliance bénie commence par une rencontre vraie.&rdquo;
                  </h4>
                  <p className="text-muted-foreground italic font-body">Fondatrice d'Garden of Alliance</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <VineDivider />

        {/* Security / Anti-Brouteur */}
        <section className="py-20 sm:py-28 eden-undergrowth relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="inline-block p-4 bg-deep-eden/5 rounded-full mb-4 ring-1 ring-deep-eden/8">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-deep-eden" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7V12C3 17.5 7.8 22.5 12 24C16.2 22.5 21 17.5 21 12V7L12 2Z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <h2 className="font-headline text-4xl font-bold text-foreground tracking-tight">
                Sécurité <span className="text-primary italic">{t("concept.securityHighlight")}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="eden-leaf-card p-8 relative overflow-hidden group">
                  <h4 className="text-deep-eden font-headline font-bold text-lg mb-3">{t("concept.moderatedCommTitle")}</h4>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">{t("concept.moderatedCommDesc")}</p>
                  {/* Golden accent line on hover */}
                  <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-sage/0 to-transparent group-hover:via-sage/20 transition-all duration-700" aria-hidden="true" />
                </div>
                <div className="eden-leaf-card p-8 relative overflow-hidden group">
                  <h4 className="text-deep-eden font-headline font-bold text-lg mb-3">{t("concept.realtimeVerificationTitle")}</h4>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">{t("concept.realtimeVerificationDesc")}</p>
                  <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-sage/0 to-transparent group-hover:via-sage/20 transition-all duration-700" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}