import { describe, expect, it } from "vitest";
import { ancestorsOf, validateSelection, type AdminUnit } from "./hierarchy";
import { normalizePlaceName, placeMatches } from "./normalize";

const mk = (id: string, level: 0 | 1 | 2 | 3, parentId: string | null, nameFr: string): AdminUnit => ({
  id,
  code: id,
  level,
  parentId,
  nameFr,
  nameEn: null,
});
const units = new Map(
  [
    mk("CM", 0, null, "Cameroun"),
    mk("CE", 1, "CM", "Centre"),
    mk("LT", 1, "CM", "Littoral"),
    mk("MF", 2, "CE", "Mfoundi"),
    mk("WR", 2, "LT", "Wouri"),
    mk("Y1", 3, "MF", "Yaoundé 1er"),
    mk("D1", 3, "WR", "Douala 1er"),
  ].map((u) => [u.id, u]),
);

describe("validateSelection", () => {
  it("accepte une chaîne cohérente", () => {
    expect(
      validateSelection({ countryCode: "CM", regionId: "CE", departmentId: "MF", arrondissementId: "Y1" }, units),
    ).toBeNull();
  });
  it("refuse un département hors de la région", () => {
    expect(validateSelection({ countryCode: "CM", regionId: "CE", departmentId: "WR" }, units)).toBe(
      "department_not_in_region",
    );
  });
  it("refuse un arrondissement hors du département", () => {
    expect(
      validateSelection({ countryCode: "CM", regionId: "CE", departmentId: "MF", arrondissementId: "D1" }, units),
    ).toBe("arrondissement_not_in_department");
  });
  it("n'invente pas les parents manquants", () => {
    expect(validateSelection({ countryCode: "CM", arrondissementId: "Y1" }, units)).toBe("missing_parent");
  });
  it("refuse un niveau erroné ou une unité inconnue", () => {
    expect(validateSelection({ countryCode: "CM", regionId: "MF" }, units)).toBe("wrong_level");
    expect(validateSelection({ countryCode: "CM", regionId: "XX" }, units)).toBe("unknown_unit");
  });
  it("vérifie le rattachement d'une localité à l'arrondissement", () => {
    const sel = { countryCode: "CM", regionId: "CE", departmentId: "MF", arrondissementId: "Y1", placeId: "p1" };
    expect(validateSelection(sel, units, { id: "p1", adminUnitId: "Y1" })).toBeNull();
    expect(validateSelection(sel, units, { id: "p1", adminUnitId: "D1" })).toBe("place_not_in_arrondissement");
    // localité non vérifiée : pas d'arrondissement imposé
    expect(validateSelection({ countryCode: "CM", placeId: "p2" }, units, { id: "p2", adminUnitId: null })).toBeNull();
  });
});

describe("ancestorsOf", () => {
  it("remonte jusqu'au pays", () => {
    expect(ancestorsOf("Y1", units).map((u) => u.id)).toEqual(["CM", "CE", "MF", "Y1"]);
  });
});

describe("normalisation des noms", () => {
  it("ignore accents et casse", () => {
    expect(normalizePlaceName("Yaoundé")).toBe("yaounde");
    expect(normalizePlaceName("Extrême-Nord")).toBe("extreme nord");
    expect(normalizePlaceName("N’Gaoundéré")).toBe("n'gaoundere");
  });
  it("trouve par préfixe, variante FR/EN et accent", () => {
    expect(placeMatches("yaou", ["Yaoundé"])).toBe(true);
    expect(placeMatches("far north", ["Extrême-Nord", "Far North"])).toBe(true);
    expect(placeMatches("x", ["Xyz"])).toBe(false);
  });
});
