-- ============================================================
--  GARDEN OF ALLIANCE — Chat Messages for Real-time Monitoring
--  Run after matching-testimonials-chat-schema.sql
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- CHAT MESSAGES — Individual messages within conversations
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'system', 'warning')),
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS chat_messages_conv_idx ON public.chat_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_sender_idx ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_flagged_idx ON public.chat_messages (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON public.chat_messages (created_at DESC);

DROP POLICY IF EXISTS chat_messages_service_only ON public.chat_messages;
CREATE POLICY chat_messages_service_only ON public.chat_messages
  FOR ALL USING (false);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;