
"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Quote,
  Lightbulb,
  Heart,
  ChevronRight,
  Scale,
  Compass,
  ShieldCheck,
  Eye,
  Users,
  HandHeart
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function CriteresEssentielsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const items = [
    { title: t("criteresEssentiels.item1Title"), content: t("criteresEssentiels.item1Content"), icon: Compass, details: t("criteresEssentiels.item1Details") },
    { title: t("criteresEssentiels.item2Title"), content: t("criteresEssentiels.item2Content"), icon: ShieldCheck, details: t("criteresEssentiels.item2Details") },
    { title: t("criteresEssentiels.item3Title"), content: t("criteresEssentiels.item3Content"), icon: Eye, details: t("criteresEssentiels.item3Details") },
    { title: t("criteresEssentiels.item4Title"), content: t("criteresEssentiels.item4Content"), icon: Heart, details: t("criteresEssentiels.item4Details") },
    { title: t("criteresEssentiels.item5Title"), content: t("criteresEssentiels.item5Content"), icon: Users, details: t("criteresEssentiels.item5Details") },
    { title: t("criteresEssentiels.item6Title"), content: t("criteresEssentiels.item6Content"), icon: HandHeart, details: t("criteresEssentiels.item6Details") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card border-b border-secondary/15 px-6 h-20 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Monogram className="w-9 h-8 text-primary shrink-0" />
          <span className="font-headline text-2xl font-bold text-foreground">Garden <span>of Alliance</span></span>
        </Link>
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground gap-2 hover:bg-foreground/5 hover:text-secondary">
          <ArrowLeft className="w-4 h-4" /> {t("criteresEssentiels.backToDashboard")}
        </Button>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl space-y-16">
        {/* Header Section */}
        <section className="text-center space-y-6">
          <div className="flex justify-center mb-4">
             <Badge className="bg-secondary/10 text-secondary border-none font-bold px-6 py-1.5 uppercase tracking-[0.2em] text-[10px] rounded-full">
               {t("criteresEssentiels.badge")}
             </Badge>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground leading-tight">
            {t("criteresEssentiels.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("criteresEssentiels.subtitle")}
          </p>
        </section>

        {/* Intro Card - Premium Dark */}
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-muted text-foreground">
          <CardContent className="p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-secondary">
                <Scale className="w-6 h-6" />
                <h2 className="text-2xl font-bold">{t("criteresEssentiels.introTitle")}</h2>
              </div>
              <p className="text-foreground/75 leading-relaxed text-lg">
                {t("criteresEssentiels.introBody")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Criteria Grid */}
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-8">
            {items.map((item, i) => (
              <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card hover:shadow-md transition-all">
                <div className="p-8 flex gap-6">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-secondary shrink-0">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-2xl text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: item.content.replace(/\*\*(.*?)\*\*/g, '<span class="text-foreground font-bold">$1</span>') }} />
                    <div className="bg-foreground/5 p-4 rounded-xl flex items-center gap-3">
                      <Lightbulb className="w-4 h-4 text-secondary" />
                      <p className="text-xs font-medium text-foreground/70 italic">{item.details}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Conclusion Card */}
        <Card className="border-none bg-secondary/10 rounded-2xl p-12 space-y-6">
          <div className="flex items-center gap-3 text-secondary mb-4">
            <Quote className="w-6 h-6" />
            <h3 className="text-xl font-bold uppercase tracking-widest">{t("criteresEssentiels.adviceLabel")}</h3>
          </div>
          <p className="text-xl text-foreground/80 leading-relaxed">
            {t("criteresEssentiels.adviceBody")}
          </p>
        </Card>

        {/* Final Prayer Card */}
        <Card className="border-none bg-card text-foreground rounded-2xl p-16 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full -ml-24 -mb-24" />

          <div className="space-y-6 relative z-10">
            <Badge className="bg-secondary/15 text-secondary border-none px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
              {t("criteresEssentiels.prayerBadge")}
            </Badge>
            <p className="text-2xl md:text-3xl font-headline italic leading-relaxed text-foreground">
              {t("criteresEssentiels.prayerText")}
            </p>
          </div>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center pt-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/academie')}
            className="border-secondary/20 text-muted-foreground hover:text-secondary hover:bg-foreground/5 rounded-2xl h-16 px-12 gap-3 transition-all font-bold text-lg"
          >
            {t("criteresEssentiels.finishReading")} <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
