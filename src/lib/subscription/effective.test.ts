import { describe, test, expect, vi } from "vitest";
import { getEffectiveSubscription, reconcileAndGetEffectiveSubscription, hasFeatureAccess } from "./effective";

/**
 * Mock minimal du client Supabase admin : chaque table a une réponse fixe,
 * lue soit via .maybeSingle() (objet unique, ex. profiles) soit via l'attente
 * directe de la chaîne (tableau, ex. platform_settings/referral_rewards).
 * `rpcCalls` enregistre tous les appels RPC pour vérifier qu'une activation
 * n'est JAMAIS déclenchée quand elle ne devrait pas l'être.
 */
function makeDb(tableData: Record<string, unknown>, rpcResults: Record<string, unknown> = {}) {
  const rpcCalls: { name: string; args: unknown }[] = [];
  const db: any = {
    from(table: string) {
      const chain: any = {
        select() { return chain; },
        eq() { return chain; },
        in() { return chain; },
        gte() { return chain; },
        lte() { return chain; },
        order() { return chain; },
        maybeSingle() { return Promise.resolve({ data: tableData[table] ?? null }); },
        then(resolve: (v: { data: unknown }) => void) { resolve({ data: tableData[table] ?? null }); },
      };
      return chain;
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: rpcResults[name] ?? null });
    },
  };
  return { db, rpcCalls };
}

const subscriptionSettings = (overrides: Record<string, unknown> = {}) => [
  { key: "commercial_restrictions_enabled", value: overrides.commercial_restrictions_enabled ?? true },
  { key: "launch_promo_end_at", value: overrides.launch_promo_end_at ?? null },
  { key: "discovery_period_days", value: overrides.discovery_period_days ?? 30 },
];

describe("getEffectiveSubscription — garde maîtresse", () => {
  test("restrictions désactivées : accès total même pour un abonnement payé non-GOLD", async () => {
    const { db } = makeDb({
      profiles: { subscription_plan: "essentiel" },
      platform_settings: subscriptionSettings({ commercial_restrictions_enabled: false }),
    });
    const result = await getEffectiveSubscription(db, "user-1");
    expect(result.tier).toBe("elite");
    expect(result.paidTier).toBe("essentiel"); // profiles.subscription_plan brut, jamais modifié
  });

  test("restrictions désactivées et abonnement payé déjà elite : source 'paid'", async () => {
    const { db } = makeDb({
      profiles: { subscription_plan: "elite" },
      platform_settings: subscriptionSettings({ commercial_restrictions_enabled: false }),
    });
    const result = await getEffectiveSubscription(db, "user-1");
    expect(result.tier).toBe("elite");
    expect(result.source).toBe("paid");
  });

  test("restrictions désactivées et aucun abonnement payé : source 'free', tier 'elite' quand même", async () => {
    const { db } = makeDb({
      profiles: { subscription_plan: "free" },
      platform_settings: subscriptionSettings({ commercial_restrictions_enabled: false }),
    });
    const result = await getEffectiveSubscription(db, "user-1");
    expect(result.tier).toBe("elite");
    expect(result.source).toBe("free");
    expect(result.queuedCreditsDays).toBe(0);
  });

  test("launch_promo_end_at nul n'est jamais traité comme une promo infinie quand les restrictions sont désactivées", async () => {
    const { db } = makeDb({
      profiles: { subscription_plan: "free" },
      platform_settings: subscriptionSettings({ commercial_restrictions_enabled: false, launch_promo_end_at: null }),
    });
    const result = await getEffectiveSubscription(db, "user-1");
    expect(result.tier).toBe("elite"); // comportement actuel préservé, pas une erreur
  });
});

describe("getEffectiveSubscription — abonnement payé jamais raccourci", () => {
  test("un abonnement premium reste premium sans crédit ni promo", async () => {
    const { db } = makeDb({
      profiles: { subscription_plan: "premium", reviewed_at: null },
      platform_settings: subscriptionSettings(),
      referral_rewards: [],
    });
    const result = await getEffectiveSubscription(db, "user-1");
    expect(result.tier).toBe("premium");
    expect(result.source).toBe("paid");
    expect(result.paidTier).toBe("premium");
  });
});

describe("reconcileAndGetEffectiveSubscription — jamais d'activation pendant une période gratuite", () => {
  test("découverte active (essentiel) : un crédit en réserve n'est jamais activé", async () => {
    const recentApproval = new Date().toISOString();
    const { db, rpcCalls } = makeDb({
      profiles: { subscription_plan: "free", reviewed_at: recentApproval },
      platform_settings: subscriptionSettings({ discovery_period_days: 30 }),
      referral_rewards: [{ id: "r1", status: "pending_activation", duration_days: 30, expires_at: null, remaining_duration: null, granted_at: new Date().toISOString() }],
    });
    const result = await reconcileAndGetEffectiveSubscription(db, "user-1");
    expect(result.tier).toBe("essentiel"); // la découverte seule, pas GOLD
    expect(rpcCalls.some((c) => c.name === "activate_referral_credit")).toBe(false);
  });

  test("hors période gratuite, sans crédit actif : activation tentée (besoin réel)", async () => {
    const { db, rpcCalls } = makeDb({
      profiles: { subscription_plan: "free", reviewed_at: null },
      platform_settings: subscriptionSettings(),
      referral_rewards: [{ id: "r1", status: "pending_activation", duration_days: 30, expires_at: null, remaining_duration: null, granted_at: new Date().toISOString() }],
    });
    await reconcileAndGetEffectiveSubscription(db, "user-1");
    expect(rpcCalls.some((c) => c.name === "activate_referral_credit")).toBe(true);
  });

  test("abonnement payé elite déjà suffisant : un crédit actif est suspendu, jamais consommé en plus", async () => {
    const { db, rpcCalls } = makeDb({
      profiles: { subscription_plan: "elite", reviewed_at: null },
      platform_settings: subscriptionSettings(),
      referral_rewards: [],
    });
    await reconcileAndGetEffectiveSubscription(db, "user-1");
    expect(rpcCalls.some((c) => c.name === "suspend_referral_credit")).toBe(true);
    expect(rpcCalls.some((c) => c.name === "activate_referral_credit")).toBe(false);
  });
});

describe("hasFeatureAccess — garde maîtresse avant toute réconciliation", () => {
  test("restrictions désactivées : toujours vrai, aucun appel RPC", async () => {
    const { db, rpcCalls } = makeDb({ platform_settings: subscriptionSettings({ commercial_restrictions_enabled: false }) });
    const access = await hasFeatureAccess(db, "user-1", "unlimited_messaging");
    expect(access).toBe(true);
    expect(rpcCalls.length).toBe(0);
  });
});
