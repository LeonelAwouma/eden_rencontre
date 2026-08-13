"use client";

import { useI18n, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all text-xs font-semibold uppercase tracking-wider"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-card border border-foreground/10 rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                locale === loc
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <span>{LOCALE_LABELS[loc]}</span>
              {locale === loc && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}