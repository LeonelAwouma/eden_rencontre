// ============================================================================
//  Eden Connexion — Matchmaking Engine: Barrel Export
//  Single entry point for all matching functionality
// ============================================================================

// Types
export type {
  FieldClassification,
  QuestionCategory,
  MatchStatus,
  MatchLevel,
  SpiritualProfile,
  MarriageFamilyProfile,
  ValuesProfile,
  PersonalityProfile,
  LifestyleProfile,
  PreferencesProfile,
  QuestionnaireResponse,
  EdenUserProfile,
  ExtractedAttribute,
  SemanticProfile,
  HardFilterResult,
  HardFilterFailure,
  CategoryScore,
  ScoreDetail,
  CompatibilityResult,
  ReciprocalMatchResult,
  MatchExplanation,
  DiscoveryMatch,
  DiscoveryResponse,
  MatchingWeights,
  MatchingConfig,
  FieldDefinition,
} from "./types";

// Configuration
export {
  DEFAULT_WEIGHTS,
  DEFAULT_CONFIG,
  scoreToMatchLevel,
  scoreToMatchStatus,
  COMPATIBLE_DENOMINATIONS,
  TIMELINE_COMPATIBILITY,
  CONFLICT_STYLE_MATRIX,
  FIELD_DEFINITIONS,
  EXCLUDED_FIELDS,
} from "./config";

// Hard Filters
export { applyHardFilters, calculateAge, quickEligibilityCheck } from "./hard-filters";

// Scoring Engine
export { computeCompatibility } from "./scoring";

// Main Engine
export { findMatches, computeReciprocalMatch, checkMatch, generateMatchSummary, buildMatchExplanation } from "./engine";

// Semantic Analysis
export { extractSemanticProfile, compareSemanticProfiles } from "./semantic";