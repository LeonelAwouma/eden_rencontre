import { describe, expect, it } from "vitest";
import {
  GENERIC_CITY_LABEL,
  isGenericCityLabel,
  isSameRealCity,
  publicCityLabel,
} from "./public-label";

describe("publicCityLabel", () => {
  it("n'écrit la vraie ville que si le niveau d'affichage est « ville »", () => {
    expect(publicCityLabel("Yaoundé", "city")).toBe("Yaoundé");
    for (const level of ["none", "country", "region", "department", "arrondissement"] as const) {
      expect(publicCityLabel("Yaoundé", level)).toBe(GENERIC_CITY_LABEL);
    }
  });
  it("reste non vide (isRegistrationComplete inchangé)", () => {
    expect(publicCityLabel(null, "none")).toBeTruthy();
    expect(publicCityLabel("", "city")).toBeTruthy();
  });
});

describe("isSameRealCity", () => {
  it("deux étiquettes génériques ne sont pas « même ville »", () => {
    expect(isSameRealCity(GENERIC_CITY_LABEL, GENERIC_CITY_LABEL)).toBe(false);
    expect(isSameRealCity("non précisée", "Non precisee")).toBe(false);
    expect(isSameRealCity("Douala", GENERIC_CITY_LABEL)).toBe(false);
  });
  it("conserve exactement l'ancienne comparaison pour les profils historiques", () => {
    const legacy = (a?: string, b?: string) => a?.toLowerCase() === b?.toLowerCase();
    const samples = ["Douala", "douala", "Yaoundé", "Paris", "", undefined];
    for (const a of samples) for (const b of samples) expect(isSameRealCity(a, b)).toBe(legacy(a, b));
  });
  it("détecte les étiquettes génériques", () => {
    expect(isGenericCityLabel(GENERIC_CITY_LABEL)).toBe(true);
    expect(isGenericCityLabel("Douala")).toBe(false);
  });
});
