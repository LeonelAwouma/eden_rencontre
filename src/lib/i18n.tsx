"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
// Le français (langue par défaut et de repli) est embarqué dans le bundle : le
// HTML rendu par le serveur contient ainsi le vrai texte, et non les clés
// (« hero.headline1 »…). Indispensable pour Google, les aperçus WhatsApp /
// Facebook et tous les robots qui n'exécutent pas le JavaScript.
import frMessagesStatic from "@/locales/fr.json";

// ── Supported languages ──
export type Locale = "fr" | "en";
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALES: Locale[] = ["fr", "en"];
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

// ── Translation type (nested dot-notation keys) ──
type NestedMessages = {
  [key: string]: string | NestedMessages;
};

// ── Context shape ──
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Resolve a dot-notation key from a nested object ──
function resolveKey(obj: NestedMessages, key: string): string | undefined {
  const parts = key.split(".");
  let current: NestedMessages | string = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as NestedMessages)[part];
    if (current === undefined) return undefined;
  }
  return typeof current === "string" ? current : undefined;
}

// ── Provider ──
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const frMessages = frMessagesStatic as NestedMessages;
  // Français disponible dès le premier rendu (serveur compris) ; l'anglais est
  // chargé à la demande, le français servant de repli pendant ce temps.
  const [messages, setMessages] = useState<NestedMessages>(frMessages);

  // Load locale messages whenever locale changes
  useEffect(() => {
    if (locale === "fr") {
      setMessages(frMessages);
    } else {
      import(`@/locales/${locale}.json`).then((mod) =>
        setMessages(mod.default)
      );
    }
  }, [locale, frMessages]);

  // Restore saved locale from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("eden-locale") as Locale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("eden-locale", newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  // Translation function with dot-notation keys and variable interpolation
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      // Try current locale first, then fall back to French
      let value = resolveKey(messages, key);
      if (value === undefined && locale !== "fr") {
        value = resolveKey(frMessages, key);
      }
      if (value === undefined) return key; // Return key if not found

      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          value = value!.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return value;
    },
    [messages, frMessages, locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ──
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
