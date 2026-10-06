"use client";

import { Check, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFcfa, type BillingPeriod, type PlanPricing } from "@/lib/pricing";

/**
 * Carte d'une formule d'abonnement.
 *  - standard    : ivoire, CTA secondaire (Bronze)
 *  - recommended : légèrement surélevée, fond vert pâle, badge doré (Argent)
 *  - exclusive   : filet doré discret, CTA vert forêt (Or)
 */
export type PricingVariant = "standard" | "recommended" | "exclusive";

export interface PricingCardLabels {
  perMonth: string;
  perYear: string;
  /** « soit 4 500 F par mois » */
  perMonthEquivalent?: string;
  /** « Vous économisez 6 000 F par an » */
  savings?: string;
  currency: string;
}

export function PricingCard({
  name, description, pricing, period, features, cta, variant = "standard", badge,
  current = false, currentLabel, loading = false, onSelect, labels, className,
}: {
  name: string;
  description: string;
  pricing: PlanPricing;
  period: BillingPeriod;
  features: string[];
  cta: string;
  variant?: PricingVariant;
  badge?: string;
  current?: boolean;
  currentLabel?: string;
  loading?: boolean;
  onSelect?: () => void;
  labels: PricingCardLabels;
  className?: string;
}) {
  const recommended = variant === "recommended";
  const exclusive = variant === "exclusive";
  const titleId = `plan-${name.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "group relative flex flex-col h-full rounded-[18px] border p-7 sm:p-8",
        "transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none",
        "hover:-translate-y-[3px] motion-reduce:hover:translate-y-0",
        recommended
          ? "border-[#9AB89C] bg-[linear-gradient(180deg,#F9FCF8_0%,#EEF6EE_100%)] shadow-[0_8px_28px_rgba(20,40,30,0.08)] hover:shadow-[0_12px_36px_rgba(20,40,30,0.11)] xl:scale-[1.03] xl:hover:scale-[1.03]"
          : "border-[#E6EAE5] bg-white shadow-[0_4px_20px_rgba(20,40,30,0.05)] hover:shadow-[0_8px_28px_rgba(20,40,30,0.08)]",
        className
      )}
    >
      {/* Filet doré de la formule exclusive */}
      {exclusive && (
        <span aria-hidden="true" className="absolute inset-x-8 top-0 h-[2px] rounded-b-full bg-[linear-gradient(90deg,transparent,#C6A15B,transparent)]" />
      )}

      {badge && (
        <span className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1",
          "text-[11px] font-bold uppercase tracking-[0.08em] shadow-[0_2px_8px_rgba(20,40,30,0.08)]",
          recommended ? "bg-[#C6A15B] text-white" : "bg-white text-[#7A5F27] ring-1 ring-[#C6A15B]/40"
        )}>
          {recommended && <Crown className="w-3 h-3" aria-hidden="true" />}
          {badge}
        </span>
      )}

      {/* Nom + profil */}
      <header>
        <h3 id={titleId} className="flex items-center gap-2 font-headline text-[26px] font-bold leading-none text-[#1C241F]">
          {exclusive && <Crown className="w-5 h-5 text-[#C6A15B]" aria-hidden="true" />}
          {name}
        </h3>
        <p className="mt-2.5 text-[14px] leading-relaxed text-[#5C665F] min-h-[44px]">{description}</p>
      </header>

      {/* Prix */}
      <div className="mt-6 pb-6 border-b border-[#E6EAE5]">
        {pricing.fullYear !== null && (
          <p className="text-[13px] font-medium text-[#6B746E] line-through decoration-[#6B746E]/60">
            {formatFcfa(pricing.fullYear)} {labels.currency}
          </p>
        )}
        <p className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-headline text-[44px] font-bold leading-none tracking-tight text-[#1C241F] tabular-nums">
            {formatFcfa(pricing.amount)}
          </span>
          <span className="text-[14px] font-medium text-[#5C665F]">
            {labels.currency} {period === "annual" ? labels.perYear : labels.perMonth}
          </span>
        </p>
        <div className="mt-2 min-h-[48px]" aria-live="polite">
          {labels.perMonthEquivalent && <p className="text-[13px] text-[#5C665F]">{labels.perMonthEquivalent}</p>}
          {labels.savings && (
            <span className="mt-1.5 inline-flex rounded-md bg-[#3F704D]/10 px-2 py-0.5 text-[12px] font-semibold text-[#2F5A3D]">
              {labels.savings}
            </span>
          )}
        </div>
      </div>

      {/* Avantages */}
      <ul className="mt-6 flex-1 space-y-3.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-[14px] leading-snug text-[#1C241F]">
            <span className={cn("mt-px w-5 h-5 rounded-full flex items-center justify-center shrink-0",
              exclusive ? "bg-[#C6A15B]/15 text-[#8A6A2C]" : "bg-[#3F704D]/10 text-[#2F5A3D]")} aria-hidden="true">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* Action */}
      <button
        type="button"
        onClick={onSelect}
        disabled={current || loading}
        aria-busy={loading || undefined}
        className={cn(
          "mt-8 inline-flex w-full items-center justify-center gap-2 h-12 rounded-xl text-[15px] font-semibold",
          "transition-[background-color,border-color,filter] [transition-duration:180ms] ease-out active:scale-[0.99] motion-reduce:active:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3F704D]/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          recommended && "bg-[#356447] text-white hover:bg-[#294F38]",
          exclusive && "bg-[#1F4D3A] text-white ring-1 ring-inset ring-[#C6A15B]/50 hover:bg-[#183D2E]",
          variant === "standard" && "border border-[#CED8CE] bg-transparent text-[#315940] hover:bg-[#F3F8F2] hover:border-[#9AB89C]"
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          : exclusive ? <Crown className="w-4 h-4 text-[#E3C88F]" aria-hidden="true" /> : null}
        {current ? currentLabel ?? cta : cta}
      </button>
    </article>
  );
}
