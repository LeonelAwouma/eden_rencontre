-- ============================================================================
-- Coachs : identifiant = numéro de téléphone ; e-mail = simple coordonnée de contact partageable.
--
-- À exécuter MANUELLEMENT : Supabase Dashboard → SQL Editor → New query.
-- Prérequis : 20261024_coach_accounts.sql et 20261111_phone_signup.sql (index profiles_phone_unique_idx).
-- AVANT : exécuter supabase/checks/20261114_coach_phone_login_check.sql (lecture seule) et lire ses résultats.
--
-- Idempotent / additif : aucune ligne n'est supprimée ni modifiée, aucune table n'est supprimée.
--   1. Refuse de continuer s'il existe des numéros de téléphone en double (sinon l'identifiant ne serait pas unique).
--   2. coach_accounts.email devient facultative (un coach peut n'avoir aucune adresse de contact).
--   3. Supprime l'unicité de coach_accounts.email (plusieurs coachs peuvent partager une adresse de contact).
--   4. Supprime, SI ELLE EXISTE, toute unicité sur profiles.email (même raison). Sans effet si absente.
--   5. Index NON unique sur lower(email) pour la recherche administrative.
-- Inchangé : l'unicité des identifiants Supabase Auth (auth.users.email) et celle de profiles.phone
-- (profiles_phone_unique_idx). Les nouveaux coachs ont une adresse Auth technique dérivée de leur numéro.
--
-- Rollback (manuel, seulement s'il n'existe aucune adresse de contact en double ni de coach sans e-mail) :
--   alter table public.coach_accounts alter column email set not null;
--   alter table public.coach_accounts add constraint coach_accounts_email_key unique (email);
-- ============================================================================

-- 1. Pré-contrôle : numéros en double (profiles.phone doit être un identifiant unique).
do $$
declare dup_count integer;
begin
  select count(*) into dup_count from (
    select phone from public.profiles where phone is not null group by phone having count(*) > 1
  ) d;
  if dup_count > 0 then
    raise exception 'Migration interrompue : % numéro(s) de téléphone en double dans profiles.phone. Corrigez-les avant de relancer.', dup_count;
  end if;
end $$;

-- 2. Adresse de contact facultative.
alter table public.coach_accounts alter column email drop not null;

-- 3. Plusieurs coachs peuvent partager la même adresse de contact.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.coach_accounts'::regclass
       and con.contype = 'u'
       and (select array_agg(att.attname::text order by att.attname)
              from unnest(con.conkey) k join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k) = array['email']
  loop
    execute format('alter table public.coach_accounts drop constraint %I', c.conname);
  end loop;
end $$;

-- 4. Même chose pour une éventuelle contrainte ou un éventuel index UNIQUE sur profiles.email seul
--    (la table profiles n'est pas définie dans ce dépôt : on ne suppose rien, on ne touche qu'à ce qui existe).
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.profiles'::regclass
       and con.contype = 'u'
       and (select array_agg(att.attname::text order by att.attname)
              from unnest(con.conkey) k join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k) = array['email']
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  for c in
    select i.relname as idxname
      from pg_index x
      join pg_class i on i.oid = x.indexrelid
     where x.indrelid = 'public.profiles'::regclass
       and x.indisunique and not x.indisprimary
       and not exists (select 1 from pg_constraint k where k.conindid = x.indexrelid)
       and x.indnatts = 1
       and (select att.attname from pg_attribute att where att.attrelid = x.indrelid and att.attnum = x.indkey[0]) = 'email'
  loop
    execute format('drop index public.%I', c.idxname);
  end loop;
end $$;

-- 5. Recherche administrative par adresse de contact (non unique).
create index if not exists coach_accounts_email_lower_idx on public.coach_accounts (lower(email));

notify pgrst, 'reload schema';

-- Vérification (lecture seule) :
--   select is_nullable from information_schema.columns
--    where table_schema='public' and table_name='coach_accounts' and column_name='email';        -- YES
--   select conname from pg_constraint where conrelid='public.coach_accounts'::regclass and contype='u';  -- plus d'unicité sur email
