import { describe, test, expect } from "vitest";
import { applyHardFilters } from "../hard-filters";
import type { EdenUserProfile } from "../types";

/**
 * Invariant explicitement demandé par la refonte de l'inscription (déplacement
 * de marriage_vision hors de l'inscription) : l'approbation administrative
 * d'un compte (profiles.status = "approved", décidée hors du moteur de
 * matching) ne garantit jamais que son questionnaire est complet. Un profil
 * "onboarding_completed: true" mais sans questionnaire doit toujours échouer
 * au filtre dur — jamais être traité comme une correspondance positive.
 */
function minimalProfile(overrides: Partial<EdenUserProfile>): EdenUserProfile {
  return {
    id: "u",
    name: "Test",
    email: "t@example.com",
    gender: "homme",
    birth_date: "1995-01-01",
    city: "Douala",
    country: "Cameroun",
    region: "Littoral",
    avatar_url: null,
    bio: "",
    profession: "",
    civil_status: "celibataire",
    subscription_plan: "free",
    onboarding_completed: true,
    profile_completion_pct: 100,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    questionnaire: undefined as any,
    ...overrides,
  } as EdenUserProfile;
}

describe("Approbation du compte vs questionnaire complet — jamais confondus", () => {
  test("un profil sans questionnaire échoue au filtre dur, même onboarding_completed=true", () => {
    const seeker = minimalProfile({ gender: "homme" });
    const candidate = minimalProfile({ gender: "femme", questionnaire: {} as any });
    // seeker.questionnaire est undefined : simule un compte approuvé par l'admin
    // (status="approved", décidé indépendamment) mais qui n'a pas encore rempli
    // le questionnaire de compatibilité.
    const result = applyHardFilters(seeker, candidate);
    expect(result.passed).toBe(false);
    expect(result.failures[0].field).toBe("questionnaire");
  });

  test("les deux profils avec questionnaire absent échouent aussi, pas de cas où l'un compense l'autre", () => {
    const seeker = minimalProfile({ gender: "homme" });
    const candidate = minimalProfile({ gender: "femme" });
    const result = applyHardFilters(seeker, candidate);
    expect(result.passed).toBe(false);
    expect(result.failures[0].field).toBe("questionnaire");
  });
});
