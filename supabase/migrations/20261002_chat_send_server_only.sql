-- ============================================================
--  Envoi des messages de discussion : uniquement par le serveur
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent. À exécuter APRÈS le déploiement de /api/chat/send.
--
--  Avant, le navigateur appelait la modération puis insérait lui-même le
--  message : la modération pouvait être sautée. Désormais tout envoi passe
--  par /api/chat/send, qui modère puis insère avec la clé de service (qui
--  contourne la RLS). Sans politique d'insertion, le rôle « authenticated »
--  ne peut plus insérer directement dans messages.
--
--  Les règles de l'ancienne politique (compte approuvé, membre de la
--  conversation, conversation ouverte, amitié acceptée) sont appliquées
--  à l'identique dans src/app/api/chat/send/route.ts.
--
--  Retour arrière : réexécuter le bloc « messages_insert » de
--  20261001_chat_moderation.sql.
-- ============================================================

drop policy if exists messages_insert on public.messages;

notify pgrst, 'reload schema';
