"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function ContactPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">{t("contact.eyebrow")}</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {t("contact.title")} <span className="italic text-primary">{t("contact.titleHighlight")}</span>
              </h1>
              <OrganicSeparator />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                {t("contact.subtitle")}
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl text-center">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("contact.emailTitle")}</h3>
                <p className="text-muted-foreground font-body mb-4">{t("contact.emailDesc")}</p>
                <a href="mailto:support@edenconnexion.com" className="text-primary font-headline text-xl font-bold hover:text-deep-eden transition-colors">
                  support@edenconnexion.com
                </a>
                <p className="text-muted-foreground text-sm font-body mt-3">{t("contact.emailResponseTime")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="garden-card p-6 rounded-2xl text-center">
                  <h3 className="font-headline text-lg font-bold text-deep-eden mb-3">{t("contact.reportTitle")}</h3>
                  <p className="text-muted-foreground text-sm font-body">{t("contact.reportDesc")}</p>
                </div>
                <div className="garden-card p-6 rounded-2xl text-center">
                  <h3 className="font-headline text-lg font-bold text-deep-eden mb-3">{t("contact.partnershipTitle")}</h3>
                  <p className="text-muted-foreground text-sm font-body">{t("contact.partnershipDesc")}</p>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-muted-foreground text-sm font-body">
                  {t("contact.faqLink")} <a href="/faq" className="text-primary hover:text-deep-eden transition-colors underline">{t("contact.faqLinkText")}</a> {t("contact.faqLinkSuffix")}
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