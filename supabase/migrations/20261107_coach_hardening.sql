-- Durcissement des comptes Coach (moindre privilège). Idempotent, non destructif.
-- À exécuter APRÈS 20261024_coach_accounts.sql et 20261024_coach_dual_access.sql,
-- dans le SQL Editor de Supabase, par un humain. Aucune donnée n'est supprimée.

-- 1. Dernière connexion d'un coach (renseignée par /api/auth/login après une connexion Coach réussie).
alter table public.coach_accounts add column if not exists last_login_at timestamptz;

-- 2. Un coach ne lit plus les profils matrimoniaux des membres : il ne voit que son propre profil.
--    (is_approved() exige déjà account_type = 'member' : les coachs sont donc aussi exclus de toutes
--    les politiques d'interactions — alliances, messages, forum, favoris, stockage.)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  auth.uid() = id
  or (
    status = 'approved' and account_type = 'member'
    and public.is_approved(auth.uid())
  )
);

notify pgrst, 'reload schema';

-- ── Vérifications à lancer ensuite (lecture seule) ─────────────────────────────
-- a) La colonne existe :
--    select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'coach_accounts' and column_name = 'last_login_at';
-- b) Plus aucune politique ne mentionne is_active_coach :
--    select policyname, qual from pg_policies where schemaname = 'public' and qual ilike '%is_active_coach%';
--    → attendu : 0 ligne.
-- c) Cohérence coach_accounts / profiles (aucune ligne attendue) :
--    select c.user_id, c.active, p.status, p.account_type
--      from public.coach_accounts c left join public.profiles p on p.id = c.user_id
--     where p.id is null or p.account_type <> 'coach'
--        or (c.active and p.status <> 'approved') or (not c.active and p.status = 'approved');
