-- Géolocalisation — la ville suffit : résolution exacte d'un nom de ville + rapprochement automatique par ville.
-- Idempotent, additif. À exécuter APRÈS 20261118_geo_admin.sql, dans le SQL Editor de Supabase, par un humain.
-- Rollback : drop function public.geo_resolve_city(text, text), public.geo_normalize_name(text);
--            alter table public.member_locations alter column nearby_search_enabled set default false,
--                                                alter column location_discoverable set default false;
--
-- Rattachement administratif indicatif : l'arrondissement, le département et la région sont déduits à partir du
-- point de référence de la localité dans le référentiel GeoNames. Aucune coordonnée du membre n'est collectée ;
-- l'arrondissement obtenu est celui du point de référence de la ville, pas une vérification du lieu de résidence.
--
-- Rapprochement automatique (décision produit du 2026-11-23) : une ville renseignée sert à la fois à chercher et à
-- être trouvé par les membres de la même ville. Les deux colonnes de consentement restent en base (les fonctions de
-- découverte, de carte et d'administration les lisent) mais valent désormais toujours true. L'affichage de la ville
-- sur le profil reste un choix du membre (display_level, « none » par défaut).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Normalisation commune — même règle que normalizePlaceName (src/lib/geo/normalize.ts)
--    STABLE et non IMMUTABLE : extensions.unaccent dépend d'un dictionnaire. Jamais utilisée dans un index.
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.geo_normalize_name(p text)
returns text
language sql
stable
set search_path = ''
as $$
  select trim(regexp_replace(
           regexp_replace(
             regexp_replace(
               -- forme à deux arguments : le dictionnaire est nommé explicitement (search_path vide)
               lower(extensions.unaccent('extensions.unaccent'::regdictionary,
                                         replace(replace(coalesce(p, ''), chr(160), ' '), chr(8239), ' '))),
               '[’`´]', '''', 'g'),
             '[-_.,/]+', ' ', 'g'),
           '\s+', ' ', 'g'));
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Résolution EXACTE d'un nom de ville (distincte de l'autocomplétion geo_search_places)
--    Une ligne par localité (priorité au nom officiel sur l'alias), 50 lignes au plus ; total_count = nombre de
--    localités distinctes AVANT plafond, pour que le serveur traite un dépassement comme une ambiguïté.
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.geo_resolve_city(p_city text, p_country text default 'CM')
returns table (
  place_id uuid,
  match_kind text,          -- 'canonical' | 'alias'
  place_type text,
  arrondissement_id uuid,
  department_id uuid,
  region_id uuid,
  total_count int
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.geo_normalize_name(p_city) as n),
  hits as (
    select p.id, p.place_type, p.admin_unit_id,
           case when public.geo_normalize_name(p.name) = q.n then 'canonical' else 'alias' end as kind
    from public.geo_places p
    cross join q
    where length(q.n) >= 2
      and p.country_code = upper(coalesce(p_country, 'CM'))
      and p.verification_status <> 'rejected'
      and (public.geo_normalize_name(p.name) = q.n
           or exists (select 1 from unnest(p.aliases) x where public.geo_normalize_name(x) = q.n))
  ),
  counted as (select h.*, count(*) over () as total from hits h)
  select c.id, c.kind, c.place_type, a.id, d.id, r.id, c.total::int
  from counted c
  left join public.geo_admin_units a on a.id = c.admin_unit_id
  left join public.geo_admin_units d on d.id = a.parent_id
  left join public.geo_admin_units r on r.id = d.parent_id
  order by (c.kind = 'canonical') desc, c.id
  limit 50;
$$;

revoke all on function public.geo_normalize_name(text) from public, anon, authenticated;
revoke all on function public.geo_resolve_city(text, text) from public, anon, authenticated;
grant execute on function public.geo_normalize_name(text) to service_role;
grant execute on function public.geo_resolve_city(text, text) to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Rapprochement automatique par ville
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.member_locations alter column nearby_search_enabled set default true;
alter table public.member_locations alter column location_discoverable set default true;
update public.member_locations
   set nearby_search_enabled = true, location_discoverable = true, updated_at = now()
 where not nearby_search_enabled or not location_discoverable;

notify pgrst, 'reload schema';
