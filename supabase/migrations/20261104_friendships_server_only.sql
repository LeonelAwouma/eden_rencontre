-- ============================================================
--  Demandes de mise en relation (matching) : uniquement par le serveur
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent. À exécuter APRÈS le déploiement de /api/matching/request.
--
--  Même raisonnement que 20261002_chat_send_server_only.sql pour les
--  messages : avant, le navigateur insérait/mettait à jour lui-même
--  `friendships` via src/lib/social.ts (sendFriendRequest), sans aucun
--  contrôle serveur possible — notamment aucune vérification de quota
--  gratuit / abonnement GOLD effectif. Désormais tout envoi passe par
--  /api/matching/request, qui reproduit à l'identique les règles de
--  l'ancienne politique (auth.uid() = requester_id, compte approuvé des
--  deux côtés) puis insère avec la clé de service.
--
--  Les lectures (select) restent ouvertes au membre concerné : seule
--  l'écriture directe depuis le navigateur est retirée.
--
--  Retour arrière : réexécuter le bloc « friendships_insert » de
--  supabase/migrations/20260924_member_approval_rls.sql.
-- ============================================================

drop policy if exists friendships_insert on public.friendships;

notify pgrst, 'reload schema';
