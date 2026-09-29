// ============================================================================
//  Garden of Alliance — Compatibility Scoring Engine
//  Deterministic, explainable scoring for each compatibility category.
//  Priority: Faith → Marriage Vision → Family → Values → Personality → Lifestyle → Preferences
// ============================================================================

import type {
  QuestionnaireResponse,
  SpiritualProfile,
  MarriageFamilyProfile,
  ValuesProfile,
  PersonalityProfile,
  LifestyleProfile,
  PreferencesProfile,
  CompatibilityResult,
  CategoryScore,
  ScoreDetail,
  EdenUserProfile,
} from "./types";
import type { MatchingConfig } from "./types";
import { applyHardFilters, calculateAge } from "./hard-filters";
import {
  scoreToMatchLevel,
  scoreToMatchStatus,
  CHURCH_INVOLVEMENT_SCALE,
  denominationAffinity,
  FREQUENCY_SCALE,
  SOCIAL_MEDIA_SCALE,
  ORGANIZATION_SCALE,
  FAMILY_VISITS_SCALE,
  TIMELINE_COMPATIBILITY,
  CONFLICT_STYLE_MATRIX,
  COMMUNICATION_COMPATIBILITY,
  AFFECTION_COMPATIBILITY,
  WORK_LIFE_COMPATIBILITY,
  DAILY_RHYTHM_COMPATIBILITY,
  RELATIONAL_RHYTHM_COMPATIBILITY,
  classifyIntroversionInteraction,
  classifySocialNeedsInteraction,
  FIELD_DEFINITIONS,
} from "./config";
import type { InteractionType } from "./config";

// ── MAIN COMPATIBILITY FUNCTION ──────────────────────────────────────────────

/**
 * Compute full compatibility from seeker (A) toward candidate (B).
 * This is a ONE-DIRECTIONAL score. For reciprocal matching, call this twice
 * and take the MIN.
 */
export function computeCompatibility(
  seeker: EdenUserProfile,
  candidate: EdenUserProfile,
  config: MatchingConfig
): CompatibilityResult {
  // Step 1: Apply hard filters
  const hardFilter = applyHardFilters(seeker, candidate);
  if (!hardFilter.passed) {
    return {
      overall_score: 0,
      categories: [],
      strengths: [],
      differences: ["Incompatibilités fondamentales détectées"],
      hard_filter_passed: false,
      hard_filter_failures: hardFilter.failures,
      match_status: "NOT_COMPATIBLE",
      match_level: "no_match",
    };
  }

  const qa = seeker.questionnaire;
  const qb = candidate.questionnaire;
  const weights = config.weights;

  // Step 2: Score each category
  const spiritualScore = scoreSpiritual(qa.spiritual, qb.spiritual, qa, qb);
  const marriageFamilyScore = scoreMarriageFamily(qa.marriage_family, qb.marriage_family, qa, qb);
  const valuesScore = scoreValues(qa.values, qb.values, qa, qb);
  const personalityScore = scorePersonality(qa.personality, qb.personality);
  const lifestyleScore = scoreLifestyle(qa.lifestyle, qb.lifestyle);
  const preferencesScore = scorePreferences(
    qa.preferences,
    qb.preferences,
    seeker,
    candidate
  );

  // Step 3: Apply category weights
  const categories: CategoryScore[] = [
    { category: "spiritual", ...spiritualScore, weight: weights.spiritual, weighted_score: spiritualScore.score * weights.spiritual },
    { category: "marriage_family", ...marriageFamilyScore, weight: weights.marriage_family, weighted_score: marriageFamilyScore.score * weights.marriage_family },
    { category: "values", ...valuesScore, weight: weights.values, weighted_score: valuesScore.score * weights.values },
    { category: "personality", ...personalityScore, weight: weights.personality, weighted_score: personalityScore.score * weights.personality },
    { category: "lifestyle", ...lifestyleScore, weight: weights.lifestyle, weighted_score: lifestyleScore.score * weights.lifestyle },
    { category: "preferences", ...preferencesScore, weight: weights.preferences, weighted_score: preferencesScore.score * weights.preferences },
  ];

  // Step 4: Calculate weighted overall score
  const overall_score = Math.round(
    categories.reduce((sum, cat) => sum + cat.weighted_score, 0)
  );

  // Step 5: Generate strengths and differences
  const strengths = extractStrengths(categories, qa, qb);
  const differences = extractDifferences(categories, qa, qb);

  // Step 6: Determine match status
  const match_level = scoreToMatchLevel(overall_score, config);
  const match_status = scoreToMatchStatus(overall_score, true, config);

  return {
    overall_score,
    categories,
    strengths,
    differences,
    hard_filter_passed: true,
    hard_filter_failures: [],
    match_status,
    match_level,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPIRITUAL COMPATIBILITY (30%)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreSpiritual(
  a: SpiritualProfile,
  b: SpiritualProfile,
  qa: QuestionnaireResponse,
  qb: QuestionnaireResponse
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Denomination affinity — a score, no longer an elimination: two Christians
  // of different traditions can still build a covenant, just with more to discuss.
  const denomPoints = denominationAffinity(a.denomination, b.denomination);
  addDetail(details, "denomination", a.denomination, b.denomination, denomPoints, 100,
    denomPoints >= 85 ? "compatible" : denomPoints >= 60 ? "neutral" : "tension");
  totalPoints += denomPoints * 0.12;
  maxPoints += 100 * 0.12;

  // Faith importance (1-5 scale, closer = better)
  const faithDiff = Math.abs(a.faith_importance - b.faith_importance);
  const faithPoints = Math.max(0, 100 - faithDiff * 20);
  addDetail(details, "faith_importance", a.faith_importance, b.faith_importance, faithPoints, 100, 
    classifyScaleInteraction(faithDiff));
  totalPoints += faithPoints * 0.15;
  maxPoints += 100 * 0.15;

  // Church involvement (scale-based)
  const churchA = CHURCH_INVOLVEMENT_SCALE[a.church_involvement] ?? 2;
  const churchB = CHURCH_INVOLVEMENT_SCALE[b.church_involvement] ?? 2;
  const churchDiff = Math.abs(churchA - churchB);
  const churchPoints = Math.max(0, 100 - churchDiff * 22);
  addDetail(details, "church_involvement", a.church_involvement, b.church_involvement, churchPoints, 100,
    classifyScaleInteraction(churchDiff));
  totalPoints += churchPoints * 0.15;
  maxPoints += 100 * 0.15;

  // Prayer frequency
  const prayerA = FREQUENCY_SCALE[a.prayer_frequency] ?? 1;
  const prayerB = FREQUENCY_SCALE[b.prayer_frequency] ?? 1;
  const prayerDiff = Math.abs(prayerA - prayerB);
  const prayerPoints = Math.max(0, 100 - prayerDiff * 25);
  addDetail(details, "prayer_frequency", a.prayer_frequency, b.prayer_frequency, prayerPoints, 100,
    classifyScaleInteraction(prayerDiff));
  totalPoints += prayerPoints * 0.12;
  maxPoints += 100 * 0.12;

  // Bible meditation
  const bibleA = FREQUENCY_SCALE[a.bible_meditation] ?? 1;
  const bibleB = FREQUENCY_SCALE[b.bible_meditation] ?? 1;
  const bibleDiff = Math.abs(bibleA - bibleB);
  const biblePoints = Math.max(0, 100 - bibleDiff * 25);
  addDetail(details, "bible_meditation", a.bible_meditation, b.bible_meditation, biblePoints, 100,
    classifyScaleInteraction(bibleDiff));
  totalPoints += biblePoints * 0.10;
  maxPoints += 100 * 0.10;

  // Water baptism (boolean match)
  const waterPoints = a.water_baptism === b.water_baptism ? 85 : 40;
  addDetail(details, "water_baptism", String(a.water_baptism), String(b.water_baptism), waterPoints, 100,
    a.water_baptism === b.water_baptism ? "compatible" : "tension");
  totalPoints += waterPoints * 0.08;
  maxPoints += 100 * 0.08;

  // Holy Spirit baptism (boolean match)
  const spiritPoints = a.holy_spirit_baptism === b.holy_spirit_baptism ? 85 : 40;
  addDetail(details, "holy_spirit_baptism", String(a.holy_spirit_baptism), String(b.holy_spirit_baptism), spiritPoints, 100,
    a.holy_spirit_baptism === b.holy_spirit_baptism ? "compatible" : "tension");
  totalPoints += spiritPoints * 0.08;
  maxPoints += 100 * 0.08;

  // Relationship with God (1-5)
  const godDiff = Math.abs(a.relationship_with_god - b.relationship_with_god);
  const godPoints = Math.max(0, 100 - godDiff * 20);
  addDetail(details, "relationship_with_god", a.relationship_with_god, b.relationship_with_god, godPoints, 100,
    classifyScaleInteraction(godDiff));
  totalPoints += godPoints * 0.12;
  maxPoints += 100 * 0.12;

  // Ministry involvement (set overlap)
  const ministryOverlap = calculateSetOverlap(a.ministry_involvement, b.ministry_involvement);
  const ministryPoints = Math.round(ministryOverlap * 100);
  addDetail(details, "ministry_involvement", a.ministry_involvement.join(","), b.ministry_involvement.join(","), ministryPoints, 100,
    ministryOverlap > 0.5 ? "compatible" : ministryOverlap > 0 ? "neutral" : "tension");
  totalPoints += ministryPoints * 0.06;
  maxPoints += 100 * 0.06;

  // Evangelism active (boolean)
  const evangPoints = a.evangelism_active === b.evangelism_active ? 80 : 50;
  addDetail(details, "evangelism_active", String(a.evangelism_active), String(b.evangelism_active), evangPoints, 100,
    a.evangelism_active === b.evangelism_active ? "compatible" : "neutral");
  totalPoints += evangPoints * 0.05;
  maxPoints += 100 * 0.05;

  // Spiritual gifts (set overlap)
  const giftsOverlap = calculateSetOverlap(a.spiritual_gifts, b.spiritual_gifts);
  const giftsPoints = Math.round(giftsOverlap * 100);
  addDetail(details, "spiritual_gifts", a.spiritual_gifts.join(","), b.spiritual_gifts.join(","), giftsPoints, 100,
    giftsOverlap > 0.3 ? "compatible" : "neutral");
  totalPoints += giftsPoints * 0.03;
  maxPoints += 100 * 0.03;

  // Purity before marriage (boolean)
  const purityPoints = a.purity_before_marriage === b.purity_before_marriage ? 90 : 35;
  addDetail(details, "purity_before_marriage", String(a.purity_before_marriage), String(b.purity_before_marriage), purityPoints, 100,
    a.purity_before_marriage === b.purity_before_marriage ? "compatible" : "incompatible");
  totalPoints += purityPoints * 0.06;
  maxPoints += 100 * 0.06;

  // Biblical marriage view (boolean)
  const marriageViewPoints = a.biblical_marriage_view === b.biblical_marriage_view ? 90 : 30;
  addDetail(details, "biblical_marriage_view", String(a.biblical_marriage_view), String(b.biblical_marriage_view), marriageViewPoints, 100,
    a.biblical_marriage_view === b.biblical_marriage_view ? "compatible" : "incompatible");
  totalPoints += marriageViewPoints * 0.05;
  maxPoints += 100 * 0.05;

  // God-centered relationship (boolean)
  const godCenterPoints = a.god_centered_relationship === b.god_centered_relationship ? 90 : 30;
  addDetail(details, "god_centered_relationship", String(a.god_centered_relationship), String(b.god_centered_relationship), godCenterPoints, 100,
    a.god_centered_relationship === b.god_centered_relationship ? "compatible" : "incompatible");
  totalPoints += godCenterPoints * 0.05;
  maxPoints += 100 * 0.05;

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;
  return { score: clamp(score), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARRIAGE & FAMILY COMPATIBILITY (25%)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreMarriageFamily(
  a: MarriageFamilyProfile,
  b: MarriageFamilyProfile,
  qa: QuestionnaireResponse,
  qb: QuestionnaireResponse
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Marriage timeline (matrix lookup)
  const timelineScore = TIMELINE_COMPATIBILITY[a.marriage_timeline]?.[b.marriage_timeline] ?? 50;
  addDetail(details, "marriage_timeline", a.marriage_timeline, b.marriage_timeline, timelineScore, 100,
    timelineScore >= 75 ? "compatible" : timelineScore >= 50 ? "neutral" : "tension");
  totalPoints += timelineScore * 0.20;
  maxPoints += 100 * 0.20;

  // Emotional readiness (1-5 scale)
  const emotDiff = Math.abs(a.emotional_readiness - b.emotional_readiness);
  const emotPoints = Math.max(0, 100 - emotDiff * 20);
  addDetail(details, "emotional_readiness", a.emotional_readiness, b.emotional_readiness, emotPoints, 100,
    classifyScaleInteraction(emotDiff));
  totalPoints += emotPoints * 0.12;
  maxPoints += 100 * 0.12;

  // Spiritual readiness (1-5 scale)
  const spirDiff = Math.abs(a.spiritual_readiness - b.spiritual_readiness);
  const spirPoints = Math.max(0, 100 - spirDiff * 20);
  addDetail(details, "spiritual_readiness", a.spiritual_readiness, b.spiritual_readiness, spirPoints, 100,
    classifyScaleInteraction(spirDiff));
  totalPoints += spirPoints * 0.12;
  maxPoints += 100 * 0.12;

  // Financial readiness (1-5 scale)
  const finDiff = Math.abs(a.financial_readiness - b.financial_readiness);
  const finPoints = Math.max(0, 100 - finDiff * 20);
  addDetail(details, "financial_readiness", a.financial_readiness, b.financial_readiness, finPoints, 100,
    classifyScaleInteraction(finDiff));
  totalPoints += finPoints * 0.08;
  maxPoints += 100 * 0.08;

  // Desired children count (range comparison)
  if (a.desired_children_count !== null && b.desired_children_count !== null) {
    const childDiff = Math.abs(a.desired_children_count - b.desired_children_count);
    const childPoints = childDiff === 0 ? 100 : childDiff === 1 ? 75 : childDiff === 2 ? 50 : 25;
    addDetail(details, "desired_children_count", String(a.desired_children_count), String(b.desired_children_count), childPoints, 100,
      childDiff <= 1 ? "compatible" : childDiff <= 2 ? "neutral" : "tension");
    totalPoints += childPoints * 0.10;
    maxPoints += 100 * 0.10;
  }

  // Family values (set overlap)
  const familyOverlap = calculateSetOverlap(a.family_values, b.family_values);
  const familyPoints = Math.round(familyOverlap * 100);
  addDetail(details, "family_values", a.family_values.join(","), b.family_values.join(","), familyPoints, 100,
    familyOverlap > 0.5 ? "compatible" : familyOverlap > 0 ? "neutral" : "tension");
  totalPoints += familyPoints * 0.10;
  maxPoints += 100 * 0.10;

  // Work/life balance (matrix)
  const wlbScore = WORK_LIFE_COMPATIBILITY[a.work_life_balance]?.[b.work_life_balance] ?? 60;
  addDetail(details, "work_life_balance", a.work_life_balance, b.work_life_balance, wlbScore, 100,
    wlbScore >= 80 ? "compatible" : wlbScore >= 60 ? "neutral" : "tension");
  totalPoints += wlbScore * 0.10;
  maxPoints += 100 * 0.10;

  // Parenting vision (text similarity - keyword overlap)
  const parentSim = calculateTextKeywordOverlap(a.parenting_vision, b.parenting_vision);
  const parentPoints = Math.round(parentSim * 100);
  addDetail(details, "parenting_vision", truncate(a.parenting_vision), truncate(b.parenting_vision), parentPoints, 100,
    parentSim > 0.5 ? "compatible" : parentSim > 0.2 ? "neutral" : "tension");
  totalPoints += parentPoints * 0.08;
  maxPoints += 100 * 0.08;

  // Ministry vision (text similarity)
  const ministrySim = calculateTextKeywordOverlap(a.ministry_vision, b.ministry_vision);
  const ministryVPoints = Math.round(ministrySim * 100);
  addDetail(details, "ministry_vision", truncate(a.ministry_vision), truncate(b.ministry_vision), ministryVPoints, 100,
    ministrySim > 0.5 ? "compatible" : "neutral");
  totalPoints += ministryVPoints * 0.05;
  maxPoints += 100 * 0.05;

  // Future residence (text similarity)
  const resSim = calculateTextKeywordOverlap(a.future_residence, b.future_residence);
  const resPoints = Math.round(resSim * 100);
  addDetail(details, "future_residence", truncate(a.future_residence), truncate(b.future_residence), resPoints, 100,
    resSim > 0.5 ? "compatible" : "neutral");
  totalPoints += resPoints * 0.05;
  maxPoints += 100 * 0.05;

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;
  return { score: clamp(score), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALUES COMPATIBILITY (20%)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreValues(
  a: ValuesProfile,
  b: ValuesProfile,
  qa: QuestionnaireResponse,
  qb: QuestionnaireResponse
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Core values (scale comparison): faithfulness, honesty, respect, humility, responsibility
  const scaleFields: Array<{ name: string; a: number; b: number; weight: number }> = [
    { name: "faithfulness", a: a.faithfulness, b: b.faithfulness, weight: 0.15 },
    { name: "honesty", a: a.honesty, b: b.honesty, weight: 0.15 },
    { name: "respect", a: a.respect, b: b.respect, weight: 0.12 },
    { name: "humility", a: a.humility, b: b.humility, weight: 0.08 },
    { name: "responsibility", a: a.responsibility, b: b.responsibility, weight: 0.08 },
    { name: "family_commitment", a: a.family_commitment, b: b.family_commitment, weight: 0.08 },
    { name: "spiritual_discipline", a: a.spiritual_discipline, b: b.spiritual_discipline, weight: 0.07 },
    { name: "personal_boundaries", a: a.personal_boundaries, b: b.personal_boundaries, weight: 0.07 },
  ];

  for (const field of scaleFields) {
    const diff = Math.abs(field.a - field.b);
    const points = Math.max(0, 100 - diff * 18);
    addDetail(details, field.name, String(field.a), String(field.b), points, 100,
      classifyScaleInteraction(diff));
    totalPoints += points * field.weight;
    maxPoints += 100 * field.weight;
  }

  // Conflict resolution (matrix lookup)
  const conflictScore = CONFLICT_STYLE_MATRIX[a.conflict_resolution]?.[b.conflict_resolution] ?? 50;
  // Map "prayer_first" to "collaborative" for matrix lookup (closest match)
  const conflictA = a.conflict_resolution === "prayer_first" ? "collaborative" : a.conflict_resolution;
  const conflictB = b.conflict_resolution === "prayer_first" ? "collaborative" : b.conflict_resolution;
  const actualConflictScore = CONFLICT_STYLE_MATRIX[conflictA]?.[conflictB] ?? conflictScore;
  
  // Bonus for "prayer_first" matching with "prayer_first"
  const prayerBonus = (a.conflict_resolution === "prayer_first" && b.conflict_resolution === "prayer_first") ? 10 : 0;
  const finalConflictScore = Math.min(100, actualConflictScore + prayerBonus);

  addDetail(details, "conflict_resolution", a.conflict_resolution, b.conflict_resolution, finalConflictScore, 100,
    finalConflictScore >= 80 ? "compatible" : finalConflictScore >= 60 ? "complementary" : "tension");
  totalPoints += finalConflictScore * 0.12;
  maxPoints += 100 * 0.12;

  // Financial stewardship (compatibility matrix)
  const finStewardScore = getFinancialStewardshipCompatibility(a.financial_stewardship, b.financial_stewardship);
  addDetail(details, "financial_stewardship", a.financial_stewardship, b.financial_stewardship, finStewardScore, 100,
    finStewardScore >= 80 ? "compatible" : finStewardScore >= 60 ? "neutral" : "tension");
  totalPoints += finStewardScore * 0.08;
  maxPoints += 100 * 0.08;

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;
  return { score: clamp(score), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY COMPATIBILITY (10%)
// ═══════════════════════════════════════════════════════════════════════════════

function scorePersonality(
  a: PersonalityProfile,
  b: PersonalityProfile
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Communication style (matrix)
  const commCompat = COMMUNICATION_COMPATIBILITY[a.communication_style]?.[b.communication_style];
  const commScore = commCompat?.score ?? 60;
  const commType = commCompat?.type ?? "neutral" as InteractionType;
  addDetail(details, "communication_style", a.communication_style, b.communication_style, commScore, 100, commType);
  totalPoints += commScore * 0.20;
  maxPoints += 100 * 0.20;

  // Emotional expression (closeness on ordered scale)
  const emotLevels = ["very_reserved", "reserved", "moderate", "open", "very_open"];
  const emotDiff = Math.abs(emotLevels.indexOf(a.emotional_expression) - emotLevels.indexOf(b.emotional_expression));
  const emotPoints = Math.max(0, 100 - emotDiff * 22);
  addDetail(details, "emotional_expression", a.emotional_expression, b.emotional_expression, emotPoints, 100,
    classifyScaleInteraction(emotDiff));
  totalPoints += emotPoints * 0.12;
  maxPoints += 100 * 0.12;

  // Conflict style (matrix)
  const conflictA = a.conflict_style === "accommodating" ? "accommodating" : a.conflict_style;
  const conflictB = b.conflict_style === "accommodating" ? "accommodating" : b.conflict_style;
  const conflictScore = CONFLICT_STYLE_MATRIX[conflictA]?.[conflictB] ?? 50;
  addDetail(details, "conflict_style", a.conflict_style, b.conflict_style, conflictScore, 100,
    conflictScore >= 75 ? "compatible" : conflictScore >= 50 ? "neutral" : "tension");
  totalPoints += conflictScore * 0.18;
  maxPoints += 100 * 0.18;

  // Introversion/extraversion
  const introResult = classifyIntroversionInteraction(a.introversion_extraversion, b.introversion_extraversion);
  addDetail(details, "introversion_extraversion", String(a.introversion_extraversion), String(b.introversion_extraversion), introResult.score, 100, introResult.type);
  totalPoints += introResult.score * 0.15;
  maxPoints += 100 * 0.15;

  // Social needs
  const socialResult = classifySocialNeedsInteraction(a.social_needs, b.social_needs);
  addDetail(details, "social_needs", String(a.social_needs), String(b.social_needs), socialResult.score, 100, socialResult.type);
  totalPoints += socialResult.score * 0.10;
  maxPoints += 100 * 0.10;

  // Leadership tendencies (complementary is good)
  const leadDiff = Math.abs(a.leadership_tendencies - b.leadership_tendencies);
  const leadPoints = leadDiff <= 1 ? 90 : leadDiff === 2 ? 75 : leadDiff === 3 ? 60 : 45;
  addDetail(details, "leadership_tendencies", String(a.leadership_tendencies), String(b.leadership_tendencies), leadPoints, 100,
    leadDiff <= 1 ? "compatible" : leadDiff <= 2 ? "complementary" : "tension");
  totalPoints += leadPoints * 0.08;
  maxPoints += 100 * 0.08;

  // Affection style (matrix)
  const affectionScore = AFFECTION_COMPATIBILITY[a.affection_style]?.[b.affection_style] ?? 65;
  addDetail(details, "affection_style", a.affection_style, b.affection_style, affectionScore, 100,
    affectionScore >= 80 ? "compatible" : affectionScore >= 60 ? "complementary" : "tension");
  totalPoints += affectionScore * 0.10;
  maxPoints += 100 * 0.10;

  // Relational rhythm (matrix)
  const rhythmScore = RELATIONAL_RHYTHM_COMPATIBILITY[a.relational_rhythm]?.[b.relational_rhythm] ?? 60;
  addDetail(details, "relational_rhythm", a.relational_rhythm, b.relational_rhythm, rhythmScore, 100,
    rhythmScore >= 80 ? "compatible" : rhythmScore >= 60 ? "neutral" : "tension");
  totalPoints += rhythmScore * 0.07;
  maxPoints += 100 * 0.07;

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;
  return { score: clamp(score), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFESTYLE COMPATIBILITY (10%)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreLifestyle(
  a: LifestyleProfile,
  b: LifestyleProfile
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Daily rhythm (matrix)
  const rhythmScore = DAILY_RHYTHM_COMPATIBILITY[a.daily_rhythm]?.[b.daily_rhythm] ?? 70;
  addDetail(details, "daily_rhythm", a.daily_rhythm, b.daily_rhythm, rhythmScore, 100,
    rhythmScore >= 80 ? "compatible" : rhythmScore >= 60 ? "neutral" : "tension");
  totalPoints += rhythmScore * 0.10;
  maxPoints += 100 * 0.10;

  // Career ambition (1-5 scale)
  const careerDiff = Math.abs(a.career_ambition - b.career_ambition);
  const careerPoints = Math.max(0, 100 - careerDiff * 18);
  addDetail(details, "career_ambition", String(a.career_ambition), String(b.career_ambition), careerPoints, 100,
    classifyScaleInteraction(careerDiff));
  totalPoints += careerPoints * 0.15;
  maxPoints += 100 * 0.15;

  // Church activities frequency (scale)
  const churchFreqScale: Record<string, number> = { "weekly": 4, "biweekly": 3, "monthly": 2, "occasional": 1 };
  const churchADiff = Math.abs((churchFreqScale[a.church_activities_frequency] ?? 2) - (churchFreqScale[b.church_activities_frequency] ?? 2));
  const churchAFreqPoints = Math.max(0, 100 - churchADiff * 25);
  addDetail(details, "church_activities_frequency", a.church_activities_frequency, b.church_activities_frequency, churchAFreqPoints, 100,
    classifyScaleInteraction(churchADiff));
  totalPoints += churchAFreqPoints * 0.20;
  maxPoints += 100 * 0.20;

  // Family visits frequency (scale)
  const famA = FAMILY_VISITS_SCALE[a.family_visits_frequency] ?? 2;
  const famB = FAMILY_VISITS_SCALE[b.family_visits_frequency] ?? 2;
  const famDiff = Math.abs(famA - famB);
  const famPoints = Math.max(0, 100 - famDiff * 22);
  addDetail(details, "family_visits_frequency", a.family_visits_frequency, b.family_visits_frequency, famPoints, 100,
    classifyScaleInteraction(famDiff));
  totalPoints += famPoints * 0.15;
  maxPoints += 100 * 0.15;

  // Social life level (1-5)
  const socialDiff = Math.abs(a.social_life_level - b.social_life_level);
  const socialPoints = Math.max(0, 100 - socialDiff * 18);
  addDetail(details, "social_life_level", String(a.social_life_level), String(b.social_life_level), socialPoints, 100,
    classifyScaleInteraction(socialDiff));
  totalPoints += socialPoints * 0.10;
  maxPoints += 100 * 0.10;

  // Technology use (1-5)
  const techDiff = Math.abs(a.technology_use - b.technology_use);
  const techPoints = Math.max(0, 100 - techDiff * 15);
  addDetail(details, "technology_use", String(a.technology_use), String(b.technology_use), techPoints, 100,
    classifyScaleInteraction(techDiff));
  totalPoints += techPoints * 0.05;
  maxPoints += 100 * 0.05;

  // Social media usage (scale)
  const smA = SOCIAL_MEDIA_SCALE[a.social_media_usage] ?? 1;
  const smB = SOCIAL_MEDIA_SCALE[b.social_media_usage] ?? 1;
  const smDiff = Math.abs(smA - smB);
  const smPoints = Math.max(0, 100 - smDiff * 22);
  addDetail(details, "social_media_usage", a.social_media_usage, b.social_media_usage, smPoints, 100,
    classifyScaleInteraction(smDiff));
  totalPoints += smPoints * 0.05;
  maxPoints += 100 * 0.05;

  // Daily organization (scale)
  const orgA = ORGANIZATION_SCALE[a.daily_organization] ?? 2;
  const orgB = ORGANIZATION_SCALE[b.daily_organization] ?? 2;
  const orgDiff = Math.abs(orgA - orgB);
  const orgPoints = Math.max(0, 100 - orgDiff * 20);
  addDetail(details, "daily_organization", a.daily_organization, b.daily_organization, orgPoints, 100,
    classifyScaleInteraction(orgDiff));
  totalPoints += orgPoints * 0.10;
  maxPoints += 100 * 0.10;

  // Cultural traditions importance (1-5)
  const cultDiff = Math.abs(a.cultural_traditions_importance - b.cultural_traditions_importance);
  const cultPoints = Math.max(0, 100 - cultDiff * 18);
  addDetail(details, "cultural_traditions_importance", String(a.cultural_traditions_importance), String(b.cultural_traditions_importance), cultPoints, 100,
    classifyScaleInteraction(cultDiff));
  totalPoints += cultPoints * 0.10;
  maxPoints += 100 * 0.10;

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;
  return { score: clamp(score), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREFERENCES COMPATIBILITY (5%)
// ═══════════════════════════════════════════════════════════════════════════════

function scorePreferences(
  a: PreferencesProfile,
  b: PreferencesProfile,
  seeker: EdenUserProfile,
  candidate: EdenUserProfile
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  // Age preference (does B fall within A's preferred age range?)
  const ageB = calculateAge(candidate.birth_date);
  const ageA = calculateAge(seeker.birth_date);
  const aInBRange = ageA >= b.preferred_age_min && ageA <= b.preferred_age_max;
  const bInARange = ageB >= a.preferred_age_min && ageB <= a.preferred_age_max;
  
  let agePoints = 0;
  if (aInBRange && bInARange) agePoints = 100;
  else if (aInBRange || bInARange) agePoints = 65;
  else agePoints = 30;

  addDetail(details, "preferred_age_range",
    `${a.preferred_age_min}-${a.preferred_age_max} (âge: ${ageA})`,
    `${b.preferred_age_min}-${b.preferred_age_max} (âge: ${ageB})`,
    agePoints, 100,
    agePoints >= 80 ? "compatible" : agePoints >= 50 ? "neutral" : "tension");
  totalPoints += agePoints * 0.20;
  maxPoints += 100 * 0.20;

  // Distance (simplified — would use geolocation in production)
  const sameCity = seeker.city?.toLowerCase() === candidate.city?.toLowerCase();
  const sameCountry = seeker.country?.toLowerCase() === candidate.country?.toLowerCase();
  let distPoints = sameCity ? 100 : sameCountry ? 70 : 40;
  
  // Adjust by max_distance_km preference (if specified)
  if (a.max_distance_km > 0 && !sameCountry) {
    distPoints = Math.min(distPoints, 30);
  }
  
  addDetail(details, "max_distance_km",
    `${seeker.city}, ${seeker.country}`,
    `${candidate.city}, ${candidate.country}`,
    distPoints, 100,
    distPoints >= 80 ? "compatible" : distPoints >= 50 ? "neutral" : "tension");
  totalPoints += distPoints * 0.20;
  maxPoints += 100 * 0.20;

  // Languages (set overlap)
  const langOverlap = calculateSetOverlap(a.preferred_languages, b.preferred_languages);
  const langPoints = Math.round(langOverlap * 100);
  addDetail(details, "preferred_languages", a.preferred_languages.join(","), b.preferred_languages.join(","), langPoints, 100,
    langOverlap > 0.5 ? "compatible" : langOverlap > 0 ? "neutral" : "tension");
  totalPoints += langPoints * 0.15;
  maxPoints += 100 * 0.15;

  // Regions/ethnicities (set overlap, only if explicitly preferred)
  const regionOverlap = calculateSetOverlap(a.preferred_regions, b.preferred_regions);
  const regionPoints = a.preferred_regions.length === 0 && b.preferred_regions.length === 0
    ? 80 // No preference = neutral-positive
    : Math.round(regionOverlap * 100);
  addDetail(details, "preferred_regions", a.preferred_regions.join(","), b.preferred_regions.join(","), regionPoints, 100,
    regionPoints >= 70 ? "compatible" : "neutral");
  totalPoints += regionPoints * 0.10;
  maxPoints += 100 * 0.10;

  // Education (set overlap)
  const eduOverlap = calculateSetOverlap(a.preferred_education, b.preferred_education);
  const eduPoints = a.preferred_education.length === 0 && b.preferred_education.length === 0
    ? 80
    : Math.round(eduOverlap * 100);
  addDetail(details, "preferred_education", a.preferred_education.join(","), b.preferred_education.join(","), eduPoints, 100,
    eduPoints >= 70 ? "compatible" : "neutral");
  totalPoints += eduPoints * 0.10;
  maxPoints += 100 * 0.10;

  // Hobbies (set overlap)
  const hobbyOverlap = calculateSetOverlap(a.hobbies, b.hobbies);
  const hobbyPoints = Math.round(hobbyOverlap * 100);
  addDetail(details, "hobbies", a.hobbies.join(","), b.hobbies.join(","), hobbyPoints, 100,
    hobbyOverlap > 0.3 ? "compatible" : hobbyOverlap > 0 ? "neutral" : "neutral");
  totalPoints += hobbyPoints * 0.15;
  maxPoints += 100 * 0.15;

  // Interests (set overlap)
  const interestOverlap = calculateSetOverlap(a.interests, b.interests);
  const interestPoints = Math.round(interestOverlap * 100);
  addDetail(details, "interests", a.interests.join(","), b.interests.join(","), interestPoints, 100,
    interestOverlap > 0.3 ? "compatible" : "neutral");
  totalPoints += interestPoints * 0.10;
  maxPoints += 100 * 0.10;

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 50;
  return { score: clamp(score), details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRENGTHS & DIFFERENCES EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractStrengths(categories: CategoryScore[], qa: QuestionnaireResponse, qb: QuestionnaireResponse): string[] {
  const strengths: string[] = [];

  // Find the highest-scoring details across all categories
  const allDetails: Array<ScoreDetail & { category: string }> = [];
  for (const cat of categories) {
    for (const detail of cat.details) {
      allDetails.push({ ...detail, category: cat.category });
    }
  }

  // Sort by score descending
  allDetails.sort((a, b) => b.points - a.points);

  // Generate strength labels for top matches
  const strengthMap: Record<string, string> = {
    "faith_importance": "Importance similaire de la foi",
    "church_involvement": "Implication à l'église compatible",
    "prayer_frequency": "Fréquence de prière alignée",
    "bible_meditation": "Méditation biblique partagée",
    "relationship_with_god": "Relation avec Dieu similaire",
    "purity_before_marriage": "Engagement commun pour la pureté",
    "biblical_marriage_view": "Vision biblique du mariage partagée",
    "god_centered_relationship": "Dieu au centre de la relation",
    "marriage_timeline": "Vision temporelle du mariage alignée",
    "emotional_readiness": "Maturité émotionnelle compatible",
    "spiritual_readiness": "Maturité spirituelle compatible",
    "faithfulness": "Fidélité partagée",
    "honesty": "Honnêteté mutuelle",
    "communication_style": "Styles de communication compatibles",
    "conflict_style": "Gestion des conflits harmonieuse",
    "affection_style": "Langages d'amour compatibles",
    "family_values": "Valeurs familiales communes",
    "work_life_balance": "Équilibre vie/travail similaire",
    "hobbies": "Loisirs en commun",
    "interests": "Centres d'intérêt partagés",
  };

  for (const detail of allDetails.slice(0, 5)) {
    if (detail.points >= 75) {
      const label = strengthMap[detail.field];
      if (label && !strengths.includes(label)) {
        strengths.push(label);
      }
    }
  }

  // Category-level strengths
  for (const cat of categories) {
    if (cat.score >= 85) {
      const catLabels: Record<string, string> = {
        spiritual: "Forte compatibilité spirituelle",
        marriage_family: "Vision du mariage et de la famille alignée",
        values: "Valeurs fondamentales partagées",
        personality: "Personalités complémentaires",
        lifestyle: "Modes de vie compatibles",
        preferences: "Préférences bien alignées",
      };
      const label = catLabels[cat.category];
      if (label && !strengths.includes(label)) {
        strengths.push(label);
      }
    }
  }

  return strengths.slice(0, 5);
}

function extractDifferences(categories: CategoryScore[], qa: QuestionnaireResponse, qb: QuestionnaireResponse): string[] {
  const differences: string[] = [];

  const allDetails: Array<ScoreDetail & { category: string }> = [];
  for (const cat of categories) {
    for (const detail of cat.details) {
      allDetails.push({ ...detail, category: cat.category });
    }
  }

  // Sort by score ascending (worst first)
  allDetails.sort((a, b) => a.points - b.points);

  const diffMap: Record<string, string> = {
    "career_ambition": "Ambitions professionnelles différentes",
    "church_involvement": "Niveaux d'implication à l'église différents",
    "prayer_frequency": "Fréquences de prière différentes",
    "introversion_extraversion": "Niveaux d'introversion/extraversion différents",
    "social_needs": "Besoins sociaux différents",
    "daily_rhythm": "Rythmes quotidiens différents",
    "marriage_timeline": "Visions temporelles du mariage différentes",
    "communication_style": "Styles de communication différents",
    "conflict_style": "Approches des conflits différentes",
    "social_media_usage": "Usage des réseaux sociaux différent",
    "work_life_balance": "Priorités vie/travail différentes",
    "leadership_tendencies": "Tendances de leadership différentes",
  };

  for (const detail of allDetails.slice(0, 3)) {
    if (detail.points < 60) {
      const label = diffMap[detail.field];
      if (label && !differences.includes(label)) {
        differences.push(label);
      }
    }
  }

  // Category-level differences
  for (const cat of categories) {
    if (cat.score < 55) {
      const catLabels: Record<string, string> = {
        spiritual: "Écart de compatibilité spirituelle",
        marriage_family: "Visions différentes du mariage/famille",
        values: "Écart dans les valeurs fondamentales",
        personality: "Différences de personnalité notables",
        lifestyle: "Modes de vie différents",
        preferences: "Préférences différentes",
      };
      const label = catLabels[cat.category];
      if (label && !differences.includes(label)) {
        differences.push(label);
      }
    }
  }

  return differences.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function addDetail(
  details: ScoreDetail[],
  field: string,
  valueA: string | number,
  valueB: string | number,
  points: number,
  maxPoints: number,
  interactionType: InteractionType,
  note?: string
): void {
  details.push({
    field,
    value_a: String(valueA),
    value_b: String(valueB),
    points: Math.round(points),
    max_points: maxPoints,
    interaction_type: interactionType,
    note,
  });
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate set overlap for multi-choice answers. Returns 0-1.
 *
 * Measured against the SMALLER set (overlap coefficient), not the union
 * (Jaccard): two members who pick 3 values each and share 2 have a lot in
 * common — Jaccard would give them 0.5, this gives 0.67. Nothing in common
 * stays mildly positive (0.3): different choices are not incompatible ones.
 * A missing answer is neutral (0.5), never worse than a real one.
 */
function calculateSetOverlap(setA: string[], setB: string[]): number {
  if (setA.length === 0 || setB.length === 0) return 0.5; // Missing answer = neutral

  const normA = [...new Set(setA.map(s => s.toLowerCase().trim()))];
  const normB = [...new Set(setB.map(s => s.toLowerCase().trim()))];
  const shared = normA.filter(s => normB.includes(s)).length;
  const overlap = shared / Math.min(normA.length, normB.length);

  return 0.3 + 0.7 * overlap;
}

/**
 * Text keyword overlap for open-ended responses.
 * Extracts significant words and compares overlap.
 * Returns 0-1.
 */
function calculateTextKeywordOverlap(textA: string, textB: string): number {
  if (!textA || !textB) return 0.5; // Missing text = neutral

  const stopWords = new Set([
    "le", "la", "les", "de", "du", "des", "un", "une", "et", "ou", "mais",
    "dans", "par", "pour", "avec", "sur", "en", "au", "aux", "ce", "se",
    "qui", "que", "quoi", "dont", "où", "ne", "pas", "plus", "son", "sa",
    "ses", "mon", "ma", "mes", "ton", "ta", "tes", "leur", "leurs",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "this", "that", "these", "those",
    "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
    "she", "her", "it", "its", "they", "them", "their",
  ]);

  const extractKeywords = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w))
    );
  };

  const kwA = extractKeywords(textA);
  const kwB = extractKeywords(textB);

  if (kwA.size === 0 || kwB.size === 0) return 0.5;

  // Two people describing the same thing in their own words rarely share many
  // exact words: raw Jaccard stays near 0 and used to score LOWER than leaving
  // the answer blank (0.5). Different wording is not a disagreement, so text
  // starts from the neutral 0.5 and shared keywords raise it (4+ shared → 1).
  const shared = [...kwA].filter(w => kwB.has(w)).length;
  return 0.5 + 0.5 * Math.min(1, shared / 4);
}

function truncate(text: string, maxLen = 50): string {
  if (!text) return "(vide)";
  return text.length > maxLen ? text.substring(0, maxLen) + "..." : text;
}

function classifyScaleInteraction(diff: number): InteractionType {
  if (diff === 0) return "compatible";
  if (diff === 1) return "compatible";
  if (diff === 2) return "neutral";
  if (diff === 3) return "tension";
  return "incompatible";
}

/**
 * Financial stewardship compatibility matrix
 */
function getFinancialStewardshipCompatibility(a: string, b: string): number {
  const matrix: Record<string, Record<string, number>> = {
    "tithe_first":        { "tithe_first": 95, "budget_focused": 80, "generous_giving": 90, "saving_priority": 65 },
    "budget_focused":     { "tithe_first": 80, "budget_focused": 90, "generous_giving": 75, "saving_priority": 85 },
    "generous_giving":    { "tithe_first": 90, "budget_focused": 75, "generous_giving": 85, "saving_priority": 60 },
    "saving_priority":    { "tithe_first": 65, "budget_focused": 85, "generous_giving": 60, "saving_priority": 90 },
  };
  return matrix[a]?.[b] ?? 60;
}