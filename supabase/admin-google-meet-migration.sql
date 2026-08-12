-- Migration: Allow admin users (not just auth.users) to have Google Meet credentials
-- This changes user_id from UUID (FK to auth.users) to TEXT so that admin IDs
-- like "env-admin" or admin_users UUIDs can also store credentials.
--
-- Run this ONCE against your Supabase database.

-- 1. Drop RLS policies FIRST (they reference user_id, so column can't be altered otherwise)
DROP POLICY IF EXISTS "Users can view own Google Meet credentials" ON google_meet_credentials;
DROP POLICY IF EXISTS "Users can insert own Google Meet credentials" ON google_meet_credentials;
DROP POLICY IF EXISTS "Users can update own Google Meet credentials" ON google_meet_credentials;
DROP POLICY IF EXISTS "Users can delete own Google Meet credentials" ON google_meet_credentials;

-- 2. Drop the existing foreign key constraint
ALTER TABLE google_meet_credentials
  DROP CONSTRAINT IF EXISTS google_meet_credentials_user_id_fkey;

-- 3. Change user_id column type from UUID to TEXT
ALTER TABLE google_meet_credentials
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 4. Recreate RLS policies that work with TEXT user_id
-- Note: Since API routes use the service role client (getSupabaseAdmin),
-- RLS is bypassed. These policies are for direct client access only.
CREATE POLICY "Users can view own Google Meet credentials"
  ON google_meet_credentials FOR SELECT
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert own Google Meet credentials"
  ON google_meet_credentials FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own Google Meet credentials"
  ON google_meet_credentials FOR UPDATE
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own Google Meet credentials"
  ON google_meet_credentials FOR DELETE
  USING (user_id = auth.uid()::TEXT);