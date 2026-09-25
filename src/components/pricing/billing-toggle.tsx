"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { BillingPeriod } from "@/lib/pricing";

/** Bascule Mensuel / Annuel (−10 %) des formules d'abonnement. */
export function BillingToggle({ value, onChange, className }: {
  value: BillingPeriod; onChange: (v: BillingPeriod) => void; className?: string;
}) {
  const { t } = useI18n();
  const options: { v: BillingPeriod; label: string }[] = [
    { v: "monthly", label: t("billing.monthly") },
    { v: "annual", label: t("billing.annual") },
  ];
  return (
    <div role="radiogroup" aria-label={t("billing.toggleLabel")}
      className={cn("inline-flex items-center p-1 rounded-full bg-white border border-[#E8E5E0] shadow-[0_1px_3px_rgba(72,107,70,0.06)]", className)}>
      {options.map(({ v, label }) => {
        const active = value === v;
        return (
          <button key={v} type="button" role="radio" aria-checked={active} onClick={() => onChange(v)}
            className={cn("relative inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#486B46]/40",
              active ? "bg-[#486B46] text-white shadow-sm" : "text-[#56615A] hover:text-[#2F2F2F]")}>
            {label}
            {v === "annual" && (
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-black",
                active ? "bg-white/20 text-white" : "bg-[#FDF6E3] text-[#9B7C15]")}>
                {t("billing.discountBadge")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
