"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { SocialLogo } from "@/components/social-logo";
import { SOCIAL_LINKS } from "@/lib/contact";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative bg-background border-t border-sage/20 py-16 overflow-hidden">
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
                Garden <span>of Alliance</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed font-body">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              {([
                ["instagram", "Instagram", SOCIAL_LINKS.instagram],
                ["facebook", "Facebook", SOCIAL_LINKS.facebook],
                ["tiktok", "TikTok", SOCIAL_LINKS.tiktok],
                ["whatsapp", "WhatsApp", SOCIAL_LINKS.whatsapp],
              ] as const).map(([logo, label, href]) => (
                <a key={logo} href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center hover:bg-deep-eden/10 hover:scale-110 transition-all" aria-label={label}>
                  <SocialLogo name={logo} className="w-4 h-4" />
                </a>
              ))}
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
            {t("footer.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}