"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Monogram } from "@/components/ornaments";
import { SkyFlock, PerchOrnament } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative bg-background border-t border-sage/20 py-16 overflow-hidden">
      {/* Le jardin salue une derniere fois : une nuee, un oiseau pose */}
      <SkyFlock count={4} className="hidden sm:block absolute top-8 right-[8%] w-32 lg:w-40 opacity-[0.11]" />
      <PerchOrnament className="hidden lg:block absolute bottom-10 left-[3%] w-24 opacity-[0.14]" />
      {/* Subtle botanical background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 110 Q55 80 60 50 Q65 30 60 10' stroke='hsl(155 42%25 18%25)' stroke-width='0.4' fill='none'/%3E%3Cellipse cx='50' cy='40' rx='10' ry='5' fill='hsl(145 22%25 62%25)' opacity='0.3' transform='rotate(-30 50 40)'/%3E%3Cellipse cx='72' cy='70' rx='8' ry='4' fill='hsl(95 28%25 38%25)' opacity='0.2' transform='rotate(25 72 70)'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 120px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <Monogram className="w-8 h-8 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
              <span className="font-headline text-xl font-bold text-foreground group-hover:text-deep-eden transition-colors">
                Eden <span>Connexion</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed font-body">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              {/* Botanical-style social icons */}
              <Link href="#" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center text-foreground/50 hover:text-deep-eden hover:bg-deep-eden/10 transition-all" aria-label="Instagram">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1"/></svg>
              </Link>
              <Link href="#" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center text-foreground/50 hover:text-deep-eden hover:bg-deep-eden/10 transition-all" aria-label="Facebook">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </Link>
              <Link href="#" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center text-foreground/50 hover:text-deep-eden hover:bg-deep-eden/10 transition-all" aria-label="Twitter">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6 text-base">{t("footer.platform")}</h4>
            <ul className="space-y-3.5 text-sm text-muted-foreground font-body">
              <li><Link href="/concept" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.theConcept")}</Link></li>
              <li><Link href="/parcours" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.faithJourney")}</Link></li>
              <li><Link href="/tarifs" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.pricing")}</Link></li>
              <li><Link href="/temoignages" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.testimonials")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6 text-base">{t("footer.support")}</h4>
            <ul className="space-y-3.5 text-sm text-muted-foreground font-body">
              <li><Link href="/faq" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.faq")}</Link></li>
              <li><Link href="/contact" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.contact")}</Link></li>
              <li><Link href="/securite" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.securityTrust")}</Link></li>
              <li><Link href="/blog" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.edificationBlog")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6 text-base">{t("footer.legal")}</h4>
            <ul className="space-y-3.5 text-sm text-muted-foreground font-body">
              <li><Link href="/mentions" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.legalNotice")}</Link></li>
              <li><Link href="/confidentialite" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link href="/cgu" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.terms")}</Link></li>
              <li><Link href="/charte" className="growing-underline hover:text-deep-eden transition-colors">{t("footer.ethicalChart")}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with botanical divider */}
        <div className="mt-16 pt-8 border-t border-sage/25 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-xs font-body">
            {t("footer.copyright", { year: String(year ?? "...") })}
          </p>
          <p className="text-muted-foreground text-xs flex items-center gap-1.5 font-body">
            {t("footer.madeWith", { heart: "❤", leaf: "🌿" })}
          </p>
        </div>
      </div>
    </footer>
  );
}