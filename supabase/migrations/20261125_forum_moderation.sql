-- Forum — envoi et modification uniquement par le serveur (modération des coordonnées).
-- Le navigateur insérait directement dans forum_messages : aucun contrôle, un numéro de téléphone
-- pouvait être publié devant tout le groupe. Désormais /api/forum/messages (POST) et
-- /api/forum/messages/:id (PATCH) modèrent le texte puis écrivent avec la clé de service, en
-- reprenant les règles des politiques forum_messages_insert / forum_messages_update.
-- Lecture et suppression de ses propres messages : inchangées.
--
-- À exécuter APRÈS le déploiement du code qui utilise ces routes (sinon le forum refuse tout envoi),
-- dans le SQL Editor de Supabase, par un humain. Idempotent.
-- Rollback : grant insert (body, sticker, reply_to_id), update (body) on public.forum_messages to authenticated;

begin;

revoke insert, update on public.forum_messages from authenticated;

commit;

-- Contrôle : doit renvoyer 0 ligne.
select privilege_type from information_schema.role_column_grants
 where table_schema = 'public' and table_name = 'forum_messages' and grantee = 'authenticated'
   and privilege_type in ('INSERT', 'UPDATE');
