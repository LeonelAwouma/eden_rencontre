"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function SecuritePage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">{t("security.eyebrow")}</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {t("security.title")} <span className="italic text-primary">{t("security.titleHighlight")}</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                {t("security.subtitle")}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-10">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.verificationTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.verificationDesc")}
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.moderationTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.moderationDesc")}
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.reportingTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.reportingDesc")}
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.dataProtectionTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.dataProtectionDesc")}
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