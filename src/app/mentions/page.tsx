"use client";

import { Fragment } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, OrganicSeparator } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function MentionsPage() {
  const { t } = useI18n();
  const s1Lines = t("legalMentions.s1Body").split("{br}");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <GardenSection variant="garden" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.3em] text-deep-eden/50">{t("legalMentions.eyebrow")}</span>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {t("legalMentions.title")} <span className="italic text-primary">{t("legalMentions.titleHighlight")}</span>
              </h1>
              <OrganicSeparator />
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalMentions.s1Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {s1Lines.map((line, i) => (
                    <Fragment key={i}>
                      {line}
                      {i < s1Lines.length - 1 && <br />}
                    </Fragment>
                  ))}
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalMentions.s2Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalMentions.s2Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalMentions.s3Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalMentions.s3Body")}</p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalMentions.s4Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">
                  {t("legalMentions.s4Body")} <a href="/confidentialite" className="text-primary hover:text-deep-eden transition-colors underline">{t("legalMentions.s4Link")}</a>.
                </p>
              </div>

              <div className="garden-card p-8 rounded-2xl">
                <h3 className="font-headline text-xl font-bold text-deep-eden mb-4">{t("legalMentions.s5Title")}</h3>
                <p className="text-muted-foreground leading-relaxed font-body">{t("legalMentions.s5Body")}</p>
              </div>
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}
