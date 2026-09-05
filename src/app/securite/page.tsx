"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, PageHeader, SkyFlock, PerchOrnament } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function SecuritePage() {
  const { t } = useI18n();
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-16 sm:py-24 relative">
          <SkyFlock count={4} className="hidden sm:block absolute top-10 right-[6%] w-32 opacity-[0.12]" />
          <PerchOrnament className="hidden lg:block absolute bottom-14 left-[5%] w-24 opacity-[0.18]" />
          <div className="container mx-auto px-4 sm:px-6">
            <PageHeader
              eyebrow={t("security.eyebrow")}
              title={t("security.title")}
              highlight={t("security.titleHighlight")}
              subtitle={t("security.subtitle")}
              className="mb-14 sm:mb-20"
            />

            <div className="max-w-3xl mx-auto space-y-6">
              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.verificationTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.verificationDesc")}
                </p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.moderationTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.moderationDesc")}
                </p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("security.reportingTitle")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("security.reportingDesc")}
                </p>
              </div>

              <div className="eden-leaf-card p-8">
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