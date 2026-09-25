// ── Formules d'abonnement ─────────────────────────────────────────
// Source unique des prix, partagée par la page publique /tarifs et l'onglet
// Premium de l'espace membre. Prix de référence : mensuels, en FCFA.
// Paiement annuel : 12 mois avec une remise de 10 %.

export type BillingPeriod = "monthly" | "annual";
export type PlanId = "bronze" | "argent" | "or";

export const ANNUAL_DISCOUNT = 0.1;

export const PLAN_MONTHLY_PRICES: Record<PlanId, number> = {
  bronze: 2500,
  argent: 5000,
  or: 10000,
};

export interface PlanPricing {
  /** Montant affiché en grand (par mois, ou par an en annuel). */
  amount: number;
  /** Annuel uniquement : équivalent mensuel après remise. */
  perMonth: number | null;
  /** Annuel uniquement : prix sur 12 mois sans remise (barré). */
  fullYear: number | null;
  /** Annuel uniquement : économie réalisée sur l'année. */
  savings: number | null;
}

export function planPricing(plan: PlanId, period: BillingPeriod): PlanPricing {
  const monthly = PLAN_MONTHLY_PRICES[plan];
  if (period === "monthly") return { amount: monthly, perMonth: null, fullYear: null, savings: null };
  const fullYear = monthly * 12;
  // Arrondi à la centaine : pas de centimes en FCFA.
  const amount = Math.round((fullYear * (1 - ANNUAL_DISCOUNT)) / 100) * 100;
  return { amount, perMonth: Math.round(amount / 12), fullYear, savings: fullYear - amount };
}

/** « 27 000 » — espace fine insécable entre les milliers, comme en français. */
export function formatFcfa(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, "\u202f");
}
