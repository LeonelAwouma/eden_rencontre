// ============================================================================
//  Garden of Alliance — Matchmaking Engine: Example Profiles & Tests
//  Demonstrates the engine with realistic Cameroonian Pentecostal profiles
// ============================================================================

import {
  findMatches,
  computeReciprocalMatch,
  checkMatch,
  computeCompatibility,
  generateMatchSummary,
  extractSemanticProfile,
  compareSemanticProfiles,
  applyHardFilters,
  DEFAULT_CONFIG,
} from "../index";
import type { EdenUserProfile, QuestionnaireResponse, MatchingConfig } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE USER PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

/** Profile A: Samuel — Highly spiritual Pentecostal man, 28, Douala */
function createSamuel(): EdenUserProfile {
  return {
    id: "u_samuel_001",
    name: "Samuel Mbarga",
    email: "samuel@example.com",
    gender: "homme",
    birth_date: "1997-03-15",
    city: "Douala",
    country: "Cameroun",
    region: "Littoral",
    avatar_url: null,
    bio: "Serviteur de Dieu, passionné par l'évangélisation et la musique gospel.",
    profession: "Ingénieur informatique",
    civil_status: "celibataire",
    subscription_plan: "premium",
    onboarding_completed: true,
    profile_completion_pct: 95,
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-06-01T10:00:00Z",
    questionnaire: {
      spiritual: {
        is_christian: true,
        denomination: "pentecostal",
        faith_importance: 5,
        church_involvement: "very_active",
        prayer_frequency: "multiple_daily",
        bible_meditation: "daily",
        water_baptism: true,
        holy_spirit_baptism: true,
        relationship_with_god: 5,
        ministry_involvement: ["worship", "youth_ministry", "evangelism"],
        evangelism_active: true,
        spiritual_gifts: ["prophetic", "teaching", "discernment"],
        church_service: ["worship_leader", "youth_leader"],
        purity_before_marriage: true,
        biblical_marriage_view: true,
        god_centered_relationship: true,
      },
      marriage_family: {
        marriage_desire: 5,
        marriage_timeline: "within_1_year",
        emotional_readiness: 4,
        spiritual_readiness: 5,
        financial_readiness: 4,
        wants_children: "required",
        desired_children_count: 3,
        parenting_vision: "Élever mes enfants dans la crainte de Dieu, avec amour et discipline biblique. Les enseigner à prier et à étudier la Bible dès leur jeune âge.",
        family_values: ["faith", "respect", "unity", "prayer", "education"],
        work_life_balance: "balanced",
        future_residence: "Douala, Cameroun — proche de notre église locale",
        ministry_vision: "Fonder un couple qui serve Dieu ensemble dans l'évangélisation et la formation des jeunes.",
        long_term_goals: "Construire une famille selon les principes bibliques, servir dans le ministère, et être un exemple de couple chrétien.",
      },
      values: {
        faithfulness: 5,
        honesty: 5,
        respect: 5,
        humility: 4,
        responsibility: 5,
        forgiveness: 4,
        communication: 4,
        conflict_resolution: "prayer_first",
        financial_stewardship: "tithe_first",
        family_commitment: 5,
        spiritual_discipline: 5,
        personal_boundaries: 4,
        behavioral_dealbreakers: ["infidelity", "dishonesty", "addiction"],
        spiritual_non_negotiables: ["christian_faith", "prayer_life", "church_commitment"],
        relationship_non_negotiables: ["faithfulness", "mutual_respect"],
        family_non_negotiables: ["wants_children", "christian_education"],
        lifestyle_non_negotiables: ["no_alcohol", "no_smoking"],
      },
      personality: {
        communication_style: "gentle",
        emotional_expression: "open",
        conflict_style: "collaborative",
        introversion_extraversion: 3,
        organization_level: "organized",
        social_needs: 3,
        leadership_tendencies: 4,
        affection_style: "quality_time",
        relational_rhythm: "steady",
      },
      lifestyle: {
        daily_rhythm: "early_bird",
        career_ambition: 4,
        weekend_habits: ["church", "family_time", "ministry", "rest"],
        church_activities_frequency: "weekly",
        family_visits_frequency: "weekly",
        social_life_level: 3,
        technology_use: 4,
        social_media_usage: "minimal",
        daily_organization: "structured",
        cultural_traditions_importance: 4,
      },
      preferences: {
        preferred_age_min: 23,
        preferred_age_max: 32,
        max_distance_km: 100,
        preferred_languages: ["français", "anglais"],
        preferred_regions: ["Littoral", "Centre", "Ouest"],
        preferred_education: ["université", "master"],
        preferred_professions: [],
        hobbies: ["musique", "lecture", "sport", "cuisine"],
        interests: ["théologie", "technologie", "voyage"],
      },
      open_responses: {
        vision_of_marriage: "Un partenariat sacré devant Dieu, où nous grandissons ensemble spirituellement, servons dans le ministère, et bâtissons une famille selon les principes bibliques. L'amour, le respect et la prière sont au centre.",
        relationship_with_god_description: "Ma relation avec Dieu est le fondement de ma vie. Je prie plusieurs fois par jour, je médite sa Parole chaque matin, et je cherche à le connaître davantage chaque jour. Le Saint-Esprit me guide dans toutes mes décisions.",
        conflict_resolution_example: "Quand un désaccord survient, je commence par la prière. Ensuite, je cherche le dialogue calme et respectueux. Je crois qu'on peut toujours trouver un terrain d'entente quand les deux parties sont humbles devant Dieu.",
        parenting_philosophy: "Élever des enfants dans la crainte du Seigneur avec amour, patience et discipline. Les enseigner à prier, à respecter les aînés, et à servir les autres.",
        financial_stewardship_view: "La dîme vient en premier. Ensuite, je planifie avec sagesse, j'épargne pour l'avenir, et je donne généreusement. L'argent est un outil pour servir Dieu et sa famille.",
        definition_of_true_love: "L'amour véritable est un engagement sacré, patient et bienveillant. Il ne cherche pas son propre intérêt. Il est fondé sur le respect mutuel, la fidélité et la prière ensemble.",
        spiritual_legacy: "Laisser un héritage de foi, de prière et de service à Dieu. Que mes enfants et petits-enfants connaissent le Seigneur et le servent fidèlement.",
        ideal_relationship_description: "Une relation où nous prions ensemble, grandissons dans la Parole, nous encourageons mutuellement, et servons Dieu comme une équipe unie.",
      },
    },
  };
}

/** Profile B: Grace — Devout Pentecostal woman, 26, Yaoundé */
function createGrace(): EdenUserProfile {
  return {
    id: "u_grace_002",
    name: "Grace Ngo Biyick",
    email: "grace@example.com",
    gender: "femme",
    birth_date: "1999-07-22",
    city: "Yaoundé",
    country: "Cameroun",
    region: "Centre",
    avatar_url: null,
    bio: "Fille du Roi, passionnée par la louange et l'intercession.",
    profession: "Enseignante",
    civil_status: "celibataire",
    subscription_plan: "premium",
    onboarding_completed: true,
    profile_completion_pct: 92,
    created_at: "2025-02-01T10:00:00Z",
    updated_at: "2025-06-01T10:00:00Z",
    questionnaire: {
      spiritual: {
        is_christian: true,
        denomination: "pentecostal",
        faith_importance: 5,
        church_involvement: "very_active",
        prayer_frequency: "multiple_daily",
        bible_meditation: "daily",
        water_baptism: true,
        holy_spirit_baptism: true,
        relationship_with_god: 5,
        ministry_involvement: ["worship", "intercession", "children_ministry"],
        evangelism_active: true,
        spiritual_gifts: ["worship", "intercession", "teaching"],
        church_service: ["worship_team", "sunday_school"],
        purity_before_marriage: true,
        biblical_marriage_view: true,
        god_centered_relationship: true,
      },
      marriage_family: {
        marriage_desire: 5,
        marriage_timeline: "within_2_years",
        emotional_readiness: 4,
        spiritual_readiness: 5,
        financial_readiness: 3,
        wants_children: "required",
        desired_children_count: 3,
        parenting_vision: "Élever nos enfants dans l'amour du Seigneur, avec des prières quotidiennes, l'étude biblique familiale, et l'exemple d'une vie sainte.",
        family_values: ["faith", "love", "unity", "prayer", "discipline"],
        work_life_balance: "family_first",
        future_residence: "Flexible — partout où Dieu nous envoie, mais proche d'une communauté d'église solide.",
        ministry_vision: "Servir ensemble dans l'adoration et l'intercession, et inspirer d'autres couples chrétiens.",
        long_term_goals: "Être une femme vertueuse, une mère exemplaire, et une servante de Dieu fidèle dans tous les domaines.",
      },
      values: {
        faithfulness: 5,
        honesty: 5,
        respect: 5,
        humility: 5,
        responsibility: 4,
        forgiveness: 5,
        communication: 5,
        conflict_resolution: "prayer_first",
        financial_stewardship: "tithe_first",
        family_commitment: 5,
        spiritual_discipline: 5,
        personal_boundaries: 5,
        behavioral_dealbreakers: ["infidelity", "violence", "dishonesty"],
        spiritual_non_negotiables: ["christian_faith", "prayer_life", "holiness"],
        relationship_non_negotiables: ["faithfulness", "respect", "leadership"],
        family_non_negotiables: ["wants_children", "christian_education", "family_prayers"],
        lifestyle_non_negotiables: ["no_alcohol", "no_smoking", "no_parties"],
      },
      personality: {
        communication_style: "gentle",
        emotional_expression: "open",
        conflict_style: "collaborative",
        introversion_extraversion: 3,
        organization_level: "organized",
        social_needs: 3,
        leadership_tendencies: 3,
        affection_style: "quality_time",
        relational_rhythm: "slow_and_intentional",
      },
      lifestyle: {
        daily_rhythm: "early_bird",
        career_ambition: 3,
        weekend_habits: ["church", "family_time", "prayer", "rest"],
        church_activities_frequency: "weekly",
        family_visits_frequency: "weekly",
        social_life_level: 2,
        technology_use: 3,
        social_media_usage: "minimal",
        daily_organization: "structured",
        cultural_traditions_importance: 4,
      },
      preferences: {
        preferred_age_min: 26,
        preferred_age_max: 35,
        max_distance_km: 200,
        preferred_languages: ["français", "anglais"],
        preferred_regions: ["Centre", "Littoral", "Ouest"],
        preferred_education: ["université"],
        preferred_professions: [],
        hobbies: ["musique", "lecture", "prière", "cuisine"],
        interests: ["théologie", "éducation", "louange"],
      },
      open_responses: {
        vision_of_marriage: "Un mariage centré sur Dieu, un partenariat d'amour et de service. Grandir ensemble dans la prière, le ministère et l'amour. Un foyer où Dieu est au centre.",
        relationship_with_god_description: "Dieu est ma vie. Je passe des moments de prière chaque jour, j'étudie sa Parole avec passion, et je cherche à entendre sa voix. Le Saint-Esprit est mon guide et mon consolateur.",
        conflict_resolution_example: "Je crois que chaque conflit commence par la prière. Je m'agenouille d'abord, puis je parle avec douceur et respect. Le pardon est essentiel.",
        parenting_philosophy: "Élever des enfants craignant Dieu, avec beaucoup d'amour, de prières et d'enseignements bibliques. Être un exemple vivant de foi.",
        financial_stewardship_view: "Donner à Dieu en premier, gérer avec sagesse, être généreuse envers les nécessiteux. L'argent appartient à Dieu.",
        definition_of_true_love: "L'amour vrai est patient, il ne se vante pas. C'est un engagement quotidien, un sacrifice joyeux, et une prière constante pour l'autre.",
        spiritual_legacy: "Transmettre une foi authentique, un héritage de prière, et une passion pour Dieu à la génération suivante.",
        ideal_relationship_description: "Un couple qui prie ensemble, qui rit ensemble, qui grandit ensemble dans la foi et l'amour. Un leadership spirituel masculin respectueux.",
      },
    },
  };
}

/** Profile C: David — Casual Christian man, different expectations */
function createDavid(): EdenUserProfile {
  return {
    id: "u_david_003",
    name: "David Kamga",
    email: "david@example.com",
    gender: "homme",
    birth_date: "1995-11-10",
    city: "Bafoussam",
    country: "Cameroun",
    region: "Ouest",
    avatar_url: null,
    bio: "Chrétien, entrepreneur.",
    profession: "Entrepreneur",
    civil_status: "celibataire",
    subscription_plan: "free",
    onboarding_completed: true,
    profile_completion_pct: 70,
    created_at: "2025-03-01T10:00:00Z",
    updated_at: "2025-05-01T10:00:00Z",
    questionnaire: {
      spiritual: {
        is_christian: true,
        denomination: "pentecostal",
        faith_importance: 3,
        church_involvement: "occasional",
        prayer_frequency: "weekly",
        bible_meditation: "sometimes",
        water_baptism: true,
        holy_spirit_baptism: false,
        relationship_with_god: 3,
        ministry_involvement: [],
        evangelism_active: false,
        spiritual_gifts: [],
        church_service: [],
        purity_before_marriage: false,
        biblical_marriage_view: true,
        god_centered_relationship: true,
      },
      marriage_family: {
        marriage_desire: 3,
        marriage_timeline: "within_5_years",
        emotional_readiness: 3,
        spiritual_readiness: 2,
        financial_readiness: 4,
        wants_children: true,
        desired_children_count: 2,
        parenting_vision: "Donner une bonne éducation et des valeurs morales à mes enfants.",
        family_values: ["education", "respect", "success"],
        work_life_balance: "career_focused",
        future_residence: "Bafoussam ou Douala",
        ministry_vision: "",
        long_term_goals: "Développer mon entreprise, fonder une famille stable.",
      },
      values: {
        faithfulness: 4,
        honesty: 4,
        respect: 4,
        humility: 3,
        responsibility: 4,
        forgiveness: 3,
        communication: 3,
        conflict_resolution: "compromise",
        financial_stewardship: "budget_focused",
        family_commitment: 4,
        spiritual_discipline: 2,
        personal_boundaries: 3,
        behavioral_dealbreakers: ["infidelity"],
        spiritual_non_negotiables: ["christian_faith"],
        relationship_non_negotiables: ["faithfulness"],
        family_non_negotiables: [],
        lifestyle_non_negotiables: [],
      },
      personality: {
        communication_style: "direct",
        emotional_expression: "reserved",
        conflict_style: "compromising",
        introversion_extraversion: 4,
        organization_level: "flexible",
        social_needs: 4,
        leadership_tendencies: 4,
        affection_style: "acts_of_service",
        relational_rhythm: "fast_paced",
      },
      lifestyle: {
        daily_rhythm: "night_owl",
        career_ambition: 5,
        weekend_habits: ["business", "friends", "sports"],
        church_activities_frequency: "monthly",
        family_visits_frequency: "monthly",
        social_life_level: 4,
        technology_use: 5,
        social_media_usage: "heavy",
        daily_organization: "flexible",
        cultural_traditions_importance: 3,
      },
      preferences: {
        preferred_age_min: 22,
        preferred_age_max: 30,
        max_distance_km: 50,
        preferred_languages: ["français"],
        preferred_regions: ["Ouest", "Littoral"],
        preferred_education: [],
        preferred_professions: [],
        hobbies: ["sport", "business", "voyage"],
        interests: ["entrepreneuriat", "technologie", "sport"],
      },
      open_responses: {
        vision_of_marriage: "Un mariage heureux avec une bonne compagne qui me comprend et qui partage mes ambitions.",
        relationship_with_god_description: "Je crois en Dieu et je vais à l'église quand je peux. La foi est importante mais il faut aussi vivre.",
        conflict_resolution_example: "On discute calmement et on trouve un compromis.",
        parenting_philosophy: "Donner une bonne éducation, être présent et aimant.",
        financial_stewardship_view: "Bien gérer son argent, investir, épargner.",
        definition_of_true_love: "L'amour c'est le respect, la confiance et être là pour l'autre.",
        spiritual_legacy: "Transmettre de bonnes valeurs.",
        ideal_relationship_description: "Un couple moderne, complice, qui se respecte.",
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Garden of Alliance Matchmaking Engine", () => {
  
  describe("Hard Filters", () => {
    test("Samuel & Grace should pass all hard filters", () => {
      const samuel = createSamuel();
      const grace = createGrace();
      const result = applyHardFilters(samuel, grace);
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    test("Should fail when one user doesn't want children and the other requires it", () => {
      const samuel = createSamuel();
      const noChildrenUser = createGrace();
      noChildrenUser.questionnaire.marriage_family.wants_children = false;
      const result = applyHardFilters(samuel, noChildrenUser);
      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    test("Should fail for non-Christian match", () => {
      const samuel = createSamuel();
      const nonChristian = createGrace();
      nonChristian.questionnaire.spiritual.is_christian = false;
      const result = applyHardFilters(samuel, nonChristian);
      expect(result.passed).toBe(false);
    });
  });

  describe("Reciprocal Matching", () => {
    test("Samuel & Grace should have a high mutual score", () => {
      const samuel = createSamuel();
      const grace = createGrace();
      const result = computeReciprocalMatch(samuel, grace, DEFAULT_CONFIG);
      
      expect(result.mutual_score).toBeGreaterThanOrEqual(80);
      expect(result.match_status).not.toBe("NOT_COMPATIBLE");
      expect(result.score_a_to_b).toBeGreaterThan(0);
      expect(result.score_b_to_a).toBeGreaterThan(0);
    });

    test("Samuel & David should have lower compatibility due to spiritual gap", () => {
      const samuel = createSamuel();
      const david = createDavid();
      // Note: David is male so this test is about checking the algorithm logic
      // In production, David would be filtered out by gender
      const result = computeReciprocalMatch(samuel, david, DEFAULT_CONFIG);
      
      // David's lower spiritual maturity should reduce the score significantly
      expect(result.mutual_score).toBeLessThan(70);
    });

    test("Reciprocal scores should prevent one-sided compatibility", () => {
      const samuel = createSamuel();
      const grace = createGrace();
      const result = computeReciprocalMatch(samuel, grace, DEFAULT_CONFIG);
      
      // The mutual score should be the MIN of the two directions
      expect(result.mutual_score).toBe(Math.min(result.score_a_to_b, result.score_b_to_a));
    });
  });

  describe("Full Discovery Flow", () => {
    test("findMatches should return only compatible profiles", () => {
      const samuel = createSamuel();
      const grace = createGrace();
      const david = createDavid();
      // Change David's gender to make him eligible
      david.gender = "femme";

      const result = findMatches(samuel, [grace, david], DEFAULT_CONFIG);
      
      // Grace should match, David should not (or score much lower)
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      
      if (result.matches.length > 0) {
        // First match should be Grace (highest score)
        expect(result.matches[0].user_id).toBe("u_grace_002");
        expect(result.matches[0].score).toBeGreaterThanOrEqual(70);
      }
    });

    test("Should exclude self from results", () => {
      const samuel = createSamuel();
      const samuelCopy = { ...createSamuel(), id: "u_samuel_001" };
      const result = findMatches(samuel, [samuelCopy], DEFAULT_CONFIG);
      expect(result.matches).toHaveLength(0);
    });

    test("Should handle incomplete candidates gracefully", () => {
      const samuel = createSamuel();
      const incomplete = createGrace();
      incomplete.onboarding_completed = false;
      const result = findMatches(samuel, [incomplete], DEFAULT_CONFIG);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe("Match Explanations", () => {
    test("Should generate meaningful explanations for a strong match", () => {
      const samuel = createSamuel();
      const grace = createGrace();
      const result = computeReciprocalMatch(samuel, grace, DEFAULT_CONFIG);
      const summary = generateMatchSummary(result);
      
      expect(summary.score).toBeGreaterThanOrEqual(80);
      expect(summary.why.length).toBeGreaterThan(0);
      expect(summary.status).not.toBe("NOT_COMPATIBLE");
    });
  });

  describe("Semantic Analysis", () => {
    test("Should extract themes from open responses", () => {
      const samuel = createSamuel();
      const semantic = extractSemanticProfile(samuel.questionnaire.open_responses);
      
      expect(semantic.marriage_values.length).toBeGreaterThan(0);
      expect(semantic.faith_values.length).toBeGreaterThan(0);
    });

    test("Samuel and Grace should have high semantic similarity", () => {
      const samuel = createSamuel();
      const grace = createGrace();
      
      const semSamuel = extractSemanticProfile(samuel.questionnaire.open_responses);
      const semGrace = extractSemanticProfile(grace.questionnaire.open_responses);
      
      const comparison = compareSemanticProfiles(semSamuel, semGrace);
      expect(comparison.score).toBeGreaterThan(50);
      expect(comparison.sharedThemes.length).toBeGreaterThan(0);
    });
  });
});