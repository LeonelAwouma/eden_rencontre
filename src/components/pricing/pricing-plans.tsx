"use client";

import { useState, type ReactNode } from "react";
import { Crown, Lock, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { BillingToggle } from "./billing-toggle";
import { PricingCard, type PricingVariant } from "./pricing-card";
import { planPricing, formatFcfa, type BillingPeriod, type PlanId } from "@/lib/pricing";

/**
 * Bloc tarifaire commun à la page publique /tarifs et à l'onglet Premium de
 * l'espace membre : mêmes formules, mêmes prix (src/lib/pricing.ts), même rendu.
 */

const PLANS: {
  id: PlanId;
  variant: PricingVariant;
  withBadge?: boolean;
  featureCount: number;
  /** Mobile : la formule recommandée d'abord (Argent, Or, Bronze). */
  order: string;
  className?: string;
}[] = [
  { id: "bronze", variant: "standard", featureCount: 3, order: "order-3 md:order-1" },
  { id: "argent", variant: "recommended", withBadge: true, featureCount: 3, order: "order-1 md:order-2" },
  {
    id: "or", variant: "exclusive", featureCount: 4, order: "order-2 md:order-3",
    // Tablette : 2 + 1, la troisième carte centrée sous les deux autres.
    className: "md:col-span-2 md:max-w-[400px] md:mx-auto md:w-full xl:col-span-1 xl:max-w-none",
  },
];

/** En-tête éditorial : badge, titre serif, sous-titre, halo vert très léger. */
export function PricingHero({ eyebrow, title, highlight, subtitle, as: Heading = "h2", className }: {
  eyebrow: string; title: string; highlight?: string; subtitle: string; as?: "h1" | "h2"; className?: string;
}) {
  return (
    <header className={cn("relative text-center max-w-2xl mx-auto", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[520px] max-w-full h-[220px] rounded-full opacity-70"
        style={{ background: "radial-gradient(closest-side, rgba(63,112,77,0.10), rgba(250,249,246,0))" }} />
      <span className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[12px] font-semibold uppercase tracking-[0.14em] text-[#3F704D] ring-1 ring-[#DCE6DA]">
        <Crown className="w-3.5 h-3.5 text-[#C6A15B]" aria-hidden="true" /> {eyebrow}
      </span>
      <Heading className="relative mt-4 font-headline text-[32px] sm:text-[42px] lg:text-[48px] font-bold leading-[1.05] tracking-tight text-[#1C241F]">
        {title}
        {highlight && <> <span className="italic text-[#3F704D]">{highlight}</span></>}
      </Heading>
      <p className="relative mt-4 text-[16px] sm:text-[17px] leading-relaxed text-[#5C665F]">{subtitle}</p>
    </header>
  );
}

export function PricingPlans({ onSelect, loadingPlan = null, currentPlan, className }: {
  /** Clic sur « Choisir … ». */
  onSelect: (plan: PlanId, period: BillingPeriod) => void;
  /** Formule dont le bouton affiche un chargement. */
  loadingPlan?: PlanId | null;
  /** Badge discret sous la bascule (ex. formule actuelle du membre). */
  currentPlan?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const maxSavings = planPricing("or", "annual").savings ?? 0;

  return (
    <div className={className}>
      {/* Période */}
      <div className="flex flex-col items-center gap-3">
        <BillingToggle value={period} onChange={setPeriod} />
        <p className="min-h-[24px] text-[14px] text-[#5C665F] text-center" aria-live="polite">
          {period === "annual" ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#2F5A3D]">
              <Sparkles className="w-4 h-4 text-[#C6A15B]" aria-hidden="true" />
              {t("billing.saveUpTo", { amount: formatFcfa(maxSavings) })}
            </span>
          ) : t("billing.monthlyNote")}
        </p>
        {currentPlan}
      </div>

      {/* Cartes */}
      <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-7 max-w-[1080px] mx-auto items-stretch">
        {PLANS.map((plan) => {
          const pricing = planPricing(plan.id, period);
          return (
            <PricingCard
              key={plan.id}
              className={cn(plan.order, plan.className)}
              name={t(`tarifs.${plan.id}.name`)}
              description={t(`tarifs.${plan.id}.description`)}
              pricing={pricing}
              period={period}
              features={Array.from({ length: plan.featureCount }, (_, i) => t(`tarifs.${plan.id}.feature${i + 1}`))}
              cta={t(`tarifs.${plan.id}.cta`)}
              variant={plan.variant}
              badge={plan.withBadge ? t(`tarifs.${plan.id}.badge`) : undefined}
              loading={loadingPlan === plan.id}
              onSelect={() => onSelect(plan.id, period)}
              labels={{
                currency: t("billing.currency"),
                perMonth: t("billing.perMonth"),
                perYear: t("billing.perYear"),
                perMonthEquivalent: pricing.perMonth !== null ? t("billing.perMonthEquivalent", { amount: formatFcfa(pricing.perMonth) }) : undefined,
                savings: pricing.savings !== null ? t("billing.savings", { amount: formatFcfa(pricing.savings) }) : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Réassurance */}
      <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-[#5C665F]">
        {[
          { icon: Lock, label: t("tarifs.trustSecurePayment") },
          { icon: RefreshCcw, label: t("tarifs.trustCancel") },
          { icon: ShieldCheck, label: t("tarifs.trustProtected") },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-2">
            <Icon className="w-4 h-4 text-[#3F704D]" aria-hidden="true" /> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
