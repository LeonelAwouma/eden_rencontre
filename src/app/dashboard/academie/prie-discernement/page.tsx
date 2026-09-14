
"use client";

import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  BookOpen,
  Quote,
  CheckCircle2,
  Lightbulb,
  Church,
  Calendar,
  ChevronRight,
  Flame,
  Scale
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

export default function DiscernementPage() {
  const router = useRouter();
  const { t } = useI18n();

  const whenItems = [
    t("prieDiscernement.when1"),
    t("prieDiscernement.when2"),
    t("prieDiscernement.when3"),
    t("prieDiscernement.when4"),
  ];

  const steps = [
    { step: "01", title: t("prieDiscernement.step1Title"), content: t("prieDiscernement.step1Content"), icon: Flame },
    { step: "02", title: t("prieDiscernement.step2Title"), content: t("prieDiscernement.step2Content"), icon: BookOpen },
    { step: "03", title: t("prieDiscernement.step3Title"), content: t("prieDiscernement.step3Content"), icon: Church },
    { step: "04", title: t("prieDiscernement.step4Title"), content: t("prieDiscernement.step4Content"), icon: CheckCircle2 },
  ];

  const rows = [
    { pos: t("prieDiscernement.row1Pos"), neg: t("prieDiscernement.row1Neg") },
    { pos: t("prieDiscernement.row2Pos"), neg: t("prieDiscernement.row2Neg") },
    { pos: t("prieDiscernement.row3Pos"), neg: t("prieDiscernement.row3Neg") },
    { pos: t("prieDiscernement.row4Pos"), neg: t("prieDiscernement.row4Neg") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card border-b border-secondary/15 px-6 h-20 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Monogram className="w-9 h-8 text-primary shrink-0" />
          <span className="font-headline text-2xl font-bold text-foreground">Garden <span>of Alliance</span></span>
        </Link>
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground gap-2 hover:bg-foreground/5 hover:text-secondary">
          <ArrowLeft className="w-4 h-4" /> {t("prieDiscernement.backToDashboard")}
        </Button>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl space-y-16">
        {/* Header Section */}
        <section className="text-center space-y-6">
          <div className="flex justify-center mb-4">
             <Badge className="bg-secondary/10 text-secondary border-none font-bold px-6 py-1.5 uppercase tracking-[0.2em] text-[10px] rounded-full">
               {t("prieDiscernement.badge")}
             </Badge>
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground leading-tight">
            {t("prieDiscernement.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("prieDiscernement.subtitle")}
          </p>
        </section>

        {/* Intro Card - Premium Dark */}
        <Card className="border-none shadow-2xl rounded-2xl overflow-hidden bg-muted text-foreground">
          <CardContent className="p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-secondary">
                <Flame className="w-6 h-6" />
                <h2 className="text-2xl font-bold">{t("prieDiscernement.introTitle")}</h2>
              </div>
              <p className="text-foreground/75 leading-relaxed text-lg">
                {t("prieDiscernement.introBodyPre")}<span className="text-foreground font-bold">{t("prieDiscernement.introBodyStrong")}</span>{t("prieDiscernement.introBodyPost")}
              </p>
            </div>

            <div className="bg-foreground/5 border-l-4 border-secondary p-8 rounded-r-3xl italic text-foreground/85 relative">
              <Quote className="absolute top-4 right-4 w-12 h-12 text-secondary/10" />
              <p className="text-2xl font-headline leading-relaxed">
                "{t("prieDiscernement.quote1")}"
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="h-px bg-primary w-8" />
                <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("prieDiscernement.quote1Ref")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* When Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl rounded-2xl bg-card p-8">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-4">{t("prieDiscernement.whenTitle")}</h3>
            <ul className="space-y-4">
              {whenItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-muted-foreground text-sm">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" /> {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-none shadow-xl rounded-2xl bg-muted p-8 text-foreground">
            <div className="w-12 h-12 bg-foreground/5 rounded-2xl flex items-center justify-center mb-6">
              <Lightbulb className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-4">{t("prieDiscernement.peaceTitle")}</h3>
            <p className="text-foreground/60 text-sm leading-relaxed mb-6">
              {t("prieDiscernement.peaceBody")}
            </p>
            <Separator className="bg-foreground/5 mb-6" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{t("prieDiscernement.peaceAdvice")}</p>
          </Card>
        </div>

        {/* Practical Steps */}
        <div className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-headline font-bold text-foreground">{t("prieDiscernement.stepsTitle")}</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {steps.map((item) => (
              <Card key={item.step} className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all bg-card">
                <div className="flex">
                  <div className="w-24 bg-muted flex items-center justify-center text-secondary text-3xl font-black shrink-0">
                    {item.step}
                  </div>
                  <div className="p-8 space-y-3">
                    <h3 className="font-bold text-xl text-foreground flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-secondary" /> {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{item.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-headline font-bold text-foreground">{t("prieDiscernement.tableTitle")}</h2>
            <p className="text-muted-foreground">{t("prieDiscernement.tableSubtitle")}</p>
          </div>
          <div className="bg-muted rounded-2xl overflow-hidden shadow-2xl border-none">
            <Table>
              <TableHeader className="bg-foreground/5">
                <TableRow className="border-foreground/5 hover:bg-transparent">
                  <TableHead className="font-bold text-secondary h-16 px-10">{t("prieDiscernement.tableHeadPos")}</TableHead>
                  <TableHead className="font-bold text-secondary h-16 px-10">{t("prieDiscernement.tableHeadNeg")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i} className="border-foreground/5 hover:bg-foreground/5">
                    <TableCell className="px-10 py-6 text-foreground/85 font-medium">{row.pos}</TableCell>
                    <TableCell className="px-10 py-6 text-foreground/60 italic">{row.neg}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Final Prayer Card */}
        <Card className="border-none bg-card text-foreground rounded-2xl p-16 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full -ml-24 -mb-24" />

          <div className="space-y-6 relative z-10">
            <Badge className="bg-secondary/15 text-secondary border-none px-6 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
              {t("prieDiscernement.finalPrayerBadge")}
            </Badge>
            <p className="text-3xl md:text-4xl font-headline italic leading-relaxed text-foreground">
              {t("prieDiscernement.finalPrayerText")}
            </p>
          </div>

          <Separator className="bg-foreground/10" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-center gap-2 text-secondary">
              <Scale className="w-5 h-5" />
              <h4 className="font-bold uppercase tracking-[0.2em] text-xs">{t("prieDiscernement.finalWordTitle")}</h4>
            </div>
            <p className="text-foreground/60 text-sm max-w-xl mx-auto leading-relaxed" dangerouslySetInnerHTML={{ __html: t("prieDiscernement.finalWordBody").replace(/\*\*(.*?)\*\*/g, '<span class="text-foreground font-bold">$1</span>') }} />
          </div>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center pt-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/academie')}
            className="border-secondary/20 text-muted-foreground hover:text-secondary hover:bg-foreground/5 rounded-2xl h-16 px-12 gap-3 transition-all font-bold text-lg"
          >
            {t("prieDiscernement.finishReading")} <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
