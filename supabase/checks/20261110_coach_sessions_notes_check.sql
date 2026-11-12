-- ============================================================================
-- Vérification EN LECTURE SEULE de 20261110_coach_sessions_notes.sql
-- (séances, notes privées, comptes rendus partagés, plan d'action du lot 3 Coach)
-- et de son prérequis 20261108_coach_assignments.sql.
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query.
--
-- Ce script ne contient AUCUN DDL, ne modifie AUCUNE donnée, AUCUN rôle, AUCUNE
-- politique ni AUCUN trigger : il n'exécute que des `select` sur les catalogues
-- système, encadrés par une transaction explicitement lecture seule qui est
-- toujours annulée (jamais validée), par sécurité supplémentaire même si aucune
-- requête ci-dessous n'écrit quoi que ce soit.
-- ============================================================================

begin transaction read only;

-- 1. Présence des quatre tables du lot 3 et de leur prérequis (20261108).
--    ATTENDU : 5 lignes (coach_member_assignments, coach_sessions, coach_notes,
--    coach_shared_reports, coach_action_items).
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('coach_member_assignments', 'coach_sessions', 'coach_notes', 'coach_shared_reports', 'coach_action_items')
 order by table_name;

-- 2. Fonction SQL de contrôle d'accès dont dépendent les routes applicatives.
--    ATTENDU : 1 ligne (coach_can_access_member).
select routine_name, routine_type, security_type
  from information_schema.routines
 where routine_schema = 'public' and routine_name = 'coach_can_access_member';

-- 3. RLS activée sur les quatre tables, et FORCÉE (s'applique même au propriétaire
--    de la table) — ATTENDU : rowsecurity = true pour chacune ; forcerowsecurity
--    peut être false (service_role contourne la RLS de toute façon : ce n'est pas
--    elle la protection, voir point 4).
select relname as table_name, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('coach_sessions', 'coach_notes', 'coach_shared_reports', 'coach_action_items')
 order by relname;

-- 4. Politiques RLS existantes sur ces quatre tables, avec leurs clauses USING et
--    WITH CHECK. ATTENDU : une seule politique par table, nommée '<table>_service_only',
--    commande 'ALL', rôle 'authenticated', qual = 'false' et with_check = 'false'
--    (aucun accès pour un utilisateur authentifié ordinaire ; seul service_role,
--    qui contourne la RLS, peut lire ou écrire — c'est pourquoi les triggers du
--    point 6 sont la vraie protection, pas cette RLS).
select tablename, policyname, roles, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename in ('coach_sessions', 'coach_notes', 'coach_shared_reports', 'coach_action_items')
 order by tablename, policyname;

-- 5. Privilèges EFFECTIFS des tables pour anon / authenticated (hérite de PUBLIC et
--    de toute appartenance à un rôle) — ATTENDU : false pour select/insert/update/delete,
--    pour les deux rôles, sur les quatre tables.
select r.rolname as role, t.relname as table_name,
       has_table_privilege(r.rolname, t.oid, 'select') as can_select,
       has_table_privilege(r.rolname, t.oid, 'insert') as can_insert,
       has_table_privilege(r.rolname, t.oid, 'update') as can_update,
       has_table_privilege(r.rolname, t.oid, 'delete') as can_delete
  from pg_roles r
  join pg_class t on t.relnamespace = 'public'::regnamespace
 where r.rolname in ('anon', 'authenticated')
   and t.relname in ('coach_sessions', 'coach_notes', 'coach_shared_reports', 'coach_action_items')
 order by t.relname, r.rolname;

-- 5bis. Rôles dont 'anon' et 'authenticated' sont membres (l'héritage de ces
--       appartenances est inclus dans has_table_privilege ci-dessus : cette requête
--       permet de voir D'OÙ viendrait un droit inattendu). ATTENDU : aucune ligne
--       vers un rôle qui aurait reçu des droits sur les quatre tables.
select m.rolname as member_role, g.rolname as granted_role
  from pg_auth_members am
  join pg_roles m on m.oid = am.member
  join pg_roles g on g.oid = am.roleid
 where m.rolname in ('anon', 'authenticated');

-- 6. Triggers de garde présents et ACTIVÉS (tgenabled = 'O') sur les quatre tables
--    — ce sont eux, pas la RLS, qui protègent même service_role contre une écriture
--    directe en dehors des fonctions prévues. ATTENDU : coach_sessions_guard_trg,
--    coach_notes_guard_trg, coach_reports_guard_trg, coach_actions_guard_trg,
--    coach_actions_status_guard_trg — tous avec enabled = 'O'.
select c.relname as table_name, t.tgname as trigger_name, t.tgenabled as enabled
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where c.relnamespace = 'public'::regnamespace
   and c.relname in ('coach_sessions', 'coach_notes', 'coach_shared_reports', 'coach_action_items')
   and not t.tgisinternal
 order by c.relname, t.tgname;

-- 7. Droits d'EXÉCUTION des cinq fonctions transactionnelles — ATTENDU : can_execute
--    = true UNIQUEMENT pour service_role, false pour anon et authenticated, sur les
--    cinq lignes.
select p.proname as function_name, r.rolname as role,
       has_function_privilege(r.rolname, p.oid, 'execute') as can_execute
  from pg_proc p
  join pg_roles r on r.rolname in ('anon', 'authenticated', 'service_role')
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('coach_schedule_session', 'coach_reschedule_session', 'coach_postpone_session',
                      'coach_transition_session', 'coach_update_action_status')
 order by p.proname, r.rolname;

-- 8. Aucune séance « scheduled » qui se chevauche pour un même coach ou un même
--    membre — ATTENDU : 0 ligne. (Lecture seule : ne fait que COMPTER, ne corrige rien.)
select s1.id as session_a, s2.id as session_b, s1.coach_id, s1.member_id
  from coach_sessions s1
  join coach_sessions s2
    on s2.id > s1.id
   and s1.status = 'scheduled' and s2.status = 'scheduled'
   and (s1.coach_id = s2.coach_id or s1.member_id = s2.member_id)
   and tstzrange(s1.scheduled_at, s1.scheduled_at + make_interval(mins => s1.duration_minutes))
    && tstzrange(s2.scheduled_at, s2.scheduled_at + make_interval(mins => s2.duration_minutes));

rollback;
