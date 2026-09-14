// ============================================================================
//  Garden of Alliance — Adapter: raw onboarding answers → sophisticated engine
//  ---------------------------------------------------------------------------
//  The onboarding questionnaire (src/lib/onboarding.ts + onboarding.en.ts)
//  was designed independently from the matching engine (src/lib/matching/).
//  Its fields use different names, French/English option labels, and mostly
//  free text, while the engine expects English enum keys and 1-5 scales.
//
//  This adapter maps every field that DOES have a real onboarding equivalent
//  (denomination, prayer frequency, daily rhythm, age range, tithing, …).
//  For engine fields the questionnaire never asks about (personality scales,
//  love language, numeric readiness/values self-ratings, …), it assigns the
//  SAME neutral constant to every user rather than guessing — so those
//  dimensions don't fabricate a difference between two candidates, they just
//  contribute a flat, honest "no signal" baseline to their category score.
//  Search "NOT COLLECTED" below for the exact list.
// ============================================================================

import type { EdenUserProfile, QuestionnaireResponse, MatchStatus } from "./types";
import { checkQuestionnaireCompletion } from "../onboarding";
import { checkMatch, generateMatchSummary } from "./engine";
import { DEFAULT_CONFIG } from "./config";

// ── GENERIC HELPERS ──────────────────────────────────────────────────────────

function mapChoice<T>(raw: unknown, table: Record<string, T>, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  return table[raw] ?? fallback;
}

function splitFreeList(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(/[,;/]|\bet\b|\band\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function asArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

function asText(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

// ── FIELD-LEVEL MAPPINGS (FR + EN option labels → engine values) ────────────

const YES_VALUES = new Set(["Oui", "Yes"]);

const DENOMINATION_MAP: Record<string, string> = {
  "Catholique": "catholic", "Catholic": "catholic",
  "Protestant(e) (Réformé)": "other", "Protestant (Reformed)": "other",
  "Évangélique": "evangelical", "Evangelical": "evangelical",
  "Pentecôtiste": "pentecostal", "Pentecostal": "pentecostal",
  "Baptiste": "baptist", "Baptist": "baptist",
  "Méthodiste": "methodist", "Methodist": "methodist",
  "Orthodoxe": "other", "Orthodox": "other",
  "Sans dénomination": "other", "Non-denominational": "other",
  "Autre": "other", "Other": "other",
};

const WATER_BAPTISM_MAP: Record<string, boolean> = {
  "Oui, à l'âge adulte": true, "Yes, as an adult": true,
  "Oui, enfant": true, "Yes, as a child": true,
  "Pas encore, mais je le désire": false, "Not yet, but I desire it": false,
  "Non": false, "No": false,
};

type PrayerBucket = { freq: "rarely" | "sometimes" | "weekly" | "daily" | "multiple_daily"; n: number };
const PRAYER_MAP: Record<string, PrayerBucket> = {
  "Plusieurs fois par jour": { freq: "multiple_daily", n: 5 }, "Several times a day": { freq: "multiple_daily", n: 5 },
  "Une fois par jour": { freq: "daily", n: 4 }, "Once a day": { freq: "daily", n: 4 },
  "Quelques fois par semaine": { freq: "weekly", n: 3 }, "A few times a week": { freq: "weekly", n: 3 },
  "Occasionnellement": { freq: "sometimes", n: 2 }, "Occasionally": { freq: "sometimes", n: 2 },
  "Rarement": { freq: "rarely", n: 1 }, "Rarely": { freq: "rarely", n: 1 },
};
const PRAYER_FALLBACK: PrayerBucket = { freq: "sometimes", n: 2 };

type ChurchInvolvement = "none" | "occasional" | "regular" | "very_active" | "leader";
const IMPLICATION_MAP: Record<string, ChurchInvolvement> = {
  "Pasteur ou responsable": "leader", "Pastor or leader": "leader",
  "Diacre ou ancien": "leader", "Deacon or elder": "leader",
  "Responsable de ministère": "very_active", "Ministry leader": "very_active",
  "Membre actif": "regular", "Active member": "regular",
  "Participant(e) occasionnel(le)": "occasional", "Occasional attendee": "occasional",
};
const MEMBRE_ACTIF_MAP: Record<string, ChurchInvolvement> = {
  "Oui": "regular", "Yes": "regular",
  "Non, mais j'y assiste régulièrement": "occasional", "No, but I attend regularly": "occasional",
  "Non": "none", "No": "none",
};

const RELATION_DIEU_MAP: Record<string, number> = {
  "Intime et grandissante chaque jour": 5, "Intimate and growing daily": 5,
  "Sincère mais avec des axes de progrès": 4, "Sincere but with areas for growth": 4,
  "Nouvelle ou récemment ravivée": 3, "New or recently rekindled": 3,
  "Dans une période de recherche ou de sécheresse spirituelle": 2, "In a period of seeking or spiritual dryness": 2,
  "Je préfère ne pas répondre": 3, "Prefer not to answer": 3,
};

const ROLE_DIEU_MAP: Record<string, boolean> = {
  "Il doit être le fondement absolu": true, "He must be the absolute foundation": true,
  "Il est important mais pas l'unique critère": true, "He is important but not the only criterion": true,
  "Je suis encore en train de définir sa place": false, "I'm still figuring out His place": false,
  "Je préfère ne pas répondre": false, "Prefer not to answer": false,
};

const PURITY_VALUE = new Set(["Pureté avant le mariage", "Purity before marriage"]);
const BIBLICAL_ROLES_VALUE = new Set(["Respect des rôles bibliques dans le couple", "Respect for biblical roles in marriage"]);
const LOOSE_BOUNDARY = new Set(["À définir ensemble avec le/la partenaire", "To define together with my partner"]);

const MARRIAGE_TIMELINE_MAP: Record<string, EdenUserProfile["questionnaire"]["marriage_family"]["marriage_timeline"]> = {
  "Moins de 6 mois": "within_6_months", "Less than 6 months": "within_6_months",
  "6 mois à 1 an": "within_1_year", "6 months to 1 year": "within_1_year",
  "1 à 2 ans": "within_2_years", "1 to 2 years": "within_2_years",
  "Plus de 2 ans": "within_5_years", "More than 2 years": "within_5_years",
  "Sans précipitation": "no_timeline", "No rush": "no_timeline",
};

const RELATIONAL_RHYTHM_MAP: Record<string, "fast_paced" | "steady" | "slow_and_intentional"> = {
  "Moins de 6 mois": "fast_paced", "Less than 6 months": "fast_paced",
  "6 mois à 1 an": "fast_paced", "6 months to 1 year": "fast_paced",
  "1 à 2 ans": "steady", "1 to 2 years": "steady",
  "Plus de 2 ans": "slow_and_intentional", "More than 2 years": "slow_and_intentional",
  "Sans précipitation": "slow_and_intentional", "No rush": "slow_and_intentional",
};

const NB_ENFANTS_MAP: Record<string, { wants: boolean; count: number | null }> = {
  "Aucun": { wants: false, count: 0 }, "None": { wants: false, count: 0 },
  "1–2": { wants: true, count: 2 },
  "3–4": { wants: true, count: 4 },
  "5 ou plus": { wants: true, count: 5 }, "5 or more": { wants: true, count: 5 },
  "Selon la volonté de Dieu": { wants: true, count: null }, "God's will": { wants: true, count: null },
};

const FEMME_TRAVAIL_MAP: Record<string, "career_focused" | "balanced" | "family_first"> = {
  "Oui, absolument": "balanced", "Yes, absolutely": "balanced",
  "Cela dépend de la situation": "balanced", "It depends on the situation": "balanced",
  "Non, je préfère qu'elle se consacre à la famille": "family_first", "No, I prefer she focus on the family": "family_first",
  "Nous déciderons ensemble": "balanced", "We will decide together": "balanced",
};

const DETTES_MAP: Record<string, number> = {
  "Non": 4, "No": 4,
  "Je préfère ne pas répondre": 3, "Prefer not to answer": 3,
};

const FINANCIAL_STEWARDSHIP_MAP: Record<string, "tithe_first" | "budget_focused" | "generous_giving" | "saving_priority"> = {
  "Oui, fidèlement": "tithe_first", "Yes, faithfully": "tithe_first",
  "Occasionnellement": "generous_giving", "Occasionally": "generous_giving",
  "Pas encore, mais j'ai l'intention de commencer": "budget_focused", "Not yet, but I plan to": "budget_focused",
  "Non": "saving_priority", "No": "saving_priority",
};

const DAILY_RHYTHM_MAP: Record<string, "early_bird" | "night_owl" | "flexible"> = {
  "Personne du matin": "early_bird", "Morning person": "early_bird",
  "Personne du soir": "night_owl", "Night owl": "night_owl",
};

const ORGANIZATION_MAP: Record<string, "very_structured" | "structured" | "flexible" | "unstructured"> = {
  "Organisé(e) et structuré(e)": "structured", "Organized and structured": "structured",
  "Spontané(e) et flexible": "unstructured", "Spontaneous and flexible": "unstructured",
};

const CHURCH_FREQ_FROM_INVOLVEMENT: Record<ChurchInvolvement, "weekly" | "biweekly" | "monthly" | "occasional"> = {
  leader: "weekly", very_active: "weekly", regular: "biweekly", occasional: "monthly", none: "occasional",
};

const LANGUAGE_MAP: Record<string, string> = {
  "Français": "french", "French": "french",
  "Anglais": "english", "English": "english",
  "Langue locale": "local", "Local language": "local",
  "Autre": "other", "Other": "other",
};

// ── AGE RANGE (questionnaire field "trancheAge": { min, max }) ──────────────

function extractAgeRange(raw: unknown): { min: number; max: number } {
  const range = raw && typeof raw === "object" ? (raw as { min?: unknown; max?: unknown }) : null;
  const min = Number(range?.min);
  const max = Number(range?.max);
  return {
    min: Number.isFinite(min) && min > 0 ? min : 21,
    max: Number.isFinite(max) && max > 0 ? max : 99,
  };
}

// ── NEUTRAL DEFAULTS (fields the real onboarding NEVER asks) ────────────────
// Applied identically to every user so they never create fake differentiation
// between two candidates — they just add a flat "no signal" contribution.
const NOT_COLLECTED = {
  scale3: 3, // generic 1-5 midpoint (introversion, social_needs, leadership, career_ambition, …)
  faithfulness: 3, honesty: 3, respect: 3, humility: 3, responsibility: 3,
  family_commitment: 3, spiritual_discipline: 3, personal_boundaries: 3,
  emotional_readiness: 3, spiritual_readiness: 3,
  communication_style: "gentle" as const,
  emotional_expression: "moderate" as const,
  conflict_style: "collaborative" as const,
  conflict_resolution: "collaborative" as const,
  affection_style: "quality_time" as const,
  social_media_usage: "moderate" as const,
  family_visits_frequency: "weekly" as const,
};

// ── MAIN ADAPTER ──────────────────────────────────────────────────────────────

export interface AdapterInput {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  gender?: string | null;
  birthDate?: string | null; // ISO
  city?: string | null;
  country?: string | null;
  region?: string | null;
  civilStatus?: string | null;
  profession?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  verification_status?: string | null;
  questionnaire?: Record<string, any> | null;
}

/** Converts a member/profile with raw onboarding answers into the engine's EdenUserProfile. */
export function toEdenProfile(input: AdapterInput): EdenUserProfile {
  const q = input.questionnaire || {};
  const completion = checkQuestionnaireCompletion(q);

  const prayer = mapChoice(q.priere, PRAYER_MAP, PRAYER_FALLBACK);
  const churchInvolvement = mapChoice(
    q.implication,
    IMPLICATION_MAP,
    mapChoice(q.membreActif, MEMBRE_ACTIF_MAP, "occasional")
  );
  const spiritualValues = asArray(q.limitesSpirituelles);
  const relationalBoundary = typeof q.limitesRelationnelles === "string" ? q.limitesRelationnelles : null;
  const purity =
    spiritualValues.some((v) => PURITY_VALUE.has(v)) ||
    (relationalBoundary != null && !LOOSE_BOUNDARY.has(relationalBoundary)) ||
    relationalBoundary == null;

  const nbEnfants = mapChoice(q.nbEnfants, NB_ENFANTS_MAP, { wants: true, count: null });
  const financial_readiness = mapChoice(q.dettes, DETTES_MAP, NOT_COLLECTED.spiritual_readiness);

  const questionnaire: QuestionnaireResponse = {
    spiritual: {
      is_christian: YES_VALUES.has(q.estChretien),
      denomination: mapChoice(q.denomination, DENOMINATION_MAP, "pentecostal"),
      faith_importance: prayer.n, // proxy: prayer frequency ≈ importance of faith
      church_involvement: churchInvolvement,
      prayer_frequency: prayer.freq,
      bible_meditation: prayer.freq, // NOT COLLECTED — reuses the prayer signal as the closest proxy
      water_baptism: mapChoice(q.bapteme, WATER_BAPTISM_MAP, false),
      holy_spirit_baptism: true, // NOT COLLECTED — Pentecostal-platform assumption, flat for everyone
      relationship_with_god: mapChoice(q.relationDieu, RELATION_DIEU_MAP, 3),
      ministry_involvement: typeof q.implication === "string" ? [q.implication] : [],
      evangelism_active: YES_VALUES.has(q.role),
      spiritual_gifts: [],
      church_service: [],
      purity_before_marriage: purity,
      biblical_marriage_view: spiritualValues.some((v) => BIBLICAL_ROLES_VALUE.has(v)) || spiritualValues.length === 0,
      god_centered_relationship: mapChoice(q.roleDieu, ROLE_DIEU_MAP, true),
    },
    marriage_family: {
      marriage_desire: 4, // NOT COLLECTED — platform is explicitly marriage-oriented by design
      marriage_timeline: mapChoice(q.rythmeRelation, MARRIAGE_TIMELINE_MAP, "no_timeline"),
      emotional_readiness: NOT_COLLECTED.emotional_readiness,
      spiritual_readiness: NOT_COLLECTED.spiritual_readiness,
      financial_readiness,
      wants_children: nbEnfants.wants,
      desired_children_count: nbEnfants.count,
      parenting_vision: asText(q.educationEnfants),
      family_values: asArray(q.attentes),
      work_life_balance: mapChoice(q.femmeTravail, FEMME_TRAVAIL_MAP, "balanced"),
      future_residence: "", // NOT COLLECTED
      ministry_vision: "", // NOT COLLECTED
      long_term_goals: asText(q.ambitions),
    },
    values: {
      faithfulness: NOT_COLLECTED.faithfulness,
      honesty: NOT_COLLECTED.honesty,
      respect: NOT_COLLECTED.respect,
      humility: NOT_COLLECTED.humility,
      responsibility: NOT_COLLECTED.responsibility,
      forgiveness: NOT_COLLECTED.scale3,
      communication: NOT_COLLECTED.scale3,
      conflict_resolution: NOT_COLLECTED.conflict_resolution,
      financial_stewardship: mapChoice(q.dime, FINANCIAL_STEWARDSHIP_MAP, "budget_focused"),
      family_commitment: NOT_COLLECTED.family_commitment,
      spiritual_discipline: NOT_COLLECTED.spiritual_discipline,
      personal_boundaries: NOT_COLLECTED.personal_boundaries,
      behavioral_dealbreakers: asArray(q.limitesComportementales),
      spiritual_non_negotiables: spiritualValues,
      relationship_non_negotiables: relationalBoundary ? [relationalBoundary] : [],
      family_non_negotiables: [],
      lifestyle_non_negotiables: [],
    },
    personality: {
      communication_style: NOT_COLLECTED.communication_style,
      emotional_expression: NOT_COLLECTED.emotional_expression,
      conflict_style: NOT_COLLECTED.conflict_style,
      introversion_extraversion: NOT_COLLECTED.scale3,
      organization_level: "organized",
      social_needs: NOT_COLLECTED.scale3,
      leadership_tendencies: NOT_COLLECTED.scale3,
      affection_style: NOT_COLLECTED.affection_style,
      relational_rhythm: mapChoice(q.rythmeRelation, RELATIONAL_RHYTHM_MAP, "steady"),
    },
    lifestyle: {
      daily_rhythm: mapChoice(q.rythme, DAILY_RHYTHM_MAP, "flexible"),
      career_ambition: NOT_COLLECTED.scale3,
      weekend_habits: [],
      church_activities_frequency: CHURCH_FREQ_FROM_INVOLVEMENT[churchInvolvement],
      family_visits_frequency: NOT_COLLECTED.family_visits_frequency,
      social_life_level: NOT_COLLECTED.scale3,
      technology_use: NOT_COLLECTED.scale3,
      social_media_usage: NOT_COLLECTED.social_media_usage,
      daily_organization: mapChoice(q.organisation, ORGANIZATION_MAP, "flexible"),
      cultural_traditions_importance: NOT_COLLECTED.scale3,
    },
    preferences: {
      preferred_age_min: extractAgeRange(q.trancheAge).min,
      preferred_age_max: extractAgeRange(q.trancheAge).max,
      max_distance_km: 0, // NOT COLLECTED — no geo-radius UI today
      preferred_languages: asArray(q.langues).map((l) => LANGUAGE_MAP[l] ?? l.toLowerCase()),
      preferred_regions: [],
      preferred_education: [],
      preferred_professions: [],
      hobbies: splitFreeList(q.hobbies),
      interests: [],
    },
    open_responses: {
      vision_of_marriage: asText(q.visionCouple),
      relationship_with_god_description: asText(q.temoignage),
      conflict_resolution_example: asText(q.gestionConflits),
      parenting_philosophy: asText(q.educationEnfants),
      financial_stewardship_view: asText(q.epargne),
      definition_of_true_love: asText(q.attiranceVsAmour),
      spiritual_legacy: asText(q.heritage),
      ideal_relationship_description: asText(q.mariageReussi),
    },
  };

  return {
    id: input.id || "",
    name: input.name || "",
    email: input.email || undefined,
    gender: input.gender === "femme" ? "femme" : "homme",
    birth_date: input.birthDate || "",
    city: input.city || "",
    country: input.country || "",
    region: input.region || undefined,
    avatar_url: input.avatar_url || undefined,
    bio: input.bio || undefined,
    profession: input.profession || undefined,
    civil_status: input.civilStatus || undefined,
    subscription_plan: "free",
    onboarding_completed: Object.keys(q).length > 0,
    verification_status: input.verification_status || undefined,
    profile_completion_pct: completion.percentage,
    questionnaire,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── UI-FACING HELPERS ────────────────────────────────────────────────────────
// These wrap the reciprocal engine (hard filters → two directional scores →
// MIN → 70% threshold) behind the same shape the dashboard previously used.

export interface DisplayMatch {
  score: number;
  reasons: string[];
  discuss: string[];
  status: MatchStatus;
}

/** Reciprocal, hard-filtered compatibility between the current user and one member. */
export function computeDisplayMatch(me: AdapterInput, other: AdapterInput): DisplayMatch {
  const result = checkMatch(toEdenProfile(me), toEdenProfile(other), DEFAULT_CONFIG);
  const summary = generateMatchSummary(result);
  return { score: summary.score, reasons: summary.why, discuss: summary.discuss, status: summary.status as MatchStatus };
}

/**
 * Keeps only members who pass the engine's hard filters AND clear the
 * compatibility threshold (70% by default), sorted by mutual score descending.
 * This is what makes "Découvrir" show only profiles worth considering, instead
 * of every opposite-gender member tagged with a score.
 */
export function filterAndRankByReciprocalMatch<T extends AdapterInput>(
  me: AdapterInput,
  members: T[],
  minScore: number = DEFAULT_CONFIG.match_threshold
): T[] {
  const meProfile = toEdenProfile(me);
  const scored = members
    .map((m) => {
      const result = checkMatch(meProfile, toEdenProfile(m), DEFAULT_CONFIG);
      return { m, score: result.mutual_score, status: result.match_status };
    })
    .filter((s) => s.status !== "NOT_COMPATIBLE" && s.score >= minScore);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.m);
}
