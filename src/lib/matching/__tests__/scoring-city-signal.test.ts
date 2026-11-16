import { describe, expect, test } from "vitest";
import { scorePreferences } from "../scoring";
import type { EdenUserProfile, PreferencesProfile } from "../types";
import { GENERIC_CITY_LABEL } from "../../geo/public-label";

/**
 * Signal « ville » du score (sous-critère distance de la catégorie Préférences) :
 *  - profils historiques (vraies villes) : points IDENTIQUES à l'ancienne règle 100 / 70 / 40 ;
 *  - étiquette générique (ville masquée) : jamais « même ville » → on retombe sur le critère de pays
 *    existant (70/40). Ce n'est pas un nouveau critère géographique : voir docs/geo-matching-impact.md.
 */
const prefs: PreferencesProfile = {
  preferred_age_min: 20,
  preferred_age_max: 40,
  max_distance_km: 0,
  preferred_languages: [],
  preferred_regions: [],
  preferred_education: [],
  preferred_professions: [],
  hobbies: [],
  interests: [],
} as PreferencesProfile;

const person = (city: string, country: string): EdenUserProfile =>
  ({ birth_date: "1996-01-01", city, country }) as EdenUserProfile;

function distancePoints(a: EdenUserProfile, b: EdenUserProfile): number {
  const r = scorePreferences(prefs, prefs, a, b);
  const d = r.details.find((x) => x.field === "max_distance_km");
  if (!d) throw new Error("détail max_distance_km introuvable");
  return d.points;
}

describe("signal ville du score de compatibilité", () => {
  test("profils historiques : règle inchangée (même ville 100, même pays 70, sinon 40)", () => {
    expect(distancePoints(person("Douala", "Cameroun"), person("douala", "Cameroun"))).toBe(100);
    expect(distancePoints(person("Douala", "Cameroun"), person("Yaoundé", "Cameroun"))).toBe(70);
    expect(distancePoints(person("Douala", "Cameroun"), person("Paris", "France"))).toBe(40);
  });

  test("deux membres avec la même étiquette générique ne reçoivent PAS le score « même ville »", () => {
    const a = person(GENERIC_CITY_LABEL, "Cameroun");
    const b = person(GENERIC_CITY_LABEL, "Cameroun");
    expect(distancePoints(a, b)).toBe(70); // critère de pays existant
  });

  test("ville masquée d'un côté : critère de pays, sans révéler ni inventer la ville", () => {
    expect(distancePoints(person("Douala", "Cameroun"), person(GENERIC_CITY_LABEL, "Cameroun"))).toBe(70);
    expect(distancePoints(person("Douala", "Cameroun"), person(GENERIC_CITY_LABEL, "France"))).toBe(40);
  });
});
