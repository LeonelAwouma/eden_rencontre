"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const navLinks = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.concept"), href: "/concept" },
    { name: t("nav.parcours"), href: "/parcours" },
    { name: t("nav.blog"), href: "/blog" },
    { name: t("nav.testimonials"), href: "/temoignages" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full garden-nav">
      {/* ── Desktop header ── */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-6 xl:px-10 h-20 xl:h-24 flex items-center">
          {/* Three-column layout: logo | centered nav | actions */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <Monogram className="w-11 h-11 xl:w-12 xl:h-12 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
            <span className="font-headline text-2xl xl:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
              Eden <span>Connexion</span>
            </span>
          </Link>

          {/* Center nav — grows to fill available space, items centered */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-6 xl:gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[11px] xl:text-xs font-black tracking-[0.18em] xl:tracking-[0.2em] uppercase text-foreground/60 hover:text-primary transition-all duration-300 relative group/link whitespace-nowrap"
                >
                  {link.name}
                  <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover/link:w-full" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right actions — pinned to the right edge */}
          <div className="flex items-center shrink-0">
            {/* Divider */}
            <div className="w-px h-6 bg-foreground/10 mx-4 xl:mx-5" aria-hidden="true" />

            <div className="flex items-center gap-3 xl:gap-4">
              <LanguageSwitcher />
              <Button variant="ghost" asChild className="text-foreground hover:text-primary font-bold text-sm tracking-wide transition-colors px-3 xl:px-4">
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button className="garden-btn-primary font-black px-6 xl:px-8 h-10 xl:h-12 rounded-xl text-xs xl:text-sm tracking-tight group" asChild>
                <Link href="/login" className="flex items-center justify-center">
                  {t("nav.start")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <Monogram className="w-8 h-8 sm:w-10 sm:h-10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
            <span className="font-headline text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
              Eden <span>Connexion</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <button
              className="text-foreground p-1.5 sm:p-2 hover:bg-foreground/5 rounded-full transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="w-6 h-6 sm:w-7 sm:h-7" /> : <Menu className="w-6 h-6 sm:w-7 sm:h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 top-16 sm:top-20 bg-card border-b border-foreground/10 transition-all duration-500 ease-in-out z-40 overflow-hidden",
          isOpen ? "max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] opacity-100 py-8 sm:py-10 shadow-2xl overflow-y-auto" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col items-center gap-6 sm:gap-8 px-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-xl sm:text-2xl font-headline font-bold text-foreground/80 hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <div className="w-full space-y-3 sm:space-y-4 pt-6 sm:pt-8 border-t border-foreground/5">
            <Button variant="outline" className="w-full border-primary text-primary h-12 sm:h-14 text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl" asChild>
              <Link href="/login" onClick={() => setIsOpen(false)}>{t("nav.signIn")}</Link>
            </Button>
            <Button className="w-full garden-btn-primary h-12 sm:h-14 text-sm sm:text-base font-black rounded-xl sm:rounded-2xl" asChild>
              <Link href="/login" onClick={() => setIsOpen(false)}>{t("nav.startStory")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}