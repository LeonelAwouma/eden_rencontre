// Source de vérité unique des droits d'abonnement — voir le plan
// (feature/referral-gold-rewards) pour le détail de chaque règle.
//
// Deux fonctions à ne jamais confondre :
//   - getEffectiveSubscription            : lecture PURE, aucune écriture.
//     Utilisée par les tableaux de bord (membre, admin) et les statistiques
//     — consulter l'état d'un membre ne doit JAMAIS activer ni suspendre un
//     crédit comme effet de bord.
//   - reconcileAndGetEffectiveSubscription : seule à activer/suspendre
//     réellement un crédit (via les fonctions Postgres atomiques), réservée
//     aux points où le membre essaie RÉELLEMENT d'utiliser une
//     fonctionnalité GOLD (hasFeatureAccess) ou au balayage périodique de
//     réconciliation (cron + changement de réglages admin).
//
// Garde maîtresse : tant que `subscription.commercial_restrictions_enabled`
// est faux (défaut, y compris pendant la promotion gratuite), AUCUN crédit
// n'est consulté ni activé — l'accès est total pour tout le monde, comme
// aujourd'hui. `launch_promo_end_at` nul n'est alors jamais interprété comme
// une promo infinie : il n'a simplement aucune incidence tant que
// l'interrupteur est désactivé.

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { type DbPlan, isDbPlan, richer, PLAN_RANK } from "./plan-map";

type Db = ReturnType<typeof getSupabaseAdmin>;

export type EffectiveSource = "paid" | "referral_credit" | "discovery" | "launch_promo" | "free";

export interface EffectiveSubscription {
  tier: DbPlan;
  source: EffectiveSource;
  /** profiles.subscription_plan brut — jamais modifié par ce module. */
  paidTier: DbPlan;
  /** ISO, uniquement si `source` est temporaire (crédit/découverte/promo). */
  goldUntil: string | null;
  /** Jours de crédit en réserve (pending_activation), non encore activés. */
  queuedCreditsDays: number;
}

export type Feature = "unlimited_matching" | "unlimited_messaging" | "all_formations";
const MIN_TIER: Record<Feature, DbPlan> = {
  unlimited_matching: "elite",
  unlimited_messaging: "elite",
  all_formations: "elite",
};

interface SubscriptionConfig {
  commercialRestrictionsEnabled: boolean;
  launchPromoEndAt: string | null;
  discoveryPeriodDays: number;
}

async function readSubscriptionConfig(db: Db): Promise<SubscriptionConfig> {
  const { data } = await db
    .from("platform_settings")
    .select("key, value")
    .eq("category", "subscription");
  const row = (key: string) => (data || []).find((r) => r.key === key)?.value;
  return {
    commercialRestrictionsEnabled: row("commercial_restrictions_enabled") === true,
    launchPromoEndAt: typeof row("launch_promo_end_at") === "string" ? (row("launch_promo_end_at") as string) : null,
    discoveryPeriodDays: typeof row("discovery_period_days") === "number" ? (row("discovery_period_days") as number) : 30,
  };
}

interface Floor {
  floor: DbPlan;
  paidTier: DbPlan;
  launchPromoActive: boolean;
  discoveryActive: boolean;
  inFreeGracePeriod: boolean;
}

async function computeFloor(db: Db, userId: string, cfg: SubscriptionConfig): Promise<Floor | null> {
  const { data: profile } = await db.from("profiles").select("subscription_plan, reviewed_at").eq("id", userId).maybeSingle();
  if (!profile) return null;
  const paidTier: DbPlan = isDbPlan(profile.subscription_plan) ? profile.subscription_plan : "free";

  const now = Date.now();
  const launchPromoActive = !!cfg.launchPromoEndAt && now < new Date(cfg.launchPromoEndAt).getTime();

  const approvedAt = profile.reviewed_at ? new Date(profile.reviewed_at).getTime() : null;
  const discoveryActive = !!approvedAt && now < approvedAt + cfg.discoveryPeriodDays * 24 * 60 * 60 * 1000;

  let floor: DbPlan = paidTier;
  if (launchPromoActive) floor = richer(floor, "elite");
  if (discoveryActive) floor = richer(floor, "essentiel");

  return { floor, paidTier, launchPromoActive, discoveryActive, inFreeGracePeriod: launchPromoActive || discoveryActive };
}

interface RewardRow {
  id: string;
  status: "pending_activation" | "active" | "expired" | "revoked";
  duration_days: number;
  expires_at: string | null;
  remaining_duration: string | null;
  granted_at: string;
}

async function readRewards(db: Db, userId: string): Promise<RewardRow[]> {
  const { data } = await db
    .from("referral_rewards")
    .select("id, status, duration_days, expires_at, remaining_duration, granted_at")
    .eq("user_id", userId)
    .in("status", ["pending_activation", "active"]);
  return (data || []) as RewardRow[];
}

/** Lecture pure — jamais d'écriture. Reflète l'état actuellement stocké. */
export async function getEffectiveSubscription(db: Db, userId: string): Promise<EffectiveSubscription> {
  const { data: profile } = await db.from("profiles").select("subscription_plan").eq("id", userId).maybeSingle();
  const paidTier: DbPlan = isDbPlan(profile?.subscription_plan) ? profile!.subscription_plan : "free";

  const cfg = await readSubscriptionConfig(db);
  if (!cfg.commercialRestrictionsEnabled) {
    // Garde maîtresse : aucun crédit n'est ni lu ni modifié ici.
    return { tier: "elite", source: paidTier === "elite" ? "paid" : "free", paidTier, goldUntil: null, queuedCreditsDays: 0 };
  }

  const floorInfo = await computeFloor(db, userId, cfg);
  if (!floorInfo) {
    return { tier: "free", source: "free", paidTier: "free", goldUntil: null, queuedCreditsDays: 0 };
  }
  const { floor, inFreeGracePeriod, launchPromoActive, discoveryActive } = floorInfo;

  const rewards = await readRewards(db, userId);
  const active = rewards.find((r) => r.status === "active" && r.expires_at && new Date(r.expires_at).getTime() > Date.now());
  const pending = rewards.filter((r) => r.status === "pending_activation");
  const queuedCreditsDays = pending.reduce((sum, r) => sum + (r.remaining_duration ? intervalToDays(r.remaining_duration) : r.duration_days), 0);

  const creditTier: DbPlan = active ? "elite" : "free";
  const tier = richer(floor, creditTier);

  let source: EffectiveSource;
  let goldUntil: string | null = null;
  if (active && PLAN_RANK[tier] === PLAN_RANK["elite"] && PLAN_RANK[floor] < PLAN_RANK["elite"]) {
    source = "referral_credit";
    goldUntil = active.expires_at;
  } else if (PLAN_RANK[paidTier] >= PLAN_RANK[tier]) {
    source = "paid";
  } else if (launchPromoActive && PLAN_RANK[tier] === PLAN_RANK["elite"]) {
    source = "launch_promo";
  } else if (discoveryActive) {
    source = "discovery";
  } else {
    source = inFreeGracePeriod ? "launch_promo" : "free";
  }

  return { tier, source, paidTier, goldUntil, queuedCreditsDays };
}

/** Jours entiers depuis un intervalle Postgres sérialisé (ex. "12 days 03:21:00") — affichage seulement. */
function intervalToDays(pgInterval: string): number {
  const days = /(-?\d+)\s*day/i.exec(pgInterval)?.[1];
  const hours = /(-?\d+):\d+:\d+/.exec(pgInterval)?.[1];
  const d = days ? parseInt(days, 10) : 0;
  const h = hours ? parseInt(hours, 10) : 0;
  return Math.max(0, d + (h > 0 ? 1 : 0));
}

/**
 * Réconciliation ACTIVE : seule fonction de ce module à déclencher une
 * transition réelle (via les RPC atomiques). Réservée aux points d'appel qui
 * représentent un besoin réel et immédiat de la fonctionnalité GOLD, et au
 * balayage périodique de réconciliation (cron, changement de réglages admin).
 */
export async function reconcileAndGetEffectiveSubscription(db: Db, userId: string): Promise<EffectiveSubscription> {
  const cfg = await readSubscriptionConfig(db);
  if (!cfg.commercialRestrictionsEnabled) {
    return getEffectiveSubscription(db, userId);
  }

  const floorInfo = await computeFloor(db, userId, cfg);
  if (!floorInfo) return getEffectiveSubscription(db, userId);
  const { floor, inFreeGracePeriod, paidTier } = floorInfo;

  if (inFreeGracePeriod || paidTier === "elite") {
    // Un crédit `active` serait redondant : le suspendre préserve sa durée
    // restante exacte plutôt que de le laisser tourner "pour rien".
    await db.rpc("suspend_referral_credit", { p_user_id: userId });
    return getEffectiveSubscription(db, userId);
  }

  if (PLAN_RANK[floor] >= PLAN_RANK["elite"]) {
    return getEffectiveSubscription(db, userId);
  }

  const rewards = await readRewards(db, userId);
  const hasActive = rewards.some((r) => r.status === "active" && r.expires_at && new Date(r.expires_at).getTime() > Date.now());
  if (!hasActive) {
    // Activation différée : seulement à l'instant précis où GOLD devient
    // nécessaire (appelant = hasFeatureAccess après dépassement du quota
    // gratuit, ou activation volontaire demandée par le membre).
    await db.rpc("activate_referral_credit", { p_user_id: userId });
  }
  return getEffectiveSubscription(db, userId);
}

/**
 * N'appelle `reconcileAndGetEffectiveSubscription` (et donc ne risque
 * d'activer un crédit) QUE si `commercial_restrictions_enabled=true`. Les
 * appelants (messagerie, matching) doivent eux-mêmes vérifier d'abord que le
 * quota gratuit du jour est atteint avant d'appeler cette fonction — jamais
 * à chaque usage ordinaire.
 */
export async function hasFeatureAccess(db: Db, userId: string, feature: Feature): Promise<boolean> {
  const cfg = await readSubscriptionConfig(db);
  if (!cfg.commercialRestrictionsEnabled) return true;
  const eff = await reconcileAndGetEffectiveSubscription(db, userId);
  return PLAN_RANK[eff.tier] >= PLAN_RANK[MIN_TIER[feature]];
}

/**
 * Balayage de réconciliation PUREMENT descendant (suspension), jamais
 * d'activation — appelé par le cron quotidien et par le PUT de
 * /api/admin/settings sur une clé subscription.*. Ne doit jamais dépendre de
 * la prochaine visite d'un membre précis.
 */
export async function sweepSuspendRedundantCredits(db: Db): Promise<number> {
  const cfg = await readSubscriptionConfig(db);
  if (!cfg.commercialRestrictionsEnabled) return 0;
  const { data: activeRewards } = await db.from("referral_rewards").select("user_id").eq("status", "active");
  let suspended = 0;
  for (const row of activeRewards || []) {
    const floorInfo = await computeFloor(db, row.user_id as string, cfg);
    if (!floorInfo) continue;
    if (floorInfo.inFreeGracePeriod || floorInfo.paidTier === "elite") {
      const { data } = await db.rpc("suspend_referral_credit", { p_user_id: row.user_id });
      if (data) suspended++;
    }
  }
  return suspended;
}
