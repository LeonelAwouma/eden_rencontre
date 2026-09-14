// ============================================================================
//  GARDEN OF ALLIANCE — Matchmaking Engine: Configuration
//  All weights, thresholds, and rules are configurable here.
//  Never hardcode these values in the frontend or scoring logic.
// ============================================================================

import type { MatchingConfig, MatchingWeights, FieldDefinition } from "./types";

// ── DEFAULT WEIGHTS ──────────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS: MatchingWeights = {
  spiritual: 0.30,
  marriage_family: 0.25,
  values: 0.20,
  personality: 0.10,
  lifestyle: 0.10,
  preferences: 0.05,
};

// ── DEFAULT CONFIGURATION ────────────────────────────────────────────────────

export const DEFAULT_CONFIG: MatchingConfig = {
  weights: DEFAULT_WEIGHTS,
  match_threshold: 70,
  weak_threshold: 60,
  strong_threshold: 80,
  exceptional_threshold: 90,
  max_results: 50,
  min_profile_completion: 60,
  enable_semantic_analysis: true,
};

// Minimum age to be matched. Kept in sync with MIN_AGE in src/lib/auth.ts
// (the platform's actual signup minimum) — NOT the 21+ figure in the README,
// which predates this being wired into the live product.
export const MIN_MATCH_AGE = 18;

// ── SCORE TO MATCH LEVEL ─────────────────────────────────────────────────────

export function scoreToMatchLevel(score: number, config: MatchingConfig) {
  if (score < config.weak_threshold) return "no_match" as const;
  if (score < config.match_threshold) return "weak_compatibility" as const;
  if (score < config.strong_threshold) return "good_match" as const;
  if (score < config.exceptional_threshold) return "very_strong_match" as const;
  return "exceptional_match" as const;
}

export function scoreToMatchStatus(score: number, hardFilterPassed: boolean, config: MatchingConfig) {
  if (!hardFilterPassed) return "NOT_COMPATIBLE" as const;
  if (score < config.match_threshold) return "NOT_COMPATIBLE" as const;
  if (score < config.strong_threshold) return "POTENTIAL_MATCH" as const;
  if (score < config.exceptional_threshold) return "RECOMMENDED_MATCH" as const;
  return "STRONG_MATCH" as const;
}

// ── COMPATIBLE DENOMINATIONS ─────────────────────────────────────────────────
// Pentecostal platform, but allow compatible charismatic/evangelical denominations

export const COMPATIBLE_DENOMINATIONS: Record<string, string[]> = {
  "pentecostal": ["pentecostal", "charismatic", "assembly_of_god"],
  "charismatic": ["pentecostal", "charismatic"],
  "assembly_of_god": ["pentecostal", "assembly_of_god"],
  "baptist": ["baptist", "evangelical"],
  "evangelical": ["evangelical", "baptist", "pentecostal"],
  "methodist": ["methodist"],
  "adventist": ["adventist"],
  "catholic": ["catholic"],
  "other": ["other"],
};

// ── MARRIAGE TIMELINE COMPATIBILITY ──────────────────────────────────────────
// How compatible are different marriage timelines

export const TIMELINE_COMPATIBILITY: Record<string, Record<string, number>> = {
  "within_6_months": {
    "within_6_months": 100,
    "within_1_year": 80,
    "within_2_years": 50,
    "within_5_years": 20,
    "no_timeline": 10,
  },
  "within_1_year": {
    "within_6_months": 80,
    "within_1_year": 100,
    "within_2_years": 75,
    "within_5_years": 40,
    "no_timeline": 25,
  },
  "within_2_years": {
    "within_6_months": 50,
    "within_1_year": 75,
    "within_2_years": 100,
    "within_5_years": 65,
    "no_timeline": 45,
  },
  "within_5_years": {
    "within_6_months": 20,
    "within_1_year": 40,
    "within_2_years": 65,
    "within_5_years": 100,
    "no_timeline": 70,
  },
  "no_timeline": {
    "within_6_months": 10,
    "within_1_year": 25,
    "within_2_years": 45,
    "within_5_years": 70,
    "no_timeline": 80,
  },
};

// ── CONFLICT STYLE COMPATIBILITY ─────────────────────────────────────────────
// Some conflict styles complement each other, others clash

export const CONFLICT_STYLE_MATRIX: Record<string, Record<string, number>> = {
  "collaborative": {
    "collaborative": 95, "compromising": 90, "accommodating": 75,
    "assertive": 65, "avoidant": 45, "confrontational": 40,
  },
  "compromising": {
    "collaborative": 90, "compromising": 85, "accommodating": 80,
    "assertive": 70, "avoidant": 50, "confrontational": 45,
  },
  "accommodating": {
    "collaborative": 75, "compromising": 80, "accommodating": 70,
    "assertive": 60, "avoidant": 55, "confrontational": 50,
  },
  "assertive": {
    "collaborative": 65, "compromising": 70, "accommodating": 60,
    "assertive": 60, "avoidant": 40, "confrontational": 45,
  },
  "avoidant": {
    "collaborative": 45, "compromising": 50, "accommodating": 55,
    "assertive": 40, "avoidant": 35, "confrontational": 30,
  },
  "confrontational": {
    "collaborative": 40, "compromising": 45, "accommodating": 50,
    "assertive": 45, "avoidant": 30, "confrontational": 35,
  },
};

// ── PERSONALITY INTERACTION MATRIX ───────────────────────────────────────────
// Classifies personality trait interactions

export type InteractionType = "complementary" | "compatible" | "neutral" | "tension" | "incompatible";

export function classifyIntroversionInteraction(a: number, b: number): { type: InteractionType; score: number } {
  const diff = Math.abs(a - b);
  if (diff === 0) return { type: "compatible", score: 95 };
  if (diff === 1) return { type: "compatible", score: 85 };
  if (diff === 2) return { type: "complementary", score: 75 };
  if (diff === 3) return { type: "neutral", score: 60 };
  return { type: "tension", score: 45 };
}

export function classifySocialNeedsInteraction(a: number, b: number): { type: InteractionType; score: number } {
  const diff = Math.abs(a - b);
  if (diff === 0) return { type: "compatible", score: 90 };
  if (diff === 1) return { type: "compatible", score: 80 };
  if (diff === 2) return { type: "complementary", score: 70 };
  if (diff === 3) return { type: "tension", score: 55 };
  return { type: "incompatible", score: 35 };
}

// ── COMMUNICATION STYLE COMPATIBILITY ────────────────────────────────────────

export const COMMUNICATION_COMPATIBILITY: Record<string, Record<string, { score: number; type: InteractionType }>> = {
  "direct": {
    "direct": { score: 85, type: "compatible" },
    "gentle": { score: 70, type: "complementary" },
    "analytical": { score: 80, type: "compatible" },
    "expressive": { score: 65, type: "complementary" },
    "reserved": { score: 55, type: "tension" },
  },
  "gentle": {
    "direct": { score: 70, type: "complementary" },
    "gentle": { score: 90, type: "compatible" },
    "analytical": { score: 65, type: "neutral" },
    "expressive": { score: 75, type: "compatible" },
    "reserved": { score: 80, type: "compatible" },
  },
  "analytical": {
    "direct": { score: 80, type: "compatible" },
    "gentle": { score: 65, type: "neutral" },
    "analytical": { score: 85, type: "compatible" },
    "expressive": { score: 55, type: "tension" },
    "reserved": { score: 70, type: "compatible" },
  },
  "expressive": {
    "direct": { score: 65, type: "complementary" },
    "gentle": { score: 75, type: "compatible" },
    "analytical": { score: 55, type: "tension" },
    "expressive": { score: 80, type: "compatible" },
    "reserved": { score: 60, type: "complementary" },
  },
  "reserved": {
    "direct": { score: 55, type: "tension" },
    "gentle": { score: 80, type: "compatible" },
    "analytical": { score: 70, type: "compatible" },
    "expressive": { score: 60, type: "complementary" },
    "reserved": { score: 75, type: "compatible" },
  },
};

// ── AFFECTION STYLE COMPATIBILITY ────────────────────────────────────────────

export const AFFECTION_COMPATIBILITY: Record<string, Record<string, number>> = {
  "words":           { "words": 90, "touch": 70, "acts_of_service": 75, "quality_time": 80, "gifts": 65 },
  "touch":           { "words": 70, "touch": 90, "acts_of_service": 65, "quality_time": 80, "gifts": 60 },
  "acts_of_service": { "words": 75, "touch": 65, "acts_of_service": 90, "quality_time": 80, "gifts": 70 },
  "quality_time":    { "words": 80, "touch": 80, "acts_of_service": 80, "quality_time": 95, "gifts": 65 },
  "gifts":           { "words": 65, "touch": 60, "acts_of_service": 70, "quality_time": 65, "gifts": 85 },
};

// ── WORK/LIFE BALANCE COMPATIBILITY ──────────────────────────────────────────

export const WORK_LIFE_COMPATIBILITY: Record<string, Record<string, number>> = {
  "career_focused": { "career_focused": 70, "balanced": 75, "family_first": 50 },
  "balanced":       { "career_focused": 75, "balanced": 95, "family_first": 80 },
  "family_first":   { "career_focused": 50, "balanced": 80, "family_first": 95 },
};

// ── DAILY RHYTHM COMPATIBILITY ───────────────────────────────────────────────

export const DAILY_RHYTHM_COMPATIBILITY: Record<string, Record<string, number>> = {
  "early_bird": { "early_bird": 95, "night_owl": 50, "flexible": 80 },
  "night_owl":  { "early_bird": 50, "night_owl": 95, "flexible": 80 },
  "flexible":   { "early_bird": 80, "night_owl": 80, "flexible": 90 },
};

// ── CHURCH INVOLVEMENT LEVELS (numeric for scale comparison) ─────────────────

export const CHURCH_INVOLVEMENT_SCALE: Record<string, number> = {
  "none": 0,
  "occasional": 1,
  "regular": 2,
  "very_active": 3,
  "leader": 4,
};

// ── PRAYER/BIBLE FREQUENCY SCALE ─────────────────────────────────────────────

export const FREQUENCY_SCALE: Record<string, number> = {
  "rarely": 0,
  "sometimes": 1,
  "weekly": 2,
  "daily": 3,
  "multiple_daily": 4,
};

// ── SOCIAL MEDIA USAGE SCALE ─────────────────────────────────────────────────

export const SOCIAL_MEDIA_SCALE: Record<string, number> = {
  "none": 0,
  "minimal": 1,
  "moderate": 2,
  "heavy": 3,
};

// ── ORGANIZATION LEVEL SCALE ─────────────────────────────────────────────────

export const ORGANIZATION_SCALE: Record<string, number> = {
  "very_organized": 4,
  "organized": 3,
  "flexible": 2,
  "spontaneous": 1,
  "very_spontaneous": 0,
};

// ── RELATIONAL RHYTHM COMPATIBILITY ──────────────────────────────────────────

export const RELATIONAL_RHYTHM_COMPATIBILITY: Record<string, Record<string, number>> = {
  "fast_paced":            { "fast_paced": 80, "steady": 70, "slow_and_intentional": 45 },
  "steady":                { "fast_paced": 70, "steady": 95, "slow_and_intentional": 80 },
  "slow_and_intentional":  { "fast_paced": 45, "steady": 80, "slow_and_intentional": 90 },
};

// ── FAMILY VISITS FREQUENCY SCALE ────────────────────────────────────────────

export const FAMILY_VISITS_SCALE: Record<string, number> = {
  "daily": 4,
  "weekly": 3,
  "biweekly": 2,
  "monthly": 1,
  "occasional": 0,
};

// ── EXCLUDED SCORING DATA ────────────────────────────────────────────────────
// These fields must NEVER influence compatibility scores

export const EXCLUDED_FIELDS = [
  "blood_group",
  "medical_conditions",
  "general_health",
  "skin_tone",
  "body_shape",
  "physical_appearance",
  "height",
  "weight",
];

// ── FIELD DEFINITIONS MATRIX ─────────────────────────────────────────────────
// Complete mapping of every questionnaire field to its category, classification, weight, comparison type, and hard filter status

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // ═══ SPIRITUAL (30%) ═══════════════════════════════════════════════════════
  {
    field_name: "is_christian",
    category: "spiritual",
    classification: "REQUIRED",
    weight: 0.0,
    comparison_type: "boolean_match",
    is_hard_filter: true,
    hard_filter_type: "required_match",
    description: "Must be a born-again Christian",
  },
  {
    field_name: "denomination",
    category: "spiritual",
    classification: "REQUIRED",
    weight: 0.0,
    comparison_type: "set_overlap",
    is_hard_filter: true,
    hard_filter_type: "required_match",
    description: "Must be Pentecostal or compatible denomination",
  },
  {
    field_name: "faith_importance",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.15,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of faith in daily life",
  },
  {
    field_name: "church_involvement",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.15,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Level of church involvement",
  },
  {
    field_name: "prayer_frequency",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.12,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "How often the user prays",
  },
  {
    field_name: "bible_meditation",
    category: "spiritual",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Frequency of Bible meditation",
  },
  {
    field_name: "water_baptism",
    category: "spiritual",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "boolean_match",
    is_hard_filter: false,
    description: "Has received water baptism",
  },
  {
    field_name: "holy_spirit_baptism",
    category: "spiritual",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "boolean_match",
    is_hard_filter: false,
    description: "Has received Holy Spirit baptism",
  },
  {
    field_name: "relationship_with_god",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.12,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Self-assessed relationship with God (1-5)",
  },
  {
    field_name: "ministry_involvement",
    category: "spiritual",
    classification: "IMPORTANT",
    weight: 0.06,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Types of ministry involvement",
  },
  {
    field_name: "evangelism_active",
    category: "spiritual",
    classification: "IMPORTANT",
    weight: 0.05,
    comparison_type: "boolean_match",
    is_hard_filter: false,
    description: "Active in evangelism",
  },
  {
    field_name: "spiritual_gifts",
    category: "spiritual",
    classification: "PREFERENCE",
    weight: 0.03,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Spiritual gifts identified",
  },
  {
    field_name: "purity_before_marriage",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.06,
    comparison_type: "boolean_match",
    is_hard_filter: false,
    description: "Commitment to purity before marriage",
  },
  {
    field_name: "biblical_marriage_view",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.05,
    comparison_type: "boolean_match",
    is_hard_filter: false,
    description: "Biblical understanding of marriage",
  },
  {
    field_name: "god_centered_relationship",
    category: "spiritual",
    classification: "HIGH_PRIORITY",
    weight: 0.05,
    comparison_type: "boolean_match",
    is_hard_filter: false,
    description: "Keep God at center of relationship",
  },

  // ═══ MARRIAGE & FAMILY (25%) ═══════════════════════════════════════════════
  {
    field_name: "wants_children",
    category: "marriage_family",
    classification: "REQUIRED",
    weight: 0.0,
    comparison_type: "boolean_match",
    is_hard_filter: true,
    hard_filter_type: "required_match",
    description: "Desire for children (must align)",
  },
  {
    field_name: "marriage_desire",
    category: "marriage_family",
    classification: "REQUIRED",
    weight: 0.0,
    comparison_type: "minimum_threshold",
    is_hard_filter: true,
    hard_filter_type: "minimum_threshold",
    description: "Must desire marriage (minimum score 2)",
  },
  {
    field_name: "marriage_timeline",
    category: "marriage_family",
    classification: "HIGH_PRIORITY",
    weight: 0.20,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "When the user wants to get married",
  },
  {
    field_name: "emotional_readiness",
    category: "marriage_family",
    classification: "HIGH_PRIORITY",
    weight: 0.12,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Emotional readiness for marriage (1-5)",
  },
  {
    field_name: "spiritual_readiness",
    category: "marriage_family",
    classification: "HIGH_PRIORITY",
    weight: 0.12,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Spiritual readiness for marriage (1-5)",
  },
  {
    field_name: "financial_readiness",
    category: "marriage_family",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Financial readiness for marriage (1-5)",
  },
  {
    field_name: "desired_children_count",
    category: "marriage_family",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "range",
    is_hard_filter: false,
    description: "Desired number of children",
  },
  {
    field_name: "parenting_vision",
    category: "marriage_family",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "text_similarity",
    is_hard_filter: false,
    description: "Christian parenting vision",
  },
  {
    field_name: "family_values",
    category: "marriage_family",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Core family values",
  },
  {
    field_name: "work_life_balance",
    category: "marriage_family",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Work/life balance preference",
  },
  {
    field_name: "ministry_vision",
    category: "marriage_family",
    classification: "PREFERENCE",
    weight: 0.05,
    comparison_type: "text_similarity",
    is_hard_filter: false,
    description: "Ministry vision as couple",
  },
  {
    field_name: "future_residence",
    category: "marriage_family",
    classification: "PREFERENCE",
    weight: 0.05,
    comparison_type: "text_similarity",
    is_hard_filter: false,
    description: "Future residence plans",
  },

  // ═══ VALUES (20%) ══════════════════════════════════════════════════════════
  {
    field_name: "faithfulness",
    category: "values",
    classification: "HIGH_PRIORITY",
    weight: 0.15,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of faithfulness (1-5)",
  },
  {
    field_name: "honesty",
    category: "values",
    classification: "HIGH_PRIORITY",
    weight: 0.15,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of honesty (1-5)",
  },
  {
    field_name: "respect",
    category: "values",
    classification: "HIGH_PRIORITY",
    weight: 0.12,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of respect (1-5)",
  },
  {
    field_name: "humility",
    category: "values",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of humility (1-5)",
  },
  {
    field_name: "responsibility",
    category: "values",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of responsibility (1-5)",
  },
  {
    field_name: "conflict_resolution",
    category: "values",
    classification: "HIGH_PRIORITY",
    weight: 0.12,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "How the user resolves conflicts",
  },
  {
    field_name: "financial_stewardship",
    category: "values",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Approach to financial stewardship",
  },
  {
    field_name: "family_commitment",
    category: "values",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Level of family commitment (1-5)",
  },
  {
    field_name: "spiritual_discipline",
    category: "values",
    classification: "IMPORTANT",
    weight: 0.07,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Spiritual discipline consistency (1-5)",
  },
  {
    field_name: "personal_boundaries",
    category: "values",
    classification: "IMPORTANT",
    weight: 0.07,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Strength of personal boundaries (1-5)",
  },

  // ═══ PERSONALITY (10%) ═════════════════════════════════════════════════════
  {
    field_name: "communication_style",
    category: "personality",
    classification: "HIGH_PRIORITY",
    weight: 0.20,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "How the user communicates",
  },
  {
    field_name: "emotional_expression",
    category: "personality",
    classification: "IMPORTANT",
    weight: 0.12,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Level of emotional expression",
  },
  {
    field_name: "conflict_style",
    category: "personality",
    classification: "HIGH_PRIORITY",
    weight: 0.18,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "How the user handles conflict",
  },
  {
    field_name: "introversion_extraversion",
    category: "personality",
    classification: "IMPORTANT",
    weight: 0.15,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Introversion/extraversion scale (1-5)",
  },
  {
    field_name: "social_needs",
    category: "personality",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Social needs level (1-5)",
  },
  {
    field_name: "leadership_tendencies",
    category: "personality",
    classification: "IMPORTANT",
    weight: 0.08,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Leadership tendencies (1-5)",
  },
  {
    field_name: "affection_style",
    category: "personality",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Primary love language / affection style",
  },
  {
    field_name: "relational_rhythm",
    category: "personality",
    classification: "PREFERENCE",
    weight: 0.07,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Pace of the relationship",
  },

  // ═══ LIFESTYLE (10%) ═══════════════════════════════════════════════════════
  {
    field_name: "daily_rhythm",
    category: "lifestyle",
    classification: "PREFERENCE",
    weight: 0.10,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Morning vs evening person",
  },
  {
    field_name: "career_ambition",
    category: "lifestyle",
    classification: "IMPORTANT",
    weight: 0.15,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Career ambition level (1-5)",
  },
  {
    field_name: "church_activities_frequency",
    category: "lifestyle",
    classification: "HIGH_PRIORITY",
    weight: 0.20,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "How often involved in church activities",
  },
  {
    field_name: "family_visits_frequency",
    category: "lifestyle",
    classification: "IMPORTANT",
    weight: 0.15,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "How often visits family",
  },
  {
    field_name: "social_life_level",
    category: "lifestyle",
    classification: "PREFERENCE",
    weight: 0.10,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Social life activity level (1-5)",
  },
  {
    field_name: "technology_use",
    category: "lifestyle",
    classification: "PREFERENCE",
    weight: 0.05,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Technology usage level (1-5)",
  },
  {
    field_name: "social_media_usage",
    category: "lifestyle",
    classification: "PREFERENCE",
    weight: 0.05,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Social media usage level",
  },
  {
    field_name: "daily_organization",
    category: "lifestyle",
    classification: "PREFERENCE",
    weight: 0.10,
    comparison_type: "complementary",
    is_hard_filter: false,
    description: "Daily organization preference",
  },
  {
    field_name: "cultural_traditions_importance",
    category: "lifestyle",
    classification: "IMPORTANT",
    weight: 0.10,
    comparison_type: "scale_distance",
    is_hard_filter: false,
    description: "Importance of cultural traditions (1-5)",
  },

  // ═══ PREFERENCES (5%) — these use preference_filter comparison ═════════════
  {
    field_name: "preferred_age_range",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.20,
    comparison_type: "preference_filter",
    is_hard_filter: false,
    description: "Does the other user fall within preferred age range?",
  },
  {
    field_name: "max_distance_km",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.20,
    comparison_type: "preference_filter",
    is_hard_filter: false,
    description: "Is the other user within acceptable distance?",
  },
  {
    field_name: "preferred_languages",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.15,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Shared languages",
  },
  {
    field_name: "preferred_regions",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.10,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Preferred regions/ethnicities",
  },
  {
    field_name: "preferred_education",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.10,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Preferred education level",
  },
  {
    field_name: "hobbies",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.15,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Shared hobbies",
  },
  {
    field_name: "interests",
    category: "preferences",
    classification: "PREFERENCE",
    weight: 0.10,
    comparison_type: "set_overlap",
    is_hard_filter: false,
    description: "Shared interests",
  },
];