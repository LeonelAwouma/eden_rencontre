// Harmonisation des deux vocabulaires d'abonnement déjà présents dans le
// dépôt — sans renommage, sans migration destructive :
//   - bronze/argent/or : affichage/tarification uniquement (src/lib/pricing.ts),
//     jamais persisté.
//   - free/essentiel/premium/elite : colonne réelle `profiles.subscription_plan`,
//     protégée par un trigger qui la fige pour toute session non-service-role
//     (supabase/migrations/20260924_member_approval_rls.sql).
//
// La récompense de parrainage n'écrit JAMAIS `profiles.subscription_plan` —
// cette colonne représente uniquement un abonnement réellement payé. Le
// crédit GOLD gagné est représenté uniquement par la file `referral_rewards`,
// combinée à la volée dans src/lib/subscription/effective.ts.

export type DisplayPlanId = "bronze" | "argent" | "or";
export type DbPlan = "free" | "essentiel" | "premium" | "elite";

export const DISPLAY_TO_DB: Record<DisplayPlanId, DbPlan> = {
  bronze: "essentiel",
  argent: "premium",
  or: "elite",
};

export const DB_TO_DISPLAY: Record<Exclude<DbPlan, "free">, DisplayPlanId> = {
  essentiel: "bronze",
  premium: "argent",
  elite: "or",
};

/** Ordre de richesse — elite est le palier fonctionnel « GOLD ». */
export const PLAN_RANK: Record<DbPlan, number> = { free: 0, essentiel: 1, premium: 2, elite: 3 };

export const richer = (a: DbPlan, b: DbPlan): DbPlan => (PLAN_RANK[a] >= PLAN_RANK[b] ? a : b);

export function isDbPlan(v: unknown): v is DbPlan {
  return v === "free" || v === "essentiel" || v === "premium" || v === "elite";
}
