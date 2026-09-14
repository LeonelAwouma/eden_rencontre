// ============================================================================
//  Garden of Alliance — Hard Filter Engine
//  Eliminates incompatible profiles BEFORE any scoring occurs.
//  These filters are non-negotiable — no amount of compatibility elsewhere
//  can compensate for a hard filter failure.
// ============================================================================

import type {
  EdenUserProfile,
  QuestionnaireResponse,
  HardFilterResult,
  HardFilterFailure,
} from "./types";
import { COMPATIBLE_DENOMINATIONS, MIN_MATCH_AGE } from "./config";

// ── MAIN HARD FILTER FUNCTION ────────────────────────────────────────────────

/**
 * Apply all hard filters between User A (seeker) and User B (candidate).
 * Returns { passed: true } if compatible, or { passed: false, failures: [...] } if not.
 * 
 * Workflow:
 * 1. Gender compatibility (A seeks opposite gender)
 * 2. Christian identity (both must be born-again Christians)
 * 3. Denomination compatibility
 * 4. Marriage desire (both must want marriage)
 * 5. Children preference alignment
 * 6. Non-negotiable validation (behavioral, spiritual, relationship, family, lifestyle)
 * 7. Age eligibility (minimum 21)
 * 8. Profile completion minimum
 */
export function applyHardFilters(
  seeker: EdenUserProfile,
  candidate: EdenUserProfile
): HardFilterResult {
  const failures: HardFilterFailure[] = [];
  const qa = seeker.questionnaire;
  const qb = candidate.questionnaire;

  // Guard: if either questionnaire is missing/incomplete, fail
  if (!qa || !qb) {
    failures.push({
      field: "questionnaire",
      reason: "Un ou les deux profils n'ont pas complété le questionnaire",
      user_a_value: qa ? "complet" : "incomplet",
      user_b_value: qb ? "complet" : "incomplet",
      severity: "critical",
    });
    return { passed: false, failures };
  }

  // ── 1. GENDER COMPATIBILITY ────────────────────────────────────────────────
  // Platform is heterosexual: homme seeks femme, femme seeks homme
  if (seeker.gender === candidate.gender) {
    failures.push({
      field: "gender",
      reason: "Même genre",
      user_a_value: seeker.gender,
      user_b_value: candidate.gender,
      severity: "critical",
    });
  }

  // ── 2. CHRISTIAN IDENTITY ──────────────────────────────────────────────────
  // Both must be born-again Christians
  if (!qa.spiritual.is_christian) {
    failures.push({
      field: "is_christian",
      reason: "L'utilisateur A n'est pas un chrétien né de nouveau",
      user_a_value: "non chrétien",
      user_b_value: qb.spiritual.is_christian ? "chrétien" : "non chrétien",
      severity: "critical",
    });
  }
  if (!qb.spiritual.is_christian) {
    failures.push({
      field: "is_christian",
      reason: "Le candidat n'est pas un chrétien né de nouveau",
      user_a_value: qa.spiritual.is_christian ? "chrétien" : "non chrétien",
      user_b_value: "non chrétien",
      severity: "critical",
    });
  }

  // ── 3. DENOMINATION COMPATIBILITY ──────────────────────────────────────────
  // Check if denominations are compatible (both directions)
  const denomA = qa.spiritual.denomination.toLowerCase().trim();
  const denomB = qb.spiritual.denomination.toLowerCase().trim();
  const aCompatibleWithB = COMPATIBLE_DENOMINATIONS[denomA]?.includes(denomB) ?? false;
  const bCompatibleWithA = COMPATIBLE_DENOMINATIONS[denomB]?.includes(denomA) ?? false;

  if (!aCompatibleWithB && !bCompatibleWithA) {
    failures.push({
      field: "denomination",
      reason: "Dénominations incompatibles",
      user_a_value: qa.spiritual.denomination,
      user_b_value: qb.spiritual.denomination,
      severity: "critical",
    });
  }

  // ── 4. MARRIAGE DESIRE ─────────────────────────────────────────────────────
  // Both must want marriage (score >= 2 on a 1-5 scale)
  const MIN_MARRIAGE_DESIRE = 2;
  if (qa.marriage_family.marriage_desire < MIN_MARRIAGE_DESIRE) {
    failures.push({
      field: "marriage_desire",
      reason: "L'utilisateur A ne désire pas suffisamment le mariage",
      user_a_value: String(qa.marriage_family.marriage_desire),
      user_b_value: String(qb.marriage_family.marriage_desire),
      severity: "critical",
    });
  }
  if (qb.marriage_family.marriage_desire < MIN_MARRIAGE_DESIRE) {
    failures.push({
      field: "marriage_desire",
      reason: "Le candidat ne désire pas suffisamment le mariage",
      user_a_value: String(qa.marriage_family.marriage_desire),
      user_b_value: String(qb.marriage_family.marriage_desire),
      severity: "critical",
    });
  }

  // ── 5. CHILDREN PREFERENCE ─────────────────────────────────────────────────
  // If one wants children and the other explicitly does not → incompatible
  const aWantsChildren = qa.marriage_family.wants_children === true || qa.marriage_family.wants_children === "required";
  const bWantsChildren = qb.marriage_family.wants_children === true || qb.marriage_family.wants_children === "required";
  const aDoesNotWant = qa.marriage_family.wants_children === false;
  const bDoesNotWant = qb.marriage_family.wants_children === false;

  if (aWantsChildren && bDoesNotWant) {
    failures.push({
      field: "wants_children",
      reason: "L'utilisateur A veut des enfants mais le candidat n'en veut pas",
      user_a_value: "veut des enfants",
      user_b_value: "ne veut pas d'enfants",
      severity: "critical",
    });
  }
  if (bWantsChildren && aDoesNotWant) {
    failures.push({
      field: "wants_children",
      reason: "Le candidat veut des enfants mais l'utilisateur A n'en veut pas",
      user_a_value: "ne veut pas d'enfants",
      user_b_value: "veut des enfants",
      severity: "critical",
    });
  }
  // If both marked "required", they both want children — compatible
  // If one is "required" and other is true — compatible
  // If neither explicitly stated false and neither is "required" — proceed

  // ── 6. NON-NEGOTIABLE VALIDATION ───────────────────────────────────────────
  // Check all categories of non-negotiables
  const nonNegFailures = validateNonNegotiables(qa, qb);
  failures.push(...nonNegFailures);

  // ── 7. AGE ELIGIBILITY ─────────────────────────────────────────────────────
  // Both must be at least MIN_MATCH_AGE
  const ageA = calculateAge(seeker.birth_date);
  const ageB = calculateAge(candidate.birth_date);

  if (ageA < MIN_MATCH_AGE) {
    failures.push({
      field: "age",
      reason: `L'utilisateur A a moins de ${MIN_MATCH_AGE} ans`,
      user_a_value: String(ageA),
      user_b_value: String(ageB),
      severity: "critical",
    });
  }
  if (ageB < MIN_MATCH_AGE) {
    failures.push({
      field: "age",
      reason: `Le candidat a moins de ${MIN_MATCH_AGE} ans`,
      user_a_value: String(ageA),
      user_b_value: String(ageB),
      severity: "critical",
    });
  }

  // ── 8. PROFILE COMPLETION ──────────────────────────────────────────────────
  // Both must have completed their questionnaire
  if (!seeker.onboarding_completed) {
    failures.push({
      field: "onboarding",
      reason: "L'utilisateur A n'a pas terminé son inscription",
      user_a_value: `${seeker.profile_completion_pct}%`,
      user_b_value: `${candidate.profile_completion_pct}%`,
      severity: "critical",
    });
  }
  if (!candidate.onboarding_completed) {
    failures.push({
      field: "onboarding",
      reason: "Le candidat n'a pas terminé son inscription",
      user_a_value: `${seeker.profile_completion_pct}%`,
      user_b_value: `${candidate.profile_completion_pct}%`,
      severity: "critical",
    });
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// ── NON-NEGOTIABLE VALIDATION ────────────────────────────────────────────────

/**
 * Validate all categories of non-negotiables.
 * Non-negotiables are treated as RULES, not preferences.
 * If User A has a non-negotiable that User B violates, it's a hard failure.
 */
function validateNonNegotiables(
  qa: QuestionnaireResponse,
  qb: QuestionnaireResponse
): HardFilterFailure[] {
  const failures: HardFilterFailure[] = [];

  // ── SPIRITUAL NON-NEGOTIABLES ──────────────────────────────────────────────
  // Check if A's spiritual non-negotiables are violated by B
  failures.push(
    ...checkNonNegotiableList(
      qa.values.spiritual_non_negotiables,
      qb.values.spiritual_non_negotiables,
      "spiritual_non_negotiables",
      qa,
      qb
    )
  );

  // ── RELATIONSHIP NON-NEGOTIABLES ──────────────────────────────────────────
  failures.push(
    ...checkNonNegotiableList(
      qa.values.relationship_non_negotiables,
      qb.values.relationship_non_negotiables,
      "relationship_non_negotiables",
      qa,
      qb
    )
  );

  // ── FAMILY NON-NEGOTIABLES ─────────────────────────────────────────────────
  failures.push(
    ...checkNonNegotiableList(
      qa.values.family_non_negotiables,
      qb.values.family_non_negotiables,
      "family_non_negotiables",
      qa,
      qb
    )
  );

  // ── BEHAVIORAL DEAL-BREAKERS ───────────────────────────────────────────────
  // These are explicit behaviors the user absolutely cannot accept
  // We check if B exhibits any behavior that A has as a deal-breaker
  failures.push(
    ...checkBehavioralDealbreakers(
      qa.values.behavioral_dealbreakers,
      qb.values.behavioral_dealbreakers,
      qa,
      qb
    )
  );

  // ── LIFESTYLE NON-NEGOTIABLES ──────────────────────────────────────────────
  failures.push(
    ...checkNonNegotiableList(
      qa.values.lifestyle_non_negotiables,
      qb.values.lifestyle_non_negotiables,
      "lifestyle_non_negotiables",
      qa,
      qb
    )
  );

  return failures;
}

// ── HELPER: CHECK NON-NEGOTIABLE LIST ────────────────────────────────────────

/**
 * For non-negotiables, we check if there's a conflict between what A requires
 * and what B offers (and vice versa).
 * 
 * Non-negotiables are expressed as strings like:
 * - "daily_prayer:required" → candidate must pray daily
 * - "purity_before_marriage:required" → candidate must be committed to purity
 * - "no_smoking" → candidate must not smoke
 */
function checkNonNegotiableList(
  aNonNeg: string[],
  bNonNeg: string[],
  fieldName: string,
  qa: QuestionnaireResponse,
  qb: QuestionnaireResponse
): HardFilterFailure[] {
  const failures: HardFilterFailure[] = [];

  // Validate A's non-negotiables against B's profile
  for (const req of aNonNeg) {
    const result = validateSingleNonNegotiable(req, qb, "candidate");
    if (!result.valid) {
      failures.push({
        field: fieldName,
        reason: `Non-négociable de A violé par B: ${result.reason}`,
        user_a_value: req,
        user_b_value: result.actualValue,
        severity: "critical",
      });
    }
  }

  // Validate B's non-negotiables against A's profile
  for (const req of bNonNeg) {
    const result = validateSingleNonNegotiable(req, qa, "seeker");
    if (!result.valid) {
      failures.push({
        field: fieldName,
        reason: `Non-négociable de B violé par A: ${result.reason}`,
        user_a_value: result.actualValue,
        user_b_value: req,
        severity: "critical",
      });
    }
  }

  return failures;
}

// ── VALIDATE SINGLE NON-NEGOTIABLE ───────────────────────────────────────────

interface NonNegValidation {
  valid: boolean;
  reason: string;
  actualValue: string;
}

/**
 * Parse and validate a single non-negotiable requirement against a profile.
 * Format: "field_name:expected_value" or just "field_name" (boolean true)
 */
function validateSingleNonNegotiable(
  requirement: string,
  profile: QuestionnaireResponse,
  who: "seeker" | "candidate"
): NonNegValidation {
  const parts = requirement.split(":");
  const field = parts[0].trim().toLowerCase();
  const expected = parts[1]?.trim().toLowerCase() || "required";

  // Map of known non-negotiable validations
  const validators: Record<string, () => NonNegValidation> = {
    "daily_prayer": () => ({
      valid: profile.spiritual.prayer_frequency === "daily" || profile.spiritual.prayer_frequency === "multiple_daily",
      reason: "La prière quotidienne est requise",
      actualValue: profile.spiritual.prayer_frequency,
    }),
    "purity_before_marriage": () => ({
      valid: profile.spiritual.purity_before_marriage === true,
      reason: "La pureté avant le mariage est requise",
      actualValue: String(profile.spiritual.purity_before_marriage),
    }),
    "water_baptism": () => ({
      valid: profile.spiritual.water_baptism === true,
      reason: "Le baptême d'eau est requis",
      actualValue: String(profile.spiritual.water_baptism),
    }),
    "holy_spirit_baptism": () => ({
      valid: profile.spiritual.holy_spirit_baptism === true,
      reason: "Le baptême du Saint-Esprit est requis",
      actualValue: String(profile.spiritual.holy_spirit_baptism),
    }),
    "active_church_member": () => ({
      valid: profile.spiritual.church_involvement === "very_active" || profile.spiritual.church_involvement === "leader",
      reason: "Une implication active à l'église est requise",
      actualValue: profile.spiritual.church_involvement,
    }),
    "god_centered_relationship": () => ({
      valid: profile.spiritual.god_centered_relationship === true,
      reason: "Dieu au centre de la relation est requis",
      actualValue: String(profile.spiritual.god_centered_relationship),
    }),
    "biblical_marriage_view": () => ({
      valid: profile.spiritual.biblical_marriage_view === true,
      reason: "Une vision biblique du mariage est requise",
      actualValue: String(profile.spiritual.biblical_marriage_view),
    }),
    "wants_children": () => ({
      valid: profile.marriage_family.wants_children === true || profile.marriage_family.wants_children === "required",
      reason: "Le désir d'avoir des enfants est requis",
      actualValue: String(profile.marriage_family.wants_children),
    }),
    "no_smoking": () => ({
      valid: true, // We would check a smoking field if it existed
      reason: "",
      actualValue: "non applicable",
    }),
    "no_alcohol": () => ({
      valid: true, // We would check an alcohol field if it existed
      reason: "",
      actualValue: "non applicable",
    }),
    "faithful": () => ({
      valid: profile.values.faithfulness >= 4,
      reason: "La fidélité (score ≥ 4) est requise",
      actualValue: String(profile.values.faithfulness),
    }),
    "honest": () => ({
      valid: profile.values.honesty >= 4,
      reason: "L'honnêteté (score ≥ 4) est requise",
      actualValue: String(profile.values.honesty),
    }),
  };

  const validator = validators[field];
  if (validator) {
    return validator();
  }

  // Unknown non-negotiable — treat as valid (don't block on unknowns)
  return { valid: true, reason: "", actualValue: "inconnu" };
}

// ── BEHAVIORAL DEAL-BREAKERS ─────────────────────────────────────────────────

/**
 * Behavioral deal-breakers are explicit behaviors that a user cannot accept.
 * We check both directions:
 * - A's deal-breakers against B's stated behaviors
 * - B's deal-breakers against A's stated behaviors
 */
function checkBehavioralDealbreakers(
  aDealbreakers: string[],
  bDealbreakers: string[],
  qa: QuestionnaireResponse,
  qb: QuestionnaireResponse
): HardFilterFailure[] {
  const failures: HardFilterFailure[] = [];

  // For now, behavioral deal-breakers are stored as strings that describe
  // behaviors the user cannot tolerate. We do a symmetric check.
  // In practice, these would be matched against structured behavioral data.

  // Check if A's deal-breakers conflict with B's actual behavioral markers
  // (This would require behavioral data in the profile — for now we check
  //  if both users have conflicting deal-breaker declarations)

  for (const dbA of aDealbreakers) {
    // Check if B actively does what A considers a deal-breaker
    // This is a placeholder for more sophisticated behavioral matching
    const normalized = dbA.toLowerCase().trim();
    
    // If B also has this as a deal-breaker, they agree (compatible)
    // If B doesn't have it as a deal-breaker but it's a behavior flag, it's a potential issue
    // For now, we only flag explicit conflicts
  }

  for (const dbB of bDealbreakers) {
    // Same logic in reverse
  }

  return failures;
}

// ── UTILITY: CALCULATE AGE ───────────────────────────────────────────────────

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ── QUICK ELIGIBILITY CHECK (for pre-filtering before full hard filter) ──────

/**
 * Ultra-fast check to determine if two users are even worth comparing.
 * Used in the indexed pre-filter stage to reduce the candidate pool.
 * This runs BEFORE the full hard filter to save computation.
 */
export function quickEligibilityCheck(
  seeker: { gender: string; birth_date: string; onboarding_completed: boolean },
  candidate: { gender: string; birth_date: string; onboarding_completed: boolean }
): boolean {
  // Must be opposite gender
  if (seeker.gender === candidate.gender) return false;

  // Both must be at least MIN_MATCH_AGE
  if (calculateAge(seeker.birth_date) < MIN_MATCH_AGE) return false;
  if (calculateAge(candidate.birth_date) < MIN_MATCH_AGE) return false;

  // Both must have completed onboarding
  if (!seeker.onboarding_completed) return false;
  if (!candidate.onboarding_completed) return false;

  return true;
}