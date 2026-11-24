import { describe, expect, it } from "vitest";
import { groupHitsByName, isCityFilled, visibleSuggestions } from "./city-suggestions";

describe("isCityFilled — la ville tapée suffit pour continuer", () => {
  it("2 caractères utiles minimum, espaces ignorés", () => {
    expect(isCityFilled("Yaoundé")).toBe(true);
    expect(isCityFilled("  Ya ")).toBe(true);
    expect(isCityFilled("Y")).toBe(false);
    expect(isCityFilled("   ")).toBe(false);
    expect(isCityFilled(null)).toBe(false);
  });
});

describe("groupHitsByName", () => {
  it("nom unique → identifiant transmis ; homonymes → un seul nom, sans identifiant", () => {
    const r = groupHitsByName([
      { id: "a", name: "Yaoundé" },
      { id: "b", name: "Douala" },
      { id: "c", name: "douala" },
    ]);
    expect(r).toEqual([
      { name: "Yaoundé", placeId: "a" },
      { name: "Douala", placeId: null },
    ]);
  });
});

describe("visibleSuggestions", () => {
  const s = [{ name: "Yaoundé", placeId: "a" }];
  it("rien avant 2 caractères", () => {
    expect(visibleSuggestions("y", s)).toEqual([]);
  });
  it("masquée quand la saisie est déjà la seule suggestion (accents et casse ignorés)", () => {
    expect(visibleSuggestions("yaounde", s)).toEqual([]);
  });
  it("affichée tant que la saisie diffère", () => {
    expect(visibleSuggestions("yaou", s)).toEqual(s);
  });
});
