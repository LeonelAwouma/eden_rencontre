-- Google Meet credentials table
-- Stores per-user Google OAuth tokens for Google Meet API access.
-- These tokens are obtained through a direct Google OAuth flow (separate from Supabase auth).

CREATE TABLE IF NOT EXISTS google_meet_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Google OAuth tokens (encrypted at rest if possible)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  
  -- Google user info
  google_email TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One set of credentials per user
  CONSTRAINT unique_user_google_meet UNIQUE(user_id)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_google_meet_credentials_user_id 
  ON google_meet_credentials(user_id);

-- RLS: Users can only access their own credentials (though API routes use service role)
ALTER TABLE google_meet_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Google Meet credentials"
  ON google_meet_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Google Meet credentials"
  ON google_meet_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Google Meet credentials"
  ON google_meet_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Google Meet credentials"
  ON google_meet_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_google_meet_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_google_meet_credentials_updated_at
  BEFORE UPDATE ON google_meet_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_google_meet_credentials_updated_at();