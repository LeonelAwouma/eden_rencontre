"use client";

import { Phone, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DIAL_CODES, dialOfIso, toE164 } from "@/lib/geo";
import { Flag } from "@/components/flag";

/**
 * Numéro de téléphone avec indicatif du pays (ex. 🇨🇲 +237 pour le Cameroun).
 * L'indicatif est prérempli d'après le pays choisi plus tôt, et reste modifiable
 * (un membre peut vivre dans un pays et avoir un numéro d'un autre).
 */
export function PhoneInput({ iso, local, onIso, onLocal }: {
  /** Pays de l'indicatif (code ISO) : plusieurs pays partagent un indicatif (+1, +262…). */
  iso: string;
  local: string;
  onIso: (iso: string) => void;
  onLocal: (local: string) => void;
}) {
  const { t, locale } = useI18n();
  const dial = dialOfIso(iso);
  const valid = !!toE164(dial, local);
  const showError = local.replace(/\D/g, "").length >= 4 && !valid;

  return (
    <div className="space-y-2">
      <Label htmlFor="phone-local" className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("phone.label")}</Label>
      <div className="flex gap-2">
        {/* Drapeau + indicatif visibles ; le menu natif (accessible, pratique sur mobile) est posé par-dessus. */}
        <div className="relative h-14 w-[124px] shrink-0 rounded-xl border border-foreground/10 bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          <span className="pointer-events-none absolute inset-0 flex items-center gap-2 px-3">
            <Flag iso={iso} />
            <span className="text-base font-bold text-foreground">{dial}</span>
            <ChevronDown className="w-4 h-4 text-foreground/30 ml-auto" />
          </span>
          <select
            aria-label={t("phone.dialLabel")}
            value={iso}
            onChange={(e) => onIso(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {DIAL_CODES.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.dial} — {locale === "en" ? d.nameEn : d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 min-w-0">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
          <input
            id="phone-local"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t("phone.placeholder")}
            value={local}
            onChange={(e) => onLocal(e.target.value.replace(/[^\d\s().-]/g, "").slice(0, 20))}
            aria-invalid={showError}
            className={cn(
              "w-full h-14 pl-11 pr-11 rounded-xl border bg-card text-base text-foreground placeholder:text-foreground/20 outline-none focus:ring-2",
              showError ? "border-destructive/50 focus:ring-destructive/20" : "border-foreground/10 focus:border-primary focus:ring-primary/30"
            )}
          />
          {valid && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />}
        </div>
      </div>
      {showError ? (
        <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {t("phone.invalid")}</p>
      ) : (
        <p className="text-[11px] text-foreground/30">{t("phone.hint")}</p>
      )}
    </div>
  );
}
