-- ── Migration: Make meeting_id nullable and add new notification types ──
-- This allows meeting_notifications to also be used for Google Meet invitations
-- from the /admin/meets system (which doesn't have a record in the meetings table),
-- and for public event notifications from the /admin/events system.

-- 1. Make meeting_id nullable
ALTER TABLE public.meeting_notifications
  ALTER COLUMN meeting_id DROP NOT NULL;

-- 2. Update the notification_type CHECK constraint to include new types
ALTER TABLE public.meeting_notifications
  DROP CONSTRAINT IF EXISTS meeting_notifications_notification_type_check;

ALTER TABLE public.meeting_notifications
  ADD CONSTRAINT meeting_notifications_notification_type_check
  CHECK (notification_type IN ('created', 'updated', 'rescheduled', 'cancelled', 'reminder', 'meet_invitation', 'event_notification'));