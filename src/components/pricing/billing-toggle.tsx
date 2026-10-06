"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { BillingPeriod } from "@/lib/pricing";

/**
 * Bascule Mensuel / Annuel (−10 %) : contrôle segmenté, l'option active glisse
 * sous un fond vert forêt. Partagé par /tarifs et l'onglet Premium.
 */
export function BillingToggle({ value, onChange, className }: {
  value: BillingPeriod; onChange: (v: BillingPeriod) => void; className?: string;
}) {
  const { t } = useI18n();
  const options: { v: BillingPeriod; label: string }[] = [
    { v: "monthly", label: t("billing.monthly") },
    { v: "annual", label: t("billing.annual") },
  ];
  const annual = value === "annual";

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(annual ? "monthly" : "annual");
    }
  };

  return (
    <div role="radiogroup" aria-label={t("billing.toggleLabel")} onKeyDown={onKeyDown}
      className={cn("relative inline-grid grid-cols-2 h-11 p-1 rounded-xl bg-[#F3F5F2] border border-[#E6EAE5]", className)}>
      {/* Indicateur glissant */}
      <span aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[9px] bg-[#1F4D3A] shadow-[0_2px_8px_rgba(20,40,30,0.18)]",
          "transition-transform [transition-duration:220ms] ease-out motion-reduce:transition-none",
          annual && "translate-x-full"
        )} />
      {options.map(({ v, label }) => {
        const active = value === v;
        return (
          <button key={v} type="button" role="radio" aria-checked={active} tabIndex={active ? 0 : -1} onClick={() => onChange(v)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-2 px-4 sm:px-5 rounded-[9px] text-[14px] font-semibold whitespace-nowrap",
              "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/50 focus-visible:ring-offset-1",
              active ? "text-white" : "text-[#4A564F] hover:text-[#1C241F]"
            )}>
            {label}
            {v === "annual" && (
              <span className={cn("px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-colors duration-200",
                active ? "bg-white/15 text-[#F1E2BF]" : "bg-[#C6A15B]/15 text-[#7A5F27]")}>
                {t("billing.discountBadge")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
