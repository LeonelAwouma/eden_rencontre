// ============================================================================
//  Eden Connexion — Christian Matchmaking Engine: Type Definitions
//  Deterministic, explainable, reciprocal compatibility engine
//  Designed for Pentecostal Cameroonian adults aged 21+
// ============================================================================

// ── FIELD CLASSIFICATION ─────────────────────────────────────────────────────

/** Every questionnaire field belongs to one classification */
export type FieldClassification =
  | "REQUIRED"        // Mandatory — failure immediately prevents matching
  | "HIGH_PRIORITY"   // Strongly influences compatibility
  | "IMPORTANT"       // Significant influence
  | "PREFERENCE"      // Minor influence
  | "INFORMATION_ONLY"; // Displayed on profile only, no auto-scoring

/** Question categories matching the priority order */
export type QuestionCategory =
  | "spiritual"         // 30%
  | "marriage_family"   // 25%
  | "values"            // 20%
  | "personality"       // 10%
  | "lifestyle"         // 10%
  | "preferences";      // 5%

// ── MATCH STATUS ─────────────────────────────────────────────────────────────

export type MatchStatus =
  | "NOT_COMPATIBLE"
  | "POTENTIAL_MATCH"
  | "RECOMMENDED_MATCH"
  | "STRONG_MATCH";

export type MatchLevel =
  | "no_match"
  | "weak_compatibility"
  | "good_match"
  | "very_strong_match"
  | "exceptional_match";

// ── SPIRITUAL PROFILE ────────────────────────────────────────────────────────

export interface SpiritualProfile {
  /** Is the user a born-again Christian? */
  is_christian: boolean;
  /** Denomination: must be Pentecostal or compatible */
  denomination: string;
  /** Importance of faith in daily life (1-5) */
  faith_importance: number;
  /** Church involvement level */
  church_involvement: "none" | "occasional" | "regular" | "very_active" | "leader";
  /** Prayer frequency */
  prayer_frequency: "rarely" | "sometimes" | "weekly" | "daily" | "multiple_daily";
  /** Bible meditation frequency */
  bible_meditation: "rarely" | "sometimes" | "weekly" | "daily" | "multiple_daily";
  /** Has received water baptism */
  water_baptism: boolean;
  /** Has received Holy Spirit baptism */
  holy_spirit_baptism: boolean;
  /** Self-assessed relationship with God (1-5) */
  relationship_with_god: number;
  /** Ministry involvement */
  ministry_involvement: string[];
  /** Active in evangelism */
  evangelism_active: boolean;
  /** Spiritual gifts */
  spiritual_gifts: string[];
  /** Service in church */
  church_service: string[];
  /** Commitment to purity before marriage */
  purity_before_marriage: boolean;
  /** Biblical understanding of marriage */
  biblical_marriage_view: boolean;
  /** Keep God at center of relationship */
  god_centered_relationship: boolean;
}

// ── MARRIAGE & FAMILY PROFILE ────────────────────────────────────────────────

export interface MarriageFamilyProfile {
  /** Desire for marriage (1-5, 5 = urgent/strong desire) */
  marriage_desire: number;
  /** Marriage timeline */
  marriage_timeline: "within_6_months" | "within_1_year" | "within_2_years" | "within_5_years" | "no_timeline";
  /** Emotional readiness (1-5) */
  emotional_readiness: number;
  /** Spiritual readiness for marriage (1-5) */
  spiritual_readiness: number;
  /** Financial readiness (1-5) */
  financial_readiness: number;
  /** Wants children */
  wants_children: boolean | "required";
  /** Desired number of children */
  desired_children_count: number | null;
  /** Christian parenting vision */
  parenting_vision: string;
  /** Family values */
  family_values: string[];
  /** Work/life balance preference */
  work_life_balance: "career_focused" | "balanced" | "family_first";
  /** Future residence plans */
  future_residence: string;
  /** Ministry vision as couple */
  ministry_vision: string;
  /** Long-term life goals (open text) */
  long_term_goals: string;
}

// ── VALUES PROFILE ───────────────────────────────────────────────────────────

export interface ValuesProfile {
  /** Core values ranked/importance (1-5 each) */
  faithfulness: number;
  honesty: number;
  respect: number;
  humility: number;
  responsibility: number;
  forgiveness: number;
  communication: number;
  /** Conflict resolution approach */
  conflict_resolution: "avoidance" | "compromise" | "collaborative" | "assertive" | "prayer_first";
  /** Financial stewardship approach */
  financial_stewardship: "tithe_first" | "budget_focused" | "generous_giving" | "saving_priority";
  /** Family commitment level */
  family_commitment: number;
  /** Spiritual discipline consistency */
  spiritual_discipline: number;
  /** Personal boundaries (1-5, 5 = very strong) */
  personal_boundaries: number;
  /** Behavioral deal-breakers */
  behavioral_dealbreakers: string[];
  /** Spiritual non-negotiables */
  spiritual_non_negotiables: string[];
  /** Relationship non-negotiables */
  relationship_non_negotiables: string[];
  /** Family non-negotiables */
  family_non_negotiables: string[];
  /** Lifestyle non-negotiables */
  lifestyle_non_negotiables: string[];
}

// ── PERSONALITY PROFILE ──────────────────────────────────────────────────────

export interface PersonalityProfile {
  /** Communication style */
  communication_style: "direct" | "gentle" | "analytical" | "expressive" | "reserved";
  /** Emotional expression level */
  emotional_expression: "very_open" | "open" | "moderate" | "reserved" | "very_reserved";
  /** Conflict handling style */
  conflict_style: "confrontational" | "avoidant" | "compromising" | "collaborative" | "accommodating";
  /** Introversion/extraversion (1-5, 1=introvert, 5=extrovert) */
  introversion_extraversion: number;
  /** Organization level */
  organization_level: "very_organized" | "organized" | "flexible" | "spontaneous" | "very_spontaneous";
  /** Social needs (1-5) */
  social_needs: number;
  /** Leadership tendencies (1-5) */
  leadership_tendencies: number;
  /** Affection style */
  affection_style: "words" | "touch" | "acts_of_service" | "quality_time" | "gifts";
  /** Relational rhythm */
  relational_rhythm: "fast_paced" | "steady" | "slow_and_intentional";
}

// ── LIFESTYLE PROFILE ────────────────────────────────────────────────────────

export interface LifestyleProfile {
  /** Morning or evening person */
  daily_rhythm: "early_bird" | "night_owl" | "flexible";
  /** Career ambition level (1-5) */
  career_ambition: number;
  /** Weekend habits */
  weekend_habits: string[];
  /** Church activities frequency */
  church_activities_frequency: "weekly" | "biweekly" | "monthly" | "occasional";
  /** Family visits frequency */
  family_visits_frequency: "daily" | "weekly" | "biweekly" | "monthly" | "occasional";
  /** Social life level (1-5) */
  social_life_level: number;
  /** Technology use level (1-5) */
  technology_use: number;
  /** Social media usage */
  social_media_usage: "none" | "minimal" | "moderate" | "heavy";
  /** Daily organization preference */
  daily_organization: "very_structured" | "structured" | "flexible" | "unstructured";
  /** Cultural traditions importance */
  cultural_traditions_importance: number;
}

// ── PREFERENCES PROFILE ──────────────────────────────────────────────────────

export interface PreferencesProfile {
  /** Preferred age range */
  preferred_age_min: number;
  preferred_age_max: number;
  /** Maximum distance in km */
  max_distance_km: number;
  /** Preferred languages */
  preferred_languages: string[];
  /** Preferred regions/ethnicities (only if explicitly preferred) */
  preferred_regions: string[];
  /** Preferred education level */
  preferred_education: string[];
  /** Preferred professions */
  preferred_professions: string[];
  /** Hobbies and interests */
  hobbies: string[];
  interests: string[];
}

// ── COMPLETE QUESTIONNAIRE RESPONSE ──────────────────────────────────────────

export interface QuestionnaireResponse {
  spiritual: SpiritualProfile;
  marriage_family: MarriageFamilyProfile;
  values: ValuesProfile;
  personality: PersonalityProfile;
  lifestyle: LifestyleProfile;
  preferences: PreferencesProfile;
  /** Open-ended responses for semantic analysis */
  open_responses: {
    vision_of_marriage: string;
    relationship_with_god_description: string;
    conflict_resolution_example: string;
    parenting_philosophy: string;
    financial_stewardship_view: string;
    definition_of_true_love: string;
    spiritual_legacy: string;
    ideal_relationship_description: string;
  };
}

// ── USER PROFILE (Full) ──────────────────────────────────────────────────────

export interface EdenUserProfile {
  id: string;
  name: string;
  email?: string;
  gender: "homme" | "femme";
  birth_date: string; // ISO date
  city: string;
  country: string;
  region?: string;
  avatar_url?: string;
  bio?: string;
  profession?: string;
  civil_status?: string;
  subscription_plan: "free" | "essentiel" | "premium" | "elite";
  onboarding_completed: boolean;
  profile_completion_pct: number;
  questionnaire: QuestionnaireResponse;
  created_at: string;
  updated_at: string;
}

// ── STRUCTURED ATTRIBUTES (from semantic extraction) ─────────────────────────

export interface ExtractedAttribute {
  value: string;
  confidence: number; // 0-1
  source_question: string;
}

export interface SemanticProfile {
  marriage_values: ExtractedAttribute[];
  faith_values: ExtractedAttribute[];
  family_values: ExtractedAttribute[];
  communication_style: ExtractedAttribute[];
  conflict_style: ExtractedAttribute[];
  financial_values: ExtractedAttribute[];
  parenting_values: ExtractedAttribute[];
  relationship_expectations: ExtractedAttribute[];
}

// ── HARD FILTER RESULT ───────────────────────────────────────────────────────

export interface HardFilterResult {
  passed: boolean;
  failures: HardFilterFailure[];
}

export interface HardFilterFailure {
  field: string;
  reason: string;
  user_a_value: string;
  user_b_value: string;
  severity: "critical";
}

// ── CATEGORY SCORE ───────────────────────────────────────────────────────────

export interface CategoryScore {
  category: QuestionCategory;
  score: number; // 0-100
  weight: number; // 0-1
  weighted_score: number; // score * weight
  details: ScoreDetail[];
}

export interface ScoreDetail {
  field: string;
  value_a: string;
  value_b: string;
  points: number;
  max_points: number;
  interaction_type: "complementary" | "compatible" | "neutral" | "tension" | "incompatible";
  note?: string;
}

// ── COMPATIBILITY RESULT ─────────────────────────────────────────────────────

export interface CompatibilityResult {
  /** Overall score 0-100 */
  overall_score: number;
  /** Category breakdown */
  categories: CategoryScore[];
  /** Strengths (top 3-5) */
  strengths: string[];
  /** Differences to discuss */
  differences: string[];
  /** Hard filter status */
  hard_filter_passed: boolean;
  /** Hard filter failures if any */
  hard_filter_failures: HardFilterFailure[];
  /** Match status */
  match_status: MatchStatus;
  /** Match level label */
  match_level: MatchLevel;
}

// ── RECIPROCAL MATCH RESULT ──────────────────────────────────────────────────

export interface ReciprocalMatchResult {
  /** Score A→B */
  score_a_to_b: number;
  /** Score B→A */
  score_b_to_a: number;
  /** Mutual score (MIN of the two) */
  mutual_score: number;
  /** Full compatibility for A→B */
  compatibility_a_to_b: CompatibilityResult;
  /** Full compatibility for B→A */
  compatibility_b_to_a: CompatibilityResult;
  /** Match status after reciprocal evaluation */
  match_status: MatchStatus;
  /** Match level */
  match_level: MatchLevel;
  /** Combined strengths from both directions */
  combined_strengths: string[];
  /** Combined differences from both directions */
  combined_differences: string[];
}

// ── MATCH EXPLANATION (for UI) ───────────────────────────────────────────────

export interface MatchExplanation {
  compatibility_score: number;
  spiritual_score: number;
  marriage_family_score: number;
  values_score: number;
  personality_score: number;
  lifestyle_score: number;
  preferences_score: number;
  strengths: string[];
  differences: string[];
  match_status: MatchStatus;
  match_level: MatchLevel;
}

// ── DISCOVERY RESPONSE ───────────────────────────────────────────────────────

export interface DiscoveryMatch {
  user_id: string;
  name: string;
  age: number;
  city: string;
  country: string;
  avatar_url?: string;
  profession?: string;
  bio?: string;
  score: number;
  match_level: MatchLevel;
  match_status: MatchStatus;
  reasons: string[];
  differences: string[];
  explanation: MatchExplanation;
}

export interface DiscoveryResponse {
  matches: DiscoveryMatch[];
  total: number;
  page: number;
  limit: number;
  user_completion_pct: number;
}

// ── CONFIGURABLE WEIGHTS ─────────────────────────────────────────────────────

export interface MatchingWeights {
  spiritual: number;
  marriage_family: number;
  values: number;
  personality: number;
  lifestyle: number;
  preferences: number;
}

export interface MatchingConfig {
  weights: MatchingWeights;
  match_threshold: number;          // Default: 70
  weak_threshold: number;           // Default: 60
  strong_threshold: number;         // Default: 80
  exceptional_threshold: number;    // Default: 90
  max_results: number;              // Default: 50
  min_profile_completion: number;   // Default: 60
  enable_semantic_analysis: boolean;
}

// ── FIELD DEFINITION (for matching matrix) ───────────────────────────────────

export interface FieldDefinition {
  field_name: string;
  category: QuestionCategory;
  classification: FieldClassification;
  weight: number; // 0-1 within category
  comparison_type: "exact" | "range" | "set_overlap" | "scale_distance" | "boolean_match" | "text_similarity" | "complementary" | "preference_filter" | "minimum_threshold";
  is_hard_filter: boolean;
  hard_filter_type?: "required_match" | "range_within" | "minimum_threshold";
  description: string;
}