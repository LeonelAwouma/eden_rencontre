-- Messagerie privée : stickers. Même format d'identifiant que forum_messages.sticker.
-- Additif : anciens messages = null. L'envoi reste 100 % via /api/chat/send (pas de RLS d'insertion).
alter table public.messages
  add column if not exists sticker text
  check (sticker is null or sticker ~ '^[a-z0-9-]{1,40}$');
