"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function ConfidentialitePage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">{t("legalConfidentialite.eyebrow")}</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {t("legalConfidentialite.title")} <span className="italic text-primary">{t("legalConfidentialite.titleHighlight")}</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                {t("legalConfidentialite.lastUpdate")}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s1Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalConfidentialite.s1Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s2Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalConfidentialite.s2Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s3Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalConfidentialite.s3Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s4Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalConfidentialite.s4Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s5Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">{t("legalConfidentialite.s5Intro")}</p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li><strong>{t("legalConfidentialite.s5Item1Strong")}</strong> {t("legalConfidentialite.s5Item1")}</li>
                  <li><strong>{t("legalConfidentialite.s5Item2Strong")}</strong> {t("legalConfidentialite.s5Item2")}</li>
                  <li><strong>{t("legalConfidentialite.s5Item3Strong")}</strong> {t("legalConfidentialite.s5Item3")}</li>
                  <li><strong>{t("legalConfidentialite.s5Item4Strong")}</strong> {t("legalConfidentialite.s5Item4")}</li>
                  <li><strong>{t("legalConfidentialite.s5Item5Strong")}</strong> {t("legalConfidentialite.s5Item5")}</li>
                  <li><strong>{t("legalConfidentialite.s5Item6Strong")}</strong> {t("legalConfidentialite.s5Item6")}</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed font-body mt-4">
                  {t("legalConfidentialite.s5Contact")} <a href="mailto:privacy@edenconnexion.com" className="text-primary hover:text-deep-eden transition-colors underline">privacy@edenconnexion.com</a>
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s6Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalConfidentialite.s6Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s7Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalConfidentialite.s7Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalConfidentialite.s8Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("legalConfidentialite.s8Body")} <a href="mailto:privacy@edenconnexion.com" className="text-primary hover:text-deep-eden transition-colors underline">privacy@edenconnexion.com</a>
                </p>
              </div>
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}
