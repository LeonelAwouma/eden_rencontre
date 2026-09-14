-- ═══════════════════════════════════════════════════════════
-- Garden of Alliance — Charter Acceptance Schema
-- ═══════════════════════════════════════════════════════════

-- Table to store each user's charter acceptance record
CREATE TABLE IF NOT EXISTS charter_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Individual checkbox approvals
  authorize_verification BOOLEAN NOT NULL DEFAULT FALSE,
  commit_respectful_conversations BOOLEAN NOT NULL DEFAULT FALSE,
  accept_full_charter BOOLEAN NOT NULL DEFAULT FALSE,

  -- All three must be true for acceptance to be valid
  all_accepted BOOLEAN GENERATED ALWAYS AS (
    authorize_verification AND commit_respectful_conversations AND accept_full_charter
  ) STORED,

  -- Audit timestamps
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Metadata
  charter_version TEXT NOT NULL DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One acceptance record per user
  UNIQUE(user_id)
);

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_charter_acceptances_user_id ON charter_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_charter_acceptances_accepted_at ON charter_acceptances(accepted_at DESC);

-- RLS policies
ALTER TABLE charter_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can read their own acceptance
DROP POLICY IF EXISTS "Users can read own charter acceptance" ON charter_acceptances;
CREATE POLICY "Users can read own charter acceptance"
  ON charter_acceptances FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acceptance (during registration)
DROP POLICY IF EXISTS "Users can insert own charter acceptance" ON charter_acceptances;
CREATE POLICY "Users can insert own charter acceptance"
  ON charter_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own acceptance
DROP POLICY IF EXISTS "Users can update own charter acceptance" ON charter_acceptances;
CREATE POLICY "Users can update own charter acceptance"
  ON charter_acceptances FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can read all acceptances (via service role)
-- No explicit policy needed if using service_role key

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_charter_acceptances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS charter_acceptances_updated_at ON charter_acceptances;
CREATE TRIGGER charter_acceptances_updated_at
  BEFORE UPDATE ON charter_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION update_charter_acceptances_updated_at();

-- Add charter_accepted column to profiles for quick lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS charter_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS charter_accepted_at TIMESTAMPTZ;