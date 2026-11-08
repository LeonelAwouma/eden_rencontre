import { describe, expect, it } from "vitest";
import { attentionTotal, buildAttentionItems, shareOf, trendFrom } from "./admin-dashboard";

describe("admin-dashboard", () => {
  it("buildAttentionItems : reprend les chiffres réels, avec les liens existants", () => {
    const items = buildAttentionItems({ pendingUsers: 3, reports: { pending: 2, critical: 1 } });
    expect(items.map((i) => [i.id, i.count, i.href])).toEqual([
      ["pending-users", 3, "/admin/users?status=pending"],
      ["pending-reports", 2, "/admin/reports"],
    ]);
    expect(items[0].hint).toBe("3 demandes attendent une décision");
    expect(items[1].hint).toBe("1 signalement critique (tous statuts confondus)");
  });

  it("buildAttentionItems : une donnée de signalements non lue vaut null, jamais 0", () => {
    const items = buildAttentionItems({ pendingUsers: 0, reports: null });
    expect(items[1].count).toBeNull();
    expect(items[1].hint).toBeUndefined();
  });

  it("buildAttentionItems : accords singulier / pluriel, aucune précision quand il n'y a rien", () => {
    expect(buildAttentionItems({ pendingUsers: 1, reports: { pending: 0, critical: 0 } })[0].hint).toBe("1 demande attend une décision");
    const calm = buildAttentionItems({ pendingUsers: 0, reports: { pending: 0, critical: 0 } });
    expect(calm.every((i) => i.hint === undefined)).toBe(true);
  });

  it("attentionTotal : ignore les données indisponibles", () => {
    expect(attentionTotal(buildAttentionItems({ pendingUsers: 2, reports: null }))).toBe(2);
    expect(attentionTotal(buildAttentionItems({ pendingUsers: 2, reports: { pending: 5, critical: 0 } }))).toBe(7);
    expect(attentionTotal(buildAttentionItems({ pendingUsers: 0, reports: { pending: 0, critical: 0 } }))).toBe(0);
  });

  it("trendFrom : pas de badge sans base de comparaison, signe typographique sinon", () => {
    expect(trendFrom(null)).toBeUndefined();
    expect(trendFrom(12)).toEqual({ value: "+12 % sur 30 j", positive: true });
    expect(trendFrom(-5)).toEqual({ value: "−5 % sur 30 j", positive: false });
    expect(trendFrom(0)).toEqual({ value: "0 % sur 30 j", positive: true });
  });

  it("shareOf : arrondi, et 0 pour un total nul", () => {
    expect(shareOf(1, 3)).toBe(33);
    expect(shareOf(2, 3)).toBe(67);
    expect(shareOf(5, 0)).toBe(0);
  });
});
