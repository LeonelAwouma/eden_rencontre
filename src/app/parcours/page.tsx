"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Heart, ScrollText, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

export default function ParcoursPage() {
  const { t } = useI18n();

  const steps = [
    {
      title: t("parcours.step1Title"),
      description: t("parcours.step1Desc"),
      icon: <ScrollText className="w-6 h-6 text-accent" />,
      detail: t("parcours.step1Detail")
    },
    {
      title: t("parcours.step2Title"),
      description: t("parcours.step2Desc"),
      icon: <ShieldCheck className="w-6 h-6 text-accent" />,
      detail: t("parcours.step2Detail")
    },
    {
      title: t("parcours.step3Title"),
      description: t("parcours.step3Desc"),
      icon: <Users className="w-6 h-6 text-accent" />,
      detail: t("parcours.step3Detail")
    },
    {
      title: t("parcours.step4Title"),
      description: t("parcours.step4Desc"),
      icon: <Heart className="w-6 h-6 text-accent" />,
      detail: t("parcours.step4Detail")
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 bg-card overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <Image 
              src="https://picsum.photos/seed/eden-parcours/1200/800"
              alt="Background"
              fill
              className="object-cover"
              data-ai-hint="bible wedding"
            />
          </div>
          <div className="container mx-auto px-4 relative z-10 text-center space-y-6">
            <h1 className="font-headline text-5xl md:text-6xl font-bold text-foreground">{t("parcours.heroTitle")}</h1>
            <p className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
              {t("parcours.heroDesc")}
            </p>
          </div>
        </section>

        {/* Steps Grid */}
        <section className="py-24 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="bg-card p-8 rounded-3xl border border-foreground/5 hover:border-accent/20 transition-all shadow-xl space-y-6">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                  {step.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="font-headline text-2xl font-bold text-accent">{step.title}</h3>
                  <p className="text-foreground/80 leading-relaxed">{step.description}</p>
                </div>
                <div className="pt-4 border-t border-foreground/5">
                  <p className="text-sm text-foreground/40 italic flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 bg-accent/5">
          <div className="container mx-auto px-4 text-center space-y-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="font-headline text-4xl font-bold text-foreground">{t("parcours.ctaTitle")}</h2>
              <p className="text-lg text-foreground/60">
                {t("parcours.ctaDesc")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button size="lg" className="bg-accent text-background font-bold px-10 h-14 text-lg" asChild>
                  <Link href="/register">{t("parcours.ctaButton")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent/10 h-14 text-lg" asChild>
                  <Link href="/concept">{t("parcours.ctaLink")}</Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-foreground/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">{t("parcours.anonymousGuarantee")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">{t("parcours.moderation247")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">{t("parcours.seriousCommunity")}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
