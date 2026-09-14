-- ============================================================================
-- GARDEN OF ALLIANCE — Matchmaking Engine: Database Schema
-- Stores questionnaire responses, matching configuration, and computed match results.
-- ============================================================================

-- ── MATCHING CONFIGURATION TABLE ─────────────────────────────────────────────
-- Stores configurable weights and thresholds (admin can modify)

CREATE TABLE IF NOT EXISTS matching_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL UNIQUE DEFAULT 'default',
  weights JSONB NOT NULL DEFAULT '{
    "spiritual": 0.30,
    "marriage_family": 0.25,
    "values": 0.20,
    "personality": 0.10,
    "lifestyle": 0.10,
    "preferences": 0.05
  }'::jsonb,
  match_threshold INTEGER NOT NULL DEFAULT 70,
  weak_threshold INTEGER NOT NULL DEFAULT 60,
  strong_threshold INTEGER NOT NULL DEFAULT 80,
  exceptional_threshold INTEGER NOT NULL DEFAULT 90,
  max_results INTEGER NOT NULL DEFAULT 50,
  min_profile_completion INTEGER NOT NULL DEFAULT 60,
  enable_semantic_analysis BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO matching_config (config_name, is_active) VALUES ('default', true)
ON CONFLICT (config_name) DO NOTHING;

-- ── QUESTIONNAIRE RESPONSES TABLE ────────────────────────────────────────────
-- Stores the full structured questionnaire response for each user

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Spiritual profile
  is_christian BOOLEAN NOT NULL DEFAULT true,
  denomination TEXT NOT NULL DEFAULT 'pentecostal',
  faith_importance INTEGER NOT NULL DEFAULT 5 CHECK (faith_importance BETWEEN 1 AND 5),
  church_involvement TEXT NOT NULL DEFAULT 'regular' CHECK (church_involvement IN ('none', 'occasional', 'regular', 'very_active', 'leader')),
  prayer_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (prayer_frequency IN ('rarely', 'sometimes', 'weekly', 'daily', 'multiple_daily')),
  bible_meditation TEXT NOT NULL DEFAULT 'weekly' CHECK (bible_meditation IN ('rarely', 'sometimes', 'weekly', 'daily', 'multiple_daily')),
  water_baptism BOOLEAN NOT NULL DEFAULT false,
  holy_spirit_baptism BOOLEAN NOT NULL DEFAULT false,
  relationship_with_god INTEGER NOT NULL DEFAULT 4 CHECK (relationship_with_god BETWEEN 1 AND 5),
  ministry_involvement TEXT[] NOT NULL DEFAULT '{}',
  evangelism_active BOOLEAN NOT NULL DEFAULT false,
  spiritual_gifts TEXT[] NOT NULL DEFAULT '{}',
  church_service TEXT[] NOT NULL DEFAULT '{}',
  purity_before_marriage BOOLEAN NOT NULL DEFAULT true,
  biblical_marriage_view BOOLEAN NOT NULL DEFAULT true,
  god_centered_relationship BOOLEAN NOT NULL DEFAULT true,
  
  -- Marriage & family profile
  marriage_desire INTEGER NOT NULL DEFAULT 4 CHECK (marriage_desire BETWEEN 1 AND 5),
  marriage_timeline TEXT NOT NULL DEFAULT 'within_2_years' CHECK (marriage_timeline IN ('within_6_months', 'within_1_year', 'within_2_years', 'within_5_years', 'no_timeline')),
  emotional_readiness INTEGER NOT NULL DEFAULT 3 CHECK (emotional_readiness BETWEEN 1 AND 5),
  spiritual_readiness INTEGER NOT NULL DEFAULT 4 CHECK (spiritual_readiness BETWEEN 1 AND 5),
  financial_readiness INTEGER NOT NULL DEFAULT 3 CHECK (financial_readiness BETWEEN 1 AND 5),
  wants_children TEXT NOT NULL DEFAULT 'true' CHECK (wants_children IN ('true', 'false', 'required')),
  desired_children_count INTEGER,
  parenting_vision TEXT NOT NULL DEFAULT '',
  family_values TEXT[] NOT NULL DEFAULT '{}',
  work_life_balance TEXT NOT NULL DEFAULT 'balanced' CHECK (work_life_balance IN ('career_focused', 'balanced', 'family_first')),
  future_residence TEXT NOT NULL DEFAULT '',
  ministry_vision TEXT NOT NULL DEFAULT '',
  long_term_goals TEXT NOT NULL DEFAULT '',
  
  -- Values profile
  faithfulness INTEGER NOT NULL DEFAULT 5 CHECK (faithfulness BETWEEN 1 AND 5),
  honesty INTEGER NOT NULL DEFAULT 5 CHECK (honesty BETWEEN 1 AND 5),
  respect INTEGER NOT NULL DEFAULT 5 CHECK (respect BETWEEN 1 AND 5),
  humility INTEGER NOT NULL DEFAULT 4 CHECK (humility BETWEEN 1 AND 5),
  responsibility INTEGER NOT NULL DEFAULT 4 CHECK (responsibility BETWEEN 1 AND 5),
  forgiveness INTEGER NOT NULL DEFAULT 4 CHECK (forgiveness BETWEEN 1 AND 5),
  communication INTEGER NOT NULL DEFAULT 4 CHECK (communication BETWEEN 1 AND 5),
  conflict_resolution TEXT NOT NULL DEFAULT 'collaborative' CHECK (conflict_resolution IN ('avoidance', 'compromise', 'collaborative', 'assertive', 'prayer_first')),
  financial_stewardship TEXT NOT NULL DEFAULT 'tithe_first' CHECK (financial_stewardship IN ('tithe_first', 'budget_focused', 'generous_giving', 'saving_priority')),
  family_commitment INTEGER NOT NULL DEFAULT 5 CHECK (family_commitment BETWEEN 1 AND 5),
  spiritual_discipline INTEGER NOT NULL DEFAULT 4 CHECK (spiritual_discipline BETWEEN 1 AND 5),
  personal_boundaries INTEGER NOT NULL DEFAULT 4 CHECK (personal_boundaries BETWEEN 1 AND 5),
  behavioral_dealbreakers TEXT[] NOT NULL DEFAULT '{}',
  spiritual_non_negotiables TEXT[] NOT NULL DEFAULT '{}',
  relationship_non_negotiables TEXT[] NOT NULL DEFAULT '{}',
  family_non_negotiables TEXT[] NOT NULL DEFAULT '{}',
  lifestyle_non_negotiables TEXT[] NOT NULL DEFAULT '{}',
  
  -- Personality profile
  communication_style TEXT NOT NULL DEFAULT 'gentle' CHECK (communication_style IN ('direct', 'gentle', 'analytical', 'expressive', 'reserved')),
  emotional_expression TEXT NOT NULL DEFAULT 'moderate' CHECK (emotional_expression IN ('very_open', 'open', 'moderate', 'reserved', 'very_reserved')),
  conflict_style TEXT NOT NULL DEFAULT 'collaborative' CHECK (conflict_style IN ('confrontational', 'avoidant', 'compromising', 'collaborative', 'accommodating')),
  introversion_extraversion INTEGER NOT NULL DEFAULT 3 CHECK (introversion_extraversion BETWEEN 1 AND 5),
  organization_level TEXT NOT NULL DEFAULT 'organized' CHECK (organization_level IN ('very_organized', 'organized', 'flexible', 'spontaneous', 'very_spontaneous')),
  social_needs INTEGER NOT NULL DEFAULT 3 CHECK (social_needs BETWEEN 1 AND 5),
  leadership_tendencies INTEGER NOT NULL DEFAULT 3 CHECK (leadership_tendencies BETWEEN 1 AND 5),
  affection_style TEXT NOT NULL DEFAULT 'quality_time' CHECK (affection_style IN ('words', 'touch', 'acts_of_service', 'quality_time', 'gifts')),
  relational_rhythm TEXT NOT NULL DEFAULT 'steady' CHECK (relational_rhythm IN ('fast_paced', 'steady', 'slow_and_intentional')),
  
  -- Lifestyle profile
  daily_rhythm TEXT NOT NULL DEFAULT 'flexible' CHECK (daily_rhythm IN ('early_bird', 'night_owl', 'flexible')),
  career_ambition INTEGER NOT NULL DEFAULT 3 CHECK (career_ambition BETWEEN 1 AND 5),
  weekend_habits TEXT[] NOT NULL DEFAULT '{}',
  church_activities_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (church_activities_frequency IN ('weekly', 'biweekly', 'monthly', 'occasional')),
  family_visits_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (family_visits_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'occasional')),
  social_life_level INTEGER NOT NULL DEFAULT 3 CHECK (social_life_level BETWEEN 1 AND 5),
  technology_use INTEGER NOT NULL DEFAULT 3 CHECK (technology_use BETWEEN 1 AND 5),
  social_media_usage TEXT NOT NULL DEFAULT 'moderate' CHECK (social_media_usage IN ('none', 'minimal', 'moderate', 'heavy')),
  daily_organization TEXT NOT NULL DEFAULT 'structured' CHECK (daily_organization IN ('very_structured', 'structured', 'flexible', 'unstructured')),
  cultural_traditions_importance INTEGER NOT NULL DEFAULT 4 CHECK (cultural_traditions_importance BETWEEN 1 AND 5),
  
  -- Preferences
  preferred_age_min INTEGER NOT NULL DEFAULT 21 CHECK (preferred_age_min >= 21),
  preferred_age_max INTEGER NOT NULL DEFAULT 45 CHECK (preferred_age_max <= 100),
  max_distance_km INTEGER NOT NULL DEFAULT 100,
  preferred_languages TEXT[] NOT NULL DEFAULT '{"français"}',
  preferred_regions TEXT[] NOT NULL DEFAULT '{}',
  preferred_education TEXT[] NOT NULL DEFAULT '{}',
  preferred_professions TEXT[] NOT NULL DEFAULT '{}',
  hobbies TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  
  -- Open-ended responses
  vision_of_marriage TEXT NOT NULL DEFAULT '',
  relationship_with_god_description TEXT NOT NULL DEFAULT '',
  conflict_resolution_example TEXT NOT NULL DEFAULT '',
  parenting_philosophy TEXT NOT NULL DEFAULT '',
  financial_stewardship_view TEXT NOT NULL DEFAULT '',
  definition_of_true_love TEXT NOT NULL DEFAULT '',
  spiritual_legacy TEXT NOT NULL DEFAULT '',
  ideal_relationship_description TEXT NOT NULL DEFAULT '',
  
  -- Semantic analysis results (cached)
  semantic_profile JSONB,
  
  -- Metadata
  completion_pct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ── MATCH CACHE TABLE ────────────────────────────────────────────────────────
-- Caches computed match results to avoid recomputing on every request

CREATE TABLE IF NOT EXISTS match_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scores
  score_a_to_b INTEGER NOT NULL,
  score_b_to_a INTEGER NOT NULL,
  mutual_score INTEGER NOT NULL,
  
  -- Category scores
  spiritual_score INTEGER NOT NULL,
  marriage_family_score INTEGER NOT NULL,
  values_score INTEGER NOT NULL,
  personality_score INTEGER NOT NULL,
  lifestyle_score INTEGER NOT NULL,
  preferences_score INTEGER NOT NULL,
  
  -- Match metadata
  match_status TEXT NOT NULL,
  match_level TEXT NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  differences TEXT[] NOT NULL DEFAULT '{}',
  
  -- Hard filter status
  hard_filter_passed BOOLEAN NOT NULL DEFAULT true,
  hard_filter_failures JSONB NOT NULL DEFAULT '[]',
  
  -- Full compatibility results (JSON for detailed explanations)
  full_result JSONB,
  
  -- Cache invalidation
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  
  UNIQUE(user_a_id, user_b_id)
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────

-- Pre-filter indexes for efficient candidate retrieval
CREATE INDEX IF NOT EXISTS idx_questionnaire_user ON questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_christian ON questionnaire_responses(is_christian);
CREATE INDEX IF NOT EXISTS idx_questionnaire_denomination ON questionnaire_responses(denomination);
CREATE INDEX IF NOT EXISTS idx_questionnaire_marriage_desire ON questionnaire_responses(marriage_desire);
CREATE INDEX IF NOT EXISTS idx_questionnaire_wants_children ON questionnaire_responses(wants_children);
CREATE INDEX IF NOT EXISTS idx_questionnaire_church_involvement ON questionnaire_responses(church_involvement);
CREATE INDEX IF NOT EXISTS idx_questionnaire_completion ON questionnaire_responses(completion_pct);

-- Match cache indexes
CREATE INDEX IF NOT EXISTS idx_match_cache_user_a ON match_cache(user_a_id) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_match_cache_user_b ON match_cache(user_b_id) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_match_cache_mutual ON match_cache(user_a_id, mutual_score DESC) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_match_cache_status ON match_cache(match_status) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_match_cache_computed ON match_cache(computed_at);

-- ── CACHE INVALIDATION TRIGGER ───────────────────────────────────────────────

-- Invalidate cache when a user updates their questionnaire
CREATE OR REPLACE FUNCTION invalidate_match_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE match_cache 
  SET is_valid = false, invalidated_at = NOW()
  WHERE (user_a_id = NEW.user_id OR user_b_id = NEW.user_id)
    AND is_valid = true;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invalidate_cache ON questionnaire_responses;
CREATE TRIGGER trigger_invalidate_cache
  AFTER UPDATE ON questionnaire_responses
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_match_cache();

-- ── MATCHING STATS VIEW ─────────────────────────────────────────────────────

CREATE OR REPLACE VIEW matching_stats AS
SELECT
  COUNT(DISTINCT user_a_id) as active_seekers,
  COUNT(*) as total_cached_matches,
  AVG(mutual_score)::INTEGER as avg_match_score,
  COUNT(*) FILTER (WHERE match_status = 'STRONG_MATCH') as strong_matches,
  COUNT(*) FILTER (WHERE match_status = 'RECOMMENDED_MATCH') as recommended_matches,
  COUNT(*) FILTER (WHERE match_status = 'POTENTIAL_MATCH') as potential_matches,
  COUNT(*) FILTER (WHERE match_status = 'NOT_COMPATIBLE') as incompatible,
  COUNT(*) FILTER (WHERE is_valid = true) as valid_cache_entries,
  COUNT(*) FILTER (WHERE is_valid = false) as invalidated_entries
FROM match_cache;

-- ── RLS POLICIES ─────────────────────────────────────────────────────────────

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_config ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own questionnaire
CREATE POLICY "Users can view own questionnaire" ON questionnaire_responses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own questionnaire" ON questionnaire_responses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own questionnaire" ON questionnaire_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own match results
CREATE POLICY "Users can view own matches" ON match_cache
  FOR SELECT USING (auth.uid() = user_a_id);

-- Admins access data via service role key (which bypasses RLS)
-- No explicit admin policies needed — service_role bypasses all RLS checks.
-- Direct client access to admin data is blocked by not having SELECT policies.

-- Public read access to matching config (weights/thresholds are not sensitive)
CREATE POLICY "Public can view matching config" ON matching_config
  FOR SELECT USING (true);
