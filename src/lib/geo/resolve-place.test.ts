import { describe, expect, it } from "vitest";
import { resolvePlaceFromCandidates, type CityCandidate } from "./resolve-place";

const c = (id: string, over: Partial<CityCandidate> = {}): CityCandidate => ({
  place_id: id, match_kind: "canonical", place_type: "locality", total_count: 1, ...over,
});

describe("resolvePlaceFromCandidates — on ne devine jamais", () => {
  it("aucun candidat → aucune résolution", () => {
    expect(resolvePlaceFromCandidates([])).toEqual({ kind: "none" });
    expect(resolvePlaceFromCandidates(null)).toEqual({ kind: "none" });
  });

  it("une seule localité (nom officiel ou alias) → résolue", () => {
    expect(resolvePlaceFromCandidates([c("p1", { place_type: "city" })])).toEqual({ kind: "resolved", placeId: "p1" });
    expect(resolvePlaceFromCandidates([c("p1", { match_kind: "alias" })])).toEqual({ kind: "resolved", placeId: "p1" });
  });

  it("plusieurs localités dont une seule ville → cette ville", () => {
    const r = resolvePlaceFromCandidates([
      c("v1", { total_count: 3 }), c("city", { place_type: "city", total_count: 3 }), c("v2", { place_type: "town", total_count: 3 }),
    ]);
    expect(r).toEqual({ kind: "resolved", placeId: "city" });
  });

  it("plusieurs villes homonymes → ambiguë (la population ne tranche pas)", () => {
    const r = resolvePlaceFromCandidates([
      c("a", { place_type: "city", total_count: 2 }), c("b", { place_type: "city", total_count: 2 }),
    ]);
    expect(r).toEqual({ kind: "ambiguous" });
  });

  it("plusieurs villages homonymes sans ville → ambiguë", () => {
    expect(resolvePlaceFromCandidates([c("a", { total_count: 2 }), c("b", { total_count: 2 })])).toEqual({ kind: "ambiguous" });
  });

  it("plafond dépassé → ambiguë, même si une seule ville figure dans les 50 premiers", () => {
    const list = [c("city", { place_type: "city", total_count: 65 }), ...Array.from({ length: 49 }, (_, i) => c(`v${i}`, { total_count: 65 }))];
    expect(resolvePlaceFromCandidates(list)).toEqual({ kind: "ambiguous" });
  });
});
