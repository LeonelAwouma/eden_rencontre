"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SocialLogo } from "@/components/social-logo";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_E164, SUPPORT_WHATSAPP_URL } from "@/lib/contact";
import { useI18n } from "@/lib/i18n";

// Menu flottant d'assistance affiché pendant l'inscription.
export function SupportFloat() {
  const { locale } = useI18n();
  const fr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);

  // Une bulle discrète apparaît après quelques secondes pour attirer l'attention.
  useEffect(() => {
    const show = setTimeout(() => setTeaser(true), 4000);
    const hide = setTimeout(() => setTeaser(false), 14000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  const message = fr
    ? "Pour toute assistance, n'hésitez pas à nous écrire ou nous contacter au"
    : "For any assistance, feel free to write to us or contact us on";
  const waText = encodeURIComponent(fr ? "Bonjour, j'ai besoin d'aide pour mon inscription sur Garden of Alliance." : "Hello, I need help with my registration on Garden of Alliance.");

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)]">
      {(open || teaser) && (
        <div className="relative w-72 rounded-2xl border border-sage/30 bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            onClick={() => { setOpen(false); setTeaser(false); }}
            aria-label={fr ? "Fermer" : "Close"}
            className="absolute top-2 right-2 text-foreground/40 hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="pr-5 text-sm leading-relaxed text-foreground/80">
            {message}{" "}
            <a href={`tel:${SUPPORT_PHONE_E164}`} className="font-semibold text-primary whitespace-nowrap hover:underline">{SUPPORT_PHONE_DISPLAY}</a>
          </p>
          <a
            href={`${SUPPORT_WHATSAPP_URL}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <SocialLogo name="whatsapp" className="w-5 h-5" />
            {fr ? "Écrire sur WhatsApp" : "Write on WhatsApp"}
          </a>
        </div>
      )}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setTeaser(false); }}
        aria-label={fr ? "Besoin d'aide ? Contacter l'assistance" : "Need help? Contact support"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-sage/30 hover:scale-105 transition-transform"
      >
        <SocialLogo name="whatsapp" className="w-8 h-8" />
      </button>
    </div>
  );
}
