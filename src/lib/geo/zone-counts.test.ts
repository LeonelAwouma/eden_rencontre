import { describe, expect, it } from "vitest";
import { COUNT_THRESHOLD, fillForCount, maskCounts, parseMapQuery } from "./zone-counts";
import { bboxOf, enrichFeatures, type ZoneCollection } from "./geojson";

const row = (id: string, n: number) => ({ unit_id: id, member_count: n });

describe("maskCounts — seuil de 5", () => {
  it("masque tout compte inférieur à 5, y compris 0", () => {
    const r = maskCounts([row("a", 0), row("b", 4), row("c", 5), row("d", 12)]);
    expect(r.find((x) => x.unitId === "a")!.count).toBeNull();
    expect(r.find((x) => x.unitId === "b")!.count).toBeNull();
    expect(r.find((x) => x.unitId === "d")!.count).toBe(12);
    expect(COUNT_THRESHOLD).toBe(5);
  });
  it("aucun compte masqué n'est jamais un nombre", () => {
    for (const x of maskCounts([row("a", 1), row("b", 2), row("c", 3)])) expect(x.count).toBeNull();
  });
  it("suppression complémentaire : une seule zone masquée → la plus petite zone visible l'est aussi", () => {
    const r = maskCounts([row("a", 2), row("b", 9), row("c", 30), row("d", 7)]);
    expect(r.filter((x) => x.count === null).map((x) => x.unitId).sort()).toEqual(["a", "d"]);
    expect(r.find((x) => x.unitId === "c")!.count).toBe(30);
  });
  it("sans zone masquée, rien n'est ajouté ; avec deux zones masquées ou plus, pas de suppression en plus", () => {
    expect(maskCounts([row("a", 6), row("b", 8)]).every((x) => x.count !== null)).toBe(true);
    const r = maskCounts([row("a", 1), row("b", 3), row("c", 20)]);
    expect(r.find((x) => x.unitId === "c")!.count).toBe(20);
  });
  it("valeurs invalides traitées comme masquées", () => {
    expect(maskCounts([row("a", Number.NaN), row("b", 9), row("c", 9)])[0].count).toBeNull();
  });
});

describe("parseMapQuery", () => {
  const U = "11111111-1111-4111-8111-111111111111";
  it("niveau 1 sans parent ; niveaux 2 et 3 avec un parent valide", () => {
    expect(parseMapQuery("1", null)).toEqual({ level: 1, parent: null });
    expect(parseMapQuery("2", U)).toEqual({ level: 2, parent: U });
    expect(parseMapQuery("3", U)).toEqual({ level: 3, parent: U });
  });
  it("refuse niveau inconnu, parent manquant/invalide, parent sur le niveau 1", () => {
    for (const [l, p] of [["0", null], ["4", U], ["2", null], ["3", "pas-un-uuid"], ["1", U], ["x", null], [null, null]] as const) {
      expect(parseMapQuery(l, p)).toBeNull();
    }
  });
});

describe("couleurs et GeoJSON", () => {
  it("une zone masquée a la couleur la plus claire", () => {
    expect(fillForCount(null)).toBe("#EEF5EC");
    expect(fillForCount(100)).toBe("#486B46");
  });
  const fc: ZoneCollection = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { id: "r1", name: "Centre" }, geometry: { type: "Polygon", coordinates: [[[10, 3], [12, 3], [12, 5], [10, 3]]] } },
      { type: "Feature", properties: { id: "r2", name: "Nord" }, geometry: { type: "MultiPolygon", coordinates: [[[[13, 8], [15, 8], [14, 11], [13, 8]]]] } },
    ],
  };
  it("emprise de toutes les zones", () => {
    expect(bboxOf(fc)).toEqual([10, 3, 15, 11]);
    expect(bboxOf({ type: "FeatureCollection", features: [] })).toBeNull();
  });
  it("enrichissement : couleur selon le compte masqué, zone du membre repérée, aucune fuite d'un compte sous le seuil", () => {
    const out = enrichFeatures(fc, [{ unitId: "r1", count: 40 }, { unitId: "r2", count: null }], new Set(["r2"]));
    expect(out.features[0].properties).toMatchObject({ fill: "#6F9468", mine: 0, count: 40 });
    expect(out.features[1].properties).toMatchObject({ fill: "#EEF5EC", mine: 1, count: null });
  });
  it("sans compte reçu : zones masquées par défaut", () => {
    const out = enrichFeatures(fc, [], new Set());
    expect(out.features.every((f) => f.properties.count === null && f.properties.fill === "#EEF5EC")).toBe(true);
  });
});
