-- ============================================================
--  Verification Status Migration
--  Adds verification_status to profiles and updates
--  meeting_notifications for verification events.
-- ============================================================

-- 1. Add verification_status column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none'
  CHECK (verification_status IN ('none', 'under_review', 'verified', 'rejected'));

COMMENT ON COLUMN public.profiles.verification_status IS 'Current verification status of the user profile: none, under_review, verified, rejected';

-- 2. Add verification rejection reason
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

COMMENT ON COLUMN public.profiles.verification_rejection_reason IS 'Reason for verification rejection (if applicable)';

-- 3. Update meeting_notifications constraint to include verification types
ALTER TABLE public.meeting_notifications
  DROP CONSTRAINT IF EXISTS meeting_notifications_notification_type_check;

ALTER TABLE public.meeting_notifications
  ADD CONSTRAINT meeting_notifications_notification_type_check
  CHECK (notification_type IN (
    'created', 'updated', 'rescheduled', 'cancelled', 'reminder',
    'meet_invitation', 'event_notification', 'blog_post',
    'verification_pending', 'verification_approved', 'verification_rejected'
  ));

-- 4. Backfill: set existing onboarding_completed users to 'under_review'
UPDATE public.profiles
SET verification_status = 'under_review'
WHERE onboarding_completed = true
  AND verification_status = 'none';
