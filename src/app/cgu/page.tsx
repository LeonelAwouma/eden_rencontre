"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OliveBirdDivider, GardenIllustration } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function CGUPage() {
  const { t } = useI18n();

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-16 sm:py-24 relative">
          <GardenIllustration
            src="/image_two_garden.webp"
            placement="corner"
            corner="tr"
            opacity={0.3}
            fringe="light"
            width={1448}
            height={1086}
            className="hidden sm:block absolute top-0 right-0 w-36 lg:w-48 z-0"
          />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="eden-eyebrow">{t("legalCgu.eyebrow")}</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {t("legalCgu.title")} <span className="italic text-primary">{t("legalCgu.titleHighlight")}</span>
              </h1>
              <OliveBirdDivider className="mx-auto" />
              <p className="text-muted-foreground text-lg leading-relaxed font-body">
                {t("legalCgu.lastUpdate")}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s1Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalCgu.s1Body")}</p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s2Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalCgu.s2Body")}</p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s3Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">{t("legalCgu.s3Intro")}</p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>{t("legalCgu.s3Item1")}</li>
                  <li>{t("legalCgu.s3Item2")}</li>
                  <li>{t("legalCgu.s3Item3")}</li>
                  <li>{t("legalCgu.s3Item4")}</li>
                  <li>{t("legalCgu.s3Item5")}</li>
                  <li>{t("legalCgu.s3Item6")}</li>
                </ul>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s4Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body mb-4">{t("legalCgu.s4Intro")}</p>
                <ul className="text-muted-foreground leading-relaxed font-body space-y-2 list-disc list-inside">
                  <li>{t("legalCgu.s4Item1")}</li>
                  <li>{t("legalCgu.s4Item2")}</li>
                  <li>{t("legalCgu.s4Item3")}</li>
                  <li>{t("legalCgu.s4Item4")}</li>
                  <li>{t("legalCgu.s4Item5")}</li>
                  <li>{t("legalCgu.s4Item6")}</li>
                </ul>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s5Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalCgu.s5Body")}</p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s6Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalCgu.s6Body")}</p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s7Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalCgu.s7Body")}</p>
              </div>

              <div className="eden-leaf-card p-8">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalCgu.s8Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalCgu.s8Body")}</p>
              </div>
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}
