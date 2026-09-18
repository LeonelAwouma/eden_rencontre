"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, PageHeader, GardenIllustration } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function ContactPage() {
  const { t } = useI18n();
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-12 sm:py-16 relative">
          <GardenIllustration
            src="/image_two_garden.webp"
            placement="hero-frame"
            corner="tl"
            opacity={0.6}
            fringe="light"
            width={1448}
            height={1086}
            className="hidden md:block absolute top-8 left-0 w-72 lg:w-96 xl:w-[28rem] z-0"
          />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <PageHeader
              eyebrow={t("contact.eyebrow")}
              title={t("contact.title")}
              highlight={t("contact.titleHighlight")}
              subtitle={t("contact.subtitle")}
              className="mb-14 sm:mb-20"
            />

            <div className="max-w-2xl mx-auto space-y-8">
              <div className="eden-leaf-card p-8 text-center">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("contact.emailTitle")}</h3>
                <p className="text-muted-foreground font-body mb-4">{t("contact.emailDesc")}</p>
                <a href="mailto:support@gardenofalliance.com" className="text-primary font-headline text-xl font-bold hover:text-deep-eden transition-colors">
                  support@gardenofalliance.com
                </a>
                <p className="text-muted-foreground text-sm font-body mt-3">{t("contact.emailResponseTime")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="eden-leaf-card p-6 text-center">
                  <h3 className="font-headline text-lg font-bold text-deep-eden mb-3">{t("contact.reportTitle")}</h3>
                  <p className="text-muted-foreground text-sm font-body">{t("contact.reportDesc")}</p>
                </div>
                <div className="eden-leaf-card p-6 text-center">
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