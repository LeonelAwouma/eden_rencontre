-- Administration — cartes de répartition des membres (Cameroun et International).
-- Exécuter APRÈS 20261118_geo_admin.sql, dans le SQL Editor de Supabase, par un humain. Additive et idempotente.
-- Rollback :
--   drop function if exists public.geo_admin_member_summary(text[], text);
--   drop function if exists public.geo_admin_country_counts(text[], text);
--   drop function if exists public.geo_admin_member_counts(int, uuid, text[], text);
--   drop function if exists public.geo_admin_member_pool(text[], text);
--
-- Principes :
--   * statistiques ADMINISTRATIVES : tous les comptes membres retenus, sans règle de consentement ni de genre
--     (geo_zone_counts, propre à la découverte entre membres, n'est ni utilisée ni modifiée) ;
--   * effectifs EXACTS (aucun seuil) : la confidentialité tient à l'agrégation — aucune fonction ne renvoie
--     d'identifiant, d'e-mail, de nom, de ville saisie ni de coordonnée ;
--   * population commune (geo_admin_member_pool) : profiles.account_type = 'member', statut demandé (jamais
--     'rejected'), hors compte système et hors e-mails d'administrateurs (admin_users, si la table existe) ;
--   * member_locations.user_id est la clé primaire : une ligne par membre, aucun double comptage ;
--   * service_role SEULEMENT, search_path vide.

begin;

-- ── Population commune ────────────────────────────────────────────────────────────────────────────────
create or replace function public.geo_admin_member_pool(p_statuses text[], p_exclude_email text)
returns table (
  country_code      text,
  region_id         uuid,
  department_id     uuid,
  arrondissement_id uuid,
  has_location      boolean,
  has_city          boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  staff text[] := '{}';
begin
  -- admin_users n'est pas créée par les migrations (supabase/admin-schema.sql) : on la lit seulement si elle existe.
  if to_regclass('public.admin_users') is not null then
    execute 'select coalesce(array_agg(lower(a.email)), ''{}''::text[]) from public.admin_users a where a.email is not null'
      into staff;
  end if;

  return query
    select ml.country_code,
           ml.region_id,
           ml.department_id,
           ml.arrondissement_id,
           (ml.user_id is not null),
           (ml.place_id is not null or nullif(btrim(coalesce(ml.free_text_city, '')), '') is not null)
    from public.profiles p
    left join public.member_locations ml on ml.user_id = p.id
    where p.account_type = 'member'
      and p.status = any(p_statuses)
      and p.status <> 'rejected'
      and (p_exclude_email is null or lower(coalesce(p.email, '')) <> lower(p_exclude_email))
      and not (lower(coalesce(p.email, '')) = any(staff));
end;
$$;

-- ── Cameroun : effectifs par unité du niveau demandé ──────────────────────────────────────────────────
-- kind = 'unit'         : une ligne par unité du niveau sous le parent (zéro compris) ;
-- kind = 'unattached'   : membres du périmètre sans rattachement à ce niveau (jamais affectés arbitrairement) ;
-- kind = 'inconsistent' : membres rattachés à une unité qui n'appartient pas au parent consulté.
-- Somme des trois = membres du périmètre (région → ses départements, département → ses arrondissements).
create or replace function public.geo_admin_member_counts(p_level int, p_parent uuid, p_statuses text[], p_exclude_email text)
returns table (unit_id uuid, member_count int, kind text)
language sql
stable
security definer
set search_path = ''
as $$
  with pool as (
    select m.region_id, m.department_id, m.arrondissement_id
    from public.geo_admin_member_pool(p_statuses, p_exclude_email) m
    where m.has_location and m.country_code = 'CM'
  ),
  perimeter as (
    select m.*,
           case p_level when 1 then m.region_id when 2 then m.department_id when 3 then m.arrondissement_id end as zid
    from pool m
    where case p_level
            when 1 then p_parent is null
            when 2 then m.region_id = p_parent
            when 3 then m.department_id = p_parent
            else false
          end
  ),
  units as (
    select u.id
    from public.geo_admin_units u
    where u.country_code = 'CM'
      and u.level = p_level
      and p_level between 1 and 3
      and case when p_level = 1 then p_parent is null else u.parent_id = p_parent end
  ),
  agg as (
    select zid, count(*)::int as n from perimeter group by zid
  )
  select u.id, coalesce(a.n, 0), 'unit'::text
  from units u left join agg a on a.zid = u.id
  union all
  select null::uuid, coalesce((select a.n from agg a where a.zid is null), 0), 'unattached'::text
  union all
  select null::uuid, coalesce(sum(a.n), 0)::int, 'inconsistent'::text
  from agg a
  where a.zid is not null and not exists (select 1 from units u where u.id = a.zid);
$$;

-- ── International : effectifs par code pays (hors Cameroun) ───────────────────────────────────────────
-- La validité ISO 3166-1 des codes est jugée par le serveur (liste de référence) : un code inconnu y devient
-- « pays indéterminé », jamais un pays arbitraire.
create or replace function public.geo_admin_country_counts(p_statuses text[], p_exclude_email text)
returns table (country_code text, member_count int, with_city int)
language sql
stable
security definer
set search_path = ''
as $$
  select m.country_code, count(*)::int, (count(*) filter (where m.has_city))::int
  from public.geo_admin_member_pool(p_statuses, p_exclude_email) m
  where m.has_location and m.country_code is not null and m.country_code <> 'CM'
  group by m.country_code
  order by m.country_code;
$$;

-- ── Indicateurs généraux ──────────────────────────────────────────────────────────────────────────────
create or replace function public.geo_admin_member_summary(p_statuses text[], p_exclude_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total',                 count(*)::int,
    'noLocation',            (count(*) filter (where not m.has_location))::int,
    'cameroon',              (count(*) filter (where m.has_location and m.country_code = 'CM'))::int,
    'cameroonWithRegion',    (count(*) filter (where m.has_location and m.country_code = 'CM' and m.region_id is not null))::int,
    'cameroonWithoutRegion', (count(*) filter (where m.has_location and m.country_code = 'CM' and m.region_id is null))::int,
    'outsideCameroon',       (count(*) filter (where m.has_location and m.country_code is distinct from 'CM'))::int
  )
  from public.geo_admin_member_pool(p_statuses, p_exclude_email) m;
$$;

-- ── Droits : service_role uniquement ──────────────────────────────────────────────────────────────────
revoke all on function public.geo_admin_member_pool(text[], text) from public, anon, authenticated;
revoke all on function public.geo_admin_member_counts(int, uuid, text[], text) from public, anon, authenticated;
revoke all on function public.geo_admin_country_counts(text[], text) from public, anon, authenticated;
revoke all on function public.geo_admin_member_summary(text[], text) from public, anon, authenticated;
grant execute on function public.geo_admin_member_pool(text[], text) to service_role;
grant execute on function public.geo_admin_member_counts(int, uuid, text[], text) to service_role;
grant execute on function public.geo_admin_country_counts(text[], text) to service_role;
grant execute on function public.geo_admin_member_summary(text[], text) to service_role;

commit;

-- Contrôles (à lancer après la migration) :
--   select * from public.geo_admin_member_summary(array['approved'], 'admin-system@eden.local');
--   select * from public.geo_admin_member_counts(1, null, array['approved'], 'admin-system@eden.local');
--   select * from public.geo_admin_country_counts(array['approved'], 'admin-system@eden.local');
--   -- droits : doit renvoyer false pour anon et authenticated
--   select has_function_privilege('authenticated', 'public.geo_admin_member_summary(text[], text)', 'execute');
