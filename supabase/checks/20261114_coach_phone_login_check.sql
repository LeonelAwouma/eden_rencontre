-- ============================================================================
-- Vérification EN LECTURE SEULE avant 20261114_coach_phone_login.sql
-- (connexion des coachs par téléphone, adresse e-mail de contact partageable).
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query.
-- Aucun DDL, aucune modification : uniquement des `select`, dans une transaction en lecture seule
-- toujours annulée. Les adresses e-mail et numéros sont MASQUÉS dans les résultats.
-- ============================================================================

begin transaction read only;

-- 1. Les coachs : un user_id distinct et un compte Auth distinct chacun ?
--    ATTENDU : autant de lignes que de coachs, auth_user_exists = true, user_id tous différents.
--    Deux coachs « partageant le même compte » apparaîtraient comme UNE seule ligne ici.
select c.user_id,
       c.display_name,
       c.active,
       (u.id is not null)                                         as auth_user_exists,
       case when u.email like '%@phone.eden.invalid' then 'technique (téléphone)' else 'réelle' end as auth_email_kind,
       left(coalesce(u.email, ''), 2) || '***'                   as auth_email_masked,
       left(coalesce(c.email, ''), 2) || '***'                   as contact_email_masked,
       p.account_type, p.status,
       case when p.phone is null then 'ABSENT' else left(p.phone, 4) || '*****' end as phone_masked
  from public.coach_accounts c
  left join auth.users u on u.id = c.user_id
  left join public.profiles p on p.id = c.user_id
 order by c.created_at;

-- 2. Adresses de contact partagées entre coachs (informatif : explique la demande).
select lower(email) as contact_email_masked_key, count(*) as nb_coachs
  from public.coach_accounts
 where email is not null
 group by lower(email) having count(*) > 1;

-- 3. Coachs sans numéro dans profiles.phone (devront être renseignés avant la connexion par téléphone).
select c.user_id, c.display_name
  from public.coach_accounts c
  left join public.profiles p on p.id = c.user_id
 where p.phone is null;

-- 4. Numéros en double dans profiles.phone. ATTENDU : 0 ligne (sinon la migration refuse de s'exécuter).
select left(phone, 4) || '*****' as phone_masked, count(*) as nb
  from public.profiles where phone is not null group by phone having count(*) > 1;

-- 5. Contraintes et index d'unicité en place. À lire :
--    - coach_accounts_email_key attendue AVANT la migration (disparaît après) ;
--    - profiles_phone_unique_idx attendu (créé par 20261111_phone_signup.sql) ;
--    - toute unicité sur profiles.email apparaîtrait ici (sera retirée par la migration).
select 'constraint' as kind, conrelid::regclass::text as table_name, conname as name, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid in ('public.coach_accounts'::regclass, 'public.profiles'::regclass) and contype = 'u'
union all
select 'index', tablename, indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename in ('coach_accounts', 'profiles') and indexdef ilike '%unique%'
 order by 1, 2, 3;

-- 6. Migrations attendues appliquées (objets présents). ATTENDU : toutes les lignes à true.
select 'coach_accounts'                          as objet, to_regclass('public.coach_accounts') is not null as present
union all select 'profiles.account_type',    exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='account_type')
union all select 'profiles.phone',           exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone')
union all select 'profiles_phone_unique_idx', to_regclass('public.profiles_phone_unique_idx') is not null
union all select 'coach_accounts.last_login_at', exists (select 1 from information_schema.columns where table_schema='public' and table_name='coach_accounts' and column_name='last_login_at')
union all select 'password_reset_requests',  to_regclass('public.password_reset_requests') is not null;

rollback;
