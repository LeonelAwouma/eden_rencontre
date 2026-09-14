// ============================================================================
//  Garden of Alliance — Matching Discovery API Route
//  GET /api/matching/discover — Returns compatible profiles for the authenticated user
//  Backend-only: frontend never receives all users
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findMatches, checkMatch, generateMatchSummary } from "@/lib/matching/engine";
import { DEFAULT_CONFIG } from "@/lib/matching/config";
import type { EdenUserProfile, QuestionnaireResponse, MatchingConfig } from "@/lib/matching/types";

// ── SUPABASE CLIENT ──────────────────────────────────────────────────────────

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET: DISCOVER MATCHES ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 1. Authenticate user
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 2. Load seeker profile + questionnaire
    const seeker = await loadUserProfile(supabase, user.id);
    if (!seeker) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    if (!seeker.onboarding_completed) {
      return NextResponse.json({
        matches: [],
        total: 0,
        message: "Veuillez compléter votre questionnaire pour voir vos correspondances.",
      });
    }

    // 3. Load matching configuration
    const config = await loadMatchingConfig(supabase);

    // 4. Pre-filter candidates from database (indexed query)
    const candidates = await loadCandidates(supabase, seeker, config);

    // 5. Run matching engine
    const result = findMatches(seeker, candidates, config);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Erreur matching:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ── POST: CHECK SPECIFIC MATCH ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const body = await request.json();
    const { candidate_id } = body;

    if (!candidate_id) {
      return NextResponse.json({ error: "candidate_id requis" }, { status: 400 });
    }

    const seeker = await loadUserProfile(supabase, user.id);
    const candidate = await loadUserProfile(supabase, candidate_id);

    if (!seeker || !candidate) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    const config = await loadMatchingConfig(supabase);
    const result = checkMatch(seeker, candidate, config);
    const summary = generateMatchSummary(result);

    return NextResponse.json({
      ...summary,
      details: {
        score_a_to_b: result.score_a_to_b,
        score_b_to_a: result.score_b_to_a,
        mutual_score: result.mutual_score,
        match_status: result.match_status,
        match_level: result.match_level,
        strengths: result.combined_strengths,
        differences: result.combined_differences,
      },
    });

  } catch (error) {
    console.error("Erreur check match:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA LOADING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadUserProfile(supabase: any, userId: string): Promise<EdenUserProfile | null> {
  // Load profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return null;

  // Load questionnaire
  const { data: questionnaire, error: qError } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (qError || !questionnaire) return null;

  // Map database row to QuestionnaireResponse
  const qResponse: QuestionnaireResponse = mapQuestionnaireFromDB(questionnaire);

  return {
    id: profile.id,
    name: profile.name || profile.full_name || "",
    email: profile.email,
    gender: profile.gender,
    birth_date: profile.birth_date,
    city: profile.city || "",
    country: profile.country || "",
    region: profile.region,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    profession: profile.profession,
    civil_status: profile.civil_status,
    subscription_plan: profile.subscription_plan || "free",
    onboarding_completed: profile.onboarding_completed || false,
    verification_status: profile.verification_status || "none",
    profile_completion_pct: questionnaire.completion_pct || 0,
    questionnaire: qResponse,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

async function loadMatchingConfig(supabase: any): Promise<MatchingConfig> {
  const { data } = await supabase
    .from("matching_config")
    .select("*")
    .eq("config_name", "default")
    .eq("is_active", true)
    .single();

  if (!data) return DEFAULT_CONFIG;

  return {
    weights: data.weights || DEFAULT_CONFIG.weights,
    match_threshold: data.match_threshold ?? DEFAULT_CONFIG.match_threshold,
    weak_threshold: data.weak_threshold ?? DEFAULT_CONFIG.weak_threshold,
    strong_threshold: data.strong_threshold ?? DEFAULT_CONFIG.strong_threshold,
    exceptional_threshold: data.exceptional_threshold ?? DEFAULT_CONFIG.exceptional_threshold,
    max_results: data.max_results ?? DEFAULT_CONFIG.max_results,
    min_profile_completion: data.min_profile_completion ?? DEFAULT_CONFIG.min_profile_completion,
    enable_semantic_analysis: data.enable_semantic_analysis ?? DEFAULT_CONFIG.enable_semantic_analysis,
  };
}

/**
 * Pre-filter candidates using indexed database queries.
 * This is the KEY performance optimization — we never load all users.
 * 
 * Filters applied at DB level:
 * - Opposite gender
 * - Age 21+
 * - Onboarding completed
 * - Christian = true
 * - Compatible denomination
 * - Marriage desire >= 2
 * - Profile completion >= minimum
 */
async function loadCandidates(
  supabase: any,
  seeker: EdenUserProfile,
  config: MatchingConfig
): Promise<EdenUserProfile[]> {
  const oppositeGender = seeker.gender === "homme" ? "femme" : "homme";
  const minAge = 21;
  const maxAge = 100;
  
  // Calculate birth date range for age filtering
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate()).toISOString();
  const minBirthDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate()).toISOString();

  // Get compatible denominations for the seeker
  const { COMPATIBLE_DENOMINATIONS } = await import("@/lib/matching/config");
  const seekerDenom = seeker.questionnaire.spiritual.denomination.toLowerCase();
  const compatibleDenoms = COMPATIBLE_DENOMINATIONS[seekerDenom] || [seekerDenom];

  // Step 1: Query profiles with basic filters
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, full_name, email, gender, birth_date, city, country, region, avatar_url, bio, profession, civil_status, subscription_plan, onboarding_completed, verification_status, created_at, updated_at")
    .eq("gender", oppositeGender)
    .eq("onboarding_completed", true)
    .gte("birth_date", minBirthDate)
    .lte("birth_date", maxBirthDate)
    .neq("id", seeker.id)
    .limit(500); // Pre-limit to avoid loading too many

  if (error || !profiles || profiles.length === 0) {
    return [];
  }

  // Step 2: Load questionnaires for these profiles
  const userIds = profiles.map((p: any) => p.id);
  
    const { data: questionnaires }: { data: any[] | null } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .in("user_id", userIds)
    .eq("is_christian", true)
    .in("denomination", compatibleDenoms)
    .gte("marriage_desire", 2)
    .gte("completion_pct", config.min_profile_completion);

  if (!questionnaires || questionnaires.length === 0) {
    return [];
  }

  // Step 3: Build EdenUserProfile objects
    const qMap = new Map((questionnaires || []).map((q: any) => [q.user_id, q]));
  
  const candidates: EdenUserProfile[] = [];
  for (const profile of profiles) {
    const q = qMap.get(profile.id);
    if (!q) continue;

    candidates.push({
      id: profile.id,
      name: profile.name || profile.full_name || "",
      email: profile.email,
      gender: profile.gender,
      birth_date: profile.birth_date,
      city: profile.city || "",
      country: profile.country || "",
      region: profile.region,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      profession: profile.profession,
      civil_status: profile.civil_status,
      subscription_plan: profile.subscription_plan || "free",
      onboarding_completed: profile.onboarding_completed || false,
      verification_status: profile.verification_status || "none",
      profile_completion_pct: q.completion_pct || 0,
      questionnaire: mapQuestionnaireFromDB(q),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    });
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

function mapQuestionnaireFromDB(row: any): QuestionnaireResponse {
  return {
    spiritual: {
      is_christian: row.is_christian ?? true,
      denomination: row.denomination ?? "pentecostal",
      faith_importance: row.faith_importance ?? 5,
      church_involvement: row.church_involvement ?? "regular",
      prayer_frequency: row.prayer_frequency ?? "daily",
      bible_meditation: row.bible_meditation ?? "weekly",
      water_baptism: row.water_baptism ?? false,
      holy_spirit_baptism: row.holy_spirit_baptism ?? false,
      relationship_with_god: row.relationship_with_god ?? 4,
      ministry_involvement: row.ministry_involvement ?? [],
      evangelism_active: row.evangelism_active ?? false,
      spiritual_gifts: row.spiritual_gifts ?? [],
      church_service: row.church_service ?? [],
      purity_before_marriage: row.purity_before_marriage ?? true,
      biblical_marriage_view: row.biblical_marriage_view ?? true,
      god_centered_relationship: row.god_centered_relationship ?? true,
    },
    marriage_family: {
      marriage_desire: row.marriage_desire ?? 4,
      marriage_timeline: row.marriage_timeline ?? "within_2_years",
      emotional_readiness: row.emotional_readiness ?? 3,
      spiritual_readiness: row.spiritual_readiness ?? 4,
      financial_readiness: row.financial_readiness ?? 3,
      wants_children: row.wants_children === "true" ? true : row.wants_children === "required" ? "required" : false,
      desired_children_count: row.desired_children_count ?? null,
      parenting_vision: row.parenting_vision ?? "",
      family_values: row.family_values ?? [],
      work_life_balance: row.work_life_balance ?? "balanced",
      future_residence: row.future_residence ?? "",
      ministry_vision: row.ministry_vision ?? "",
      long_term_goals: row.long_term_goals ?? "",
    },
    values: {
      faithfulness: row.faithfulness ?? 5,
      honesty: row.honesty ?? 5,
      respect: row.respect ?? 5,
      humility: row.humility ?? 4,
      responsibility: row.responsibility ?? 4,
      forgiveness: row.forgiveness ?? 4,
      communication: row.communication ?? 4,
      conflict_resolution: row.conflict_resolution ?? "collaborative",
      financial_stewardship: row.financial_stewardship ?? "tithe_first",
      family_commitment: row.family_commitment ?? 5,
      spiritual_discipline: row.spiritual_discipline ?? 4,
      personal_boundaries: row.personal_boundaries ?? 4,
      behavioral_dealbreakers: row.behavioral_dealbreakers ?? [],
      spiritual_non_negotiables: row.spiritual_non_negotiables ?? [],
      relationship_non_negotiables: row.relationship_non_negotiables ?? [],
      family_non_negotiables: row.family_non_negotiables ?? [],
      lifestyle_non_negotiables: row.lifestyle_non_negotiables ?? [],
    },
    personality: {
      communication_style: row.communication_style ?? "gentle",
      emotional_expression: row.emotional_expression ?? "moderate",
      conflict_style: row.conflict_style ?? "collaborative",
      introversion_extraversion: row.introversion_extraversion ?? 3,
      organization_level: row.organization_level ?? "organized",
      social_needs: row.social_needs ?? 3,
      leadership_tendencies: row.leadership_tendencies ?? 3,
      affection_style: row.affection_style ?? "quality_time",
      relational_rhythm: row.relational_rhythm ?? "steady",
    },
    lifestyle: {
      daily_rhythm: row.daily_rhythm ?? "flexible",
      career_ambition: row.career_ambition ?? 3,
      weekend_habits: row.weekend_habits ?? [],
      church_activities_frequency: row.church_activities_frequency ?? "weekly",
      family_visits_frequency: row.family_visits_frequency ?? "weekly",
      social_life_level: row.social_life_level ?? 3,
      technology_use: row.technology_use ?? 3,
      social_media_usage: row.social_media_usage ?? "moderate",
      daily_organization: row.daily_organization ?? "structured",
      cultural_traditions_importance: row.cultural_traditions_importance ?? 4,
    },
    preferences: {
      preferred_age_min: row.preferred_age_min ?? 21,
      preferred_age_max: row.preferred_age_max ?? 45,
      max_distance_km: row.max_distance_km ?? 100,
      preferred_languages: row.preferred_languages ?? ["français"],
      preferred_regions: row.preferred_regions ?? [],
      preferred_education: row.preferred_education ?? [],
      preferred_professions: row.preferred_professions ?? [],
      hobbies: row.hobbies ?? [],
      interests: row.interests ?? [],
    },
    open_responses: {
      vision_of_marriage: row.vision_of_marriage ?? "",
      relationship_with_god_description: row.relationship_with_god_description ?? "",
      conflict_resolution_example: row.conflict_resolution_example ?? "",
      parenting_philosophy: row.parenting_philosophy ?? "",
      financial_stewardship_view: row.financial_stewardship_view ?? "",
      definition_of_true_love: row.definition_of_true_love ?? "",
      spiritual_legacy: row.spiritual_legacy ?? "",
      ideal_relationship_description: row.ideal_relationship_description ?? "",
    },
  };
}