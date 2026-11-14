"use client";

import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { GardenSection, PageHeader, GardenIllustration } from "@/components/garden";
import { Monogram } from "@/components/ornaments";
import { Button } from "@/components/ui/button";
import { EDEN_SOLID_BUTTON } from "@/components/garden/button-styles";
import { ShieldCheck, HeartHandshake, BookOpenCheck, Server, Megaphone, MessagesSquare, HandHeart, Gem, Sprout } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GOLD_RULE = "block h-px w-14 bg-[#B8975A]/70";

const PILLARS = [
  { icon: ShieldCheck, title: "about.pillar1Title", desc: "about.pillar1Desc" },
  { icon: HeartHandshake, title: "about.pillar2Title", desc: "about.pillar2Desc" },
  { icon: BookOpenCheck, title: "about.pillar3Title", desc: "about.pillar3Desc" },
] as const;

const ROLES = [
  { icon: Server, n: 1 },
  { icon: Megaphone, n: 2 },
  { icon: MessagesSquare, n: 3 },
  { icon: HandHeart, n: 4 },
  { icon: Gem, n: 5 },
  { icon: Sprout, n: 6 },
] as const;

export default function QuiSommesNousPage() {
  const { t } = useI18n();

  const founders = [
    {
      key: "carlos",
      src: "/images/team/carlos-kakaile.webp",
      width: 260,
      height: 359,
      name: t("about.carlosName"),
      role: t("about.carlosRole"),
      sub: t("about.carlosRoleSub"),
      alt: t("about.carlosAlt"),
      bio: [t("about.carlosBio1"), t("about.carlosBio2"), t("about.carlosBio3"), t("about.carlosBio4")],
    },
    {
      key: "anne",
      src: "/images/team/anne-justine-etindele.webp",
      width: 384,
      height: 512,
      name: t("about.anneName"),
      role: t("about.anneRole"),
      sub: t("about.anneRoleSub"),
      alt: t("about.anneAlt"),
      bio: [t("about.anneBio1"), t("about.anneBio2"), t("about.anneBio3"), t("about.anneBio4")],
    },
  ];

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        {/* A — Vision et engagement */}
        <GardenSection variant="garden" className="py-12 sm:py-16 relative overflow-hidden">
          <GardenIllustration
            src="/image_two_garden.webp"
            placement="hero-frame"
            corner="tl"
            opacity={0.5}
            fringe="light"
            width={1448}
            height={1086}
            className="hidden lg:block absolute top-8 left-0 w-80 xl:w-[26rem] z-0"
          />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <PageHeader eyebrow={t("about.eyebrow")} title={t("about.title")} highlight={t("about.titleHighlight")} className="mb-10 sm:mb-14" />

            <div className="max-w-5xl mx-auto grid md:grid-cols-[minmax(0,320px)_1fr] gap-8 md:gap-12 items-center">
              <div className="relative mx-auto w-full max-w-[300px] md:max-w-none">
                <div className="absolute -inset-3 rounded-[2rem] border border-[#B8975A]/40" aria-hidden="true" />
                <Image
                  src="/images/team/fondateurs-garden-of-alliance.webp"
                  alt={t("about.coupleAlt")}
                  width={386}
                  height={512}
                  priority
                  sizes="(min-width: 768px) 320px, 300px"
                  className="relative w-full h-auto rounded-3xl shadow-lg object-cover"
                />
              </div>
              <div className="space-y-4 text-foreground/80 font-body text-base sm:text-lg leading-relaxed text-center md:text-left">
                <p>{t("about.visionP1")}</p>
                <p>{t("about.visionP2")}</p>
                <p>{t("about.visionP3")}</p>
              </div>
            </div>

            <figure className="max-w-3xl mx-auto mt-12 sm:mt-16 eden-leaf-card px-6 py-8 sm:px-10 sm:py-10 text-center">
              <Monogram className="w-9 h-9 text-primary mx-auto mb-4" />
              <blockquote className="font-headline italic text-xl sm:text-2xl leading-snug text-deep-eden">
                « {t("about.quote")} »
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-center gap-3 text-sm font-body text-muted-foreground">
                <span className={GOLD_RULE} aria-hidden="true" />
                {t("about.quoteBy")}
                <span className={GOLD_RULE} aria-hidden="true" />
              </figcaption>
            </figure>
          </div>
        </GardenSection>

        {/* B — Les fondateurs */}
        <GardenSection className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <PageHeader eyebrow={t("about.foundersLabel")} title={t("about.foundersTitle")} className="mb-10 sm:mb-14" />
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-10">
              {founders.map((f) => (
                <article key={f.key} className="eden-leaf-card overflow-hidden flex flex-col">
                  <div className="relative bg-primary/5 flex justify-center pt-8 pb-2 px-6">
                    <Image
                      src={f.src}
                      alt={f.alt}
                      width={f.width}
                      height={f.height}
                      sizes="(min-width: 1024px) 280px, 240px"
                      className="w-56 sm:w-64 h-auto aspect-[3/4] object-cover object-top rounded-2xl shadow-md border border-white"
                    />
                  </div>
                  <div className="p-6 sm:p-8 space-y-4">
                    <header className="text-center space-y-1">
                      <h3 className="font-headline text-2xl sm:text-3xl font-bold text-deep-eden">{f.name}</h3>
                      <p className="text-primary font-semibold font-body">{f.role}</p>
                      <p className="text-sm italic text-muted-foreground font-body">{f.sub}</p>
                      <span className={`${GOLD_RULE} mx-auto mt-3`} aria-hidden="true" />
                    </header>
                    <div className="space-y-3 text-foreground/80 font-body leading-relaxed text-[0.97rem]">
                      {f.bio.map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </GardenSection>

        {/* C — Alliance d'expertises */}
        <GardenSection variant="muted" className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <PageHeader
              eyebrow={t("about.expertiseLabel")}
              title={t("about.expertiseTitle")}
              highlight={t("about.expertiseHighlight")}
              subtitle={t("about.expertiseIntro")}
              className="mb-10 sm:mb-14"
            />
            <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-5 sm:gap-6">
              {PILLARS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="eden-leaf-card p-6 text-center">
                  <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="font-headline text-xl font-bold text-deep-eden mb-2">{t(title)}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{t(desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </GardenSection>

        {/* D — Équipe opérationnelle (fonctions uniquement : pas d'identités non fournies) */}
        <GardenSection className="py-14 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <PageHeader
              eyebrow={t("about.teamLabel")}
              title={t("about.teamTitle")}
              highlight={t("about.teamHighlight")}
              subtitle={t("about.teamIntro")}
              className="mb-10 sm:mb-14"
            />
            <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {ROLES.map(({ icon: Icon, n }) => (
                <div key={n} className="eden-leaf-card p-6 flex flex-col gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-headline text-lg sm:text-xl font-bold text-deep-eden leading-snug">{t(`about.role${n}Title`)}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{t(`about.role${n}Desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </GardenSection>

        {/* E — Conclusion */}
        <GardenSection variant="garden" className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 text-center max-w-3xl space-y-6">
            <Monogram className="w-12 h-12 text-primary mx-auto" />
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-deep-eden tracking-tight">
              {t("about.ctaTitle")}
              <span className="block italic text-primary text-2xl sm:text-3xl mt-2 font-semibold">{t("about.ctaText")}</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild size="lg" className={EDEN_SOLID_BUTTON}>
                <Link href="/parcours">{t("about.ctaJourney")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-deep-eden/30 text-deep-eden hover:bg-deep-eden/5">
                <Link href="/contact">{t("about.ctaContact")}</Link>
              </Button>
            </div>
          </div>
        </GardenSection>
      </main>

      <Footer />
    </div>
  );
}
