"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OliveBirdDivider, SkyFlock } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function ChartePage() {
  const { t } = useI18n();

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-16 sm:py-24 relative">
          <SkyFlock count={4} className="hidden sm:block absolute top-10 right-[7%] w-32 opacity-[0.11]" />
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="eden-eyebrow">{t("legalCharte.eyebrow")}</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {t("legalCharte.title")}<br />
                <span className="italic text-primary">{t("legalCharte.titleHighlight")}</span>
              </h1>
              <OliveBirdDivider className="mx-auto" />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                {t("legalCharte.intro")}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-12">
              {/* AXE I */}
              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-bold text-deep-eden border-b border-sage/20 pb-3">
                  {t("legalCharte.axe1Title")}
                </h2>

                <div className="eden-leaf-card p-8">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.art1Title")}</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">{t("legalCharte.art1Body")}</p>
                </div>

                <div className="eden-leaf-card p-8">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.art2Title")}</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">{t("legalCharte.art2Body")}</p>
                </div>
              </div>

              {/* AXE II */}
              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-bold text-deep-eden border-b border-sage/20 pb-3">
                  {t("legalCharte.axe2Title")}
                </h2>

                <div className="eden-leaf-card p-8">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.art3Title")}</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">{t("legalCharte.art3Body")}</p>
                </div>

                <div className="eden-leaf-card p-8">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.art4Title")}</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">{t("legalCharte.art4Body")}</p>
                </div>
              </div>

              {/* AXE III */}
              <div className="space-y-6">
                <h2 className="font-headline text-2xl font-bold text-deep-eden border-b border-sage/20 pb-3">
                  {t("legalCharte.axe3Title")}
                </h2>

                <div className="eden-leaf-card p-8">
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.art5Title")}</h3>
                  <p className="text-muted-foreground leading-relaxed font-body">{t("legalCharte.art5Body")}</p>
                </div>
              </div>

              {/* Engagement */}
              <div className="eden-leaf-card p-8 border-2 border-sage/45">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.commitmentTitle")}</h3>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-3 list-none">
                  <li className="flex items-start gap-3">
                    <span className="text-sage mt-1">✦</span>
                    <span>{t("legalCharte.commitment1")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sage mt-1">✦</span>
                    <span>{t("legalCharte.commitment2")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-sage mt-1">✦</span>
                    <span>{t("legalCharte.commitment3")}</span>
                  </li>
                </ul>
              </div>

              {/* Sanctions */}
              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCharte.sanctionsTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">
                  {t("legalCharte.sanctionsIntro")}
                </p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>{t("legalCharte.sanctionsItem1")}</li>
                  <li>{t("legalCharte.sanctionsItem2")}</li>
                  <li>{t("legalCharte.sanctionsItem3")}</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed font-body mt-4">
                  {t("legalCharte.sanctionsFooter")}
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
