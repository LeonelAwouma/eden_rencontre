// ============================================================================
//  Garden of Alliance — Reciprocal Matchmaking Engine
//  The main entry point for finding matches. Computes reciprocal compatibility,
//  ranks candidates, generates explanations, and returns only compatible profiles.
// ============================================================================

import type {
  EdenUserProfile,
  MatchingConfig,
  CompatibilityResult,
  ReciprocalMatchResult,
  MatchExplanation,
  DiscoveryMatch,
  DiscoveryResponse,
} from "./types";
import { DEFAULT_CONFIG, scoreToMatchLevel, scoreToMatchStatus } from "./config";
import { computeCompatibility } from "./scoring";
import { applyHardFilters, calculateAge, quickEligibilityCheck } from "./hard-filters";

// ── MAIN MATCHING FUNCTION ───────────────────────────────────────────────────

/**
 * Find all compatible matches for a given user.
 * 
 * Workflow:
 * 1. Retrieve eligible candidates (pre-filtered by DB)
 * 2. Apply hard filters
 * 3. Remove critical incompatibilities
 * 4. Compute compatibility(user → candidate)
 * 5. Compute compatibility(candidate → user)
 * 6. Calculate reciprocal score
 * 7. Apply threshold
 * 8. Rank candidates
 * 9. Remove redundant recommendations
 * 10. Generate explanations
 * 11. Return compatible profiles only
 */
export function findMatches(
  seeker: EdenUserProfile,
  candidates: EdenUserProfile[],
  config: MatchingConfig = DEFAULT_CONFIG
): DiscoveryResponse {
  const matches: DiscoveryMatch[] = [];

  // Guard: seeker must have completed onboarding
  if (!seeker.onboarding_completed || seeker.profile_completion_pct < config.min_profile_completion) {
    return {
      matches: [],
      total: 0,
      page: 1,
      limit: config.max_results,
      user_completion_pct: seeker.profile_completion_pct,
    };
  }

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === seeker.id) continue;

    // Skip incomplete candidates
    if (!candidate.onboarding_completed) continue;

    // Quick eligibility check (fast pre-filter)
    if (!quickEligibilityCheck(seeker, candidate)) continue;

    // Compute reciprocal compatibility
    const reciprocalResult = computeReciprocalMatch(seeker, candidate, config);

    // Only include if the mutual score passes the threshold
    if (reciprocalResult.mutual_score >= config.match_threshold && 
        reciprocalResult.match_status !== "NOT_COMPATIBLE") {
      
      const explanation = buildMatchExplanation(reciprocalResult);

      matches.push({
        user_id: candidate.id,
        name: candidate.name,
        age: calculateAge(candidate.birth_date),
        city: candidate.city,
        country: candidate.country,
        avatar_url: candidate.avatar_url,
        profession: candidate.profession,
        bio: candidate.bio,
        score: reciprocalResult.mutual_score,
        match_level: reciprocalResult.match_level,
        match_status: reciprocalResult.match_status,
        reasons: reciprocalResult.combined_strengths,
        differences: reciprocalResult.combined_differences,
        explanation,
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Remove redundant: if two matches are from the same city with very similar scores,
  // diversify results (optional — ensures variety in recommendations)
  const diversified = diversifyResults(matches, config.max_results);

  return {
    matches: diversified,
    total: diversified.length,
    page: 1,
    limit: config.max_results,
    user_completion_pct: seeker.profile_completion_pct,
  };
}

// ── RECIPROCAL MATCH COMPUTATION ─────────────────────────────────────────────

/**
 * Compute reciprocal compatibility between two users.
 * 
 * This ensures that BOTH users' expectations are met:
 * - score_a_to_b: How well B matches A's expectations
 * - score_b_to_a: How well A matches B's expectations
 * - mutual_score: MIN of both (prevents one-sided compatibility)
 */
export function computeReciprocalMatch(
  userA: EdenUserProfile,
  userB: EdenUserProfile,
  config: MatchingConfig = DEFAULT_CONFIG
): ReciprocalMatchResult {
  // Compute A→B compatibility
  const compatAToB = computeCompatibility(userA, userB, config);
  
  // If A→B fails hard filters, no need to compute B→A
  if (!compatAToB.hard_filter_passed) {
    return {
      score_a_to_b: 0,
      score_b_to_a: 0,
      mutual_score: 0,
      compatibility_a_to_b: compatAToB,
      compatibility_b_to_a: {
        overall_score: 0,
        categories: [],
        strengths: [],
        differences: [],
        hard_filter_passed: false,
        hard_filter_failures: compatAToB.hard_filter_failures,
        match_status: "NOT_COMPATIBLE",
        match_level: "no_match",
      },
      match_status: "NOT_COMPATIBLE",
      match_level: "no_match",
      combined_strengths: [],
      combined_differences: ["Incompatibilités fondamentales détectées"],
    };
  }

  // Compute B→A compatibility
  const compatBToA = computeCompatibility(userB, userA, config);

  // If B→A fails hard filters
  if (!compatBToA.hard_filter_passed) {
    return {
      score_a_to_b: compatAToB.overall_score,
      score_b_to_a: 0,
      mutual_score: 0,
      compatibility_a_to_b: compatAToB,
      compatibility_b_to_a: compatBToA,
      match_status: "NOT_COMPATIBLE",
      match_level: "no_match",
      combined_strengths: [],
      combined_differences: ["Incompatibilités fondamentales détectées (direction B→A)"],
    };
  }

  // Calculate reciprocal scores
  const scoreAToB = compatAToB.overall_score;
  const scoreBToA = compatBToA.overall_score;
  
  // Mutual score: MIN ensures both users' expectations are met
  // We use MIN as the primary strategy, but also compute a weighted average
  // for display purposes
  const mutualScore = Math.min(scoreAToB, scoreBToA);
  
  // Determine match status based on mutual score
  const matchLevel = scoreToMatchLevel(mutualScore, config);
  const matchStatus = scoreToMatchStatus(mutualScore, true, config);

  // Combine strengths and differences from both directions
  const combinedStrengths = [
    ...new Set([...compatAToB.strengths, ...compatBToA.strengths]),
  ].slice(0, 5);

  const combinedDifferences = [
    ...new Set([...compatAToB.differences, ...compatBToA.differences]),
  ].slice(0, 4);

  return {
    score_a_to_b: scoreAToB,
    score_b_to_a: scoreBToA,
    mutual_score: mutualScore,
    compatibility_a_to_b: compatAToB,
    compatibility_b_to_a: compatBToA,
    match_status: matchStatus,
    match_level: matchLevel,
    combined_strengths: combinedStrengths,
    combined_differences: combinedDifferences,
  };
}

// ── MATCH EXPLANATION BUILDER ────────────────────────────────────────────────

/**
 * Build a human-readable match explanation for the UI.
 * Uses the A→B direction as the primary explanation (what the seeker sees).
 */
export function buildMatchExplanation(reciprocal: ReciprocalMatchResult): MatchExplanation {
  const compat = reciprocal.compatibility_a_to_b;
  
  // Extract category scores
  const categoryScores: Record<string, number> = {};
  for (const cat of compat.categories) {
    categoryScores[cat.category] = cat.score;
  }

  return {
    compatibility_score: reciprocal.mutual_score,
    spiritual_score: categoryScores["spiritual"] ?? 0,
    marriage_family_score: categoryScores["marriage_family"] ?? 0,
    values_score: categoryScores["values"] ?? 0,
    personality_score: categoryScores["personality"] ?? 0,
    lifestyle_score: categoryScores["lifestyle"] ?? 0,
    preferences_score: categoryScores["preferences"] ?? 0,
    strengths: reciprocal.combined_strengths,
    differences: reciprocal.combined_differences,
    match_status: reciprocal.match_status,
    match_level: reciprocal.match_level,
  };
}

// ── RESULT DIVERSIFICATION ───────────────────────────────────────────────────

/**
 * Diversify results to avoid showing too many similar profiles.
 * Ensures variety in cities, professions, and match levels.
 */
function diversifyResults(matches: DiscoveryMatch[], maxResults: number): DiscoveryMatch[] {
  if (matches.length <= maxResults) return matches;

  const selected: DiscoveryMatch[] = [];
  const seenCities = new Set<string>();
  const seenLevels = new Map<string, number>();

  // First pass: select top matches ensuring diversity
  for (const match of matches) {
    if (selected.length >= maxResults) break;

    const cityKey = `${match.city}-${match.country}`.toLowerCase();
    const cityCount = seenCities.has(cityKey) ? 1 : 0;
    const levelCount = seenLevels.get(match.match_level) ?? 0;

    // Accept if: top 3 always, or if we haven't over-represented this city/level
    if (selected.length < 3 || (cityCount < 3 && levelCount < maxResults * 0.6)) {
      selected.push(match);
      seenCities.add(cityKey);
      seenLevels.set(match.match_level, levelCount + 1);
    }
  }

  // Fill remaining slots with highest-scoring non-selected matches
  if (selected.length < maxResults) {
    for (const match of matches) {
      if (selected.length >= maxResults) break;
      if (!selected.find(s => s.user_id === match.user_id)) {
        selected.push(match);
      }
    }
  }

  return selected;
}

// ── SINGLE PAIR MATCH CHECK ──────────────────────────────────────────────────

/**
 * Check if two specific users are a match.
 * Used when viewing a specific profile or when an admin creates a match.
 */
export function checkMatch(
  userA: EdenUserProfile,
  userB: EdenUserProfile,
  config: MatchingConfig = DEFAULT_CONFIG
): ReciprocalMatchResult {
  return computeReciprocalMatch(userA, userB, config);
}

// ── COMPATIBILITY EXPLANATION FOR UI ─────────────────────────────────────────

/**
 * Generate a simple text explanation of why two users match (or don't).
 * Designed for display in the UI.
 */
export function generateMatchSummary(
  reciprocal: ReciprocalMatchResult
): { score: number; why: string[]; discuss: string[]; status: string } {
  const why: string[] = [];
  const discuss: string[] = [];

  if (reciprocal.mutual_score >= 90) {
    why.push("✨ Compatibilité exceptionnelle");
  } else if (reciprocal.mutual_score >= 80) {
    why.push("💚 Très forte compatibilité");
  } else if (reciprocal.mutual_score >= 70) {
    why.push("💙 Bonne compatibilité");
  }

  why.push(...reciprocal.combined_strengths);
  discuss.push(...reciprocal.combined_differences);

  // Add reciprocal insight
  const diff = Math.abs(reciprocal.score_a_to_b - reciprocal.score_b_to_a);
  if (diff > 10) {
    discuss.push(`Écart de compatibilité entre les deux directions (${diff} points)`);
  }

  return {
    score: reciprocal.mutual_score,
    why,
    discuss,
    status: reciprocal.match_status,
  };
}