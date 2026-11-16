-- Géolocalisation — Lot 3 : carte interactive (limites administratives + comptes agrégés par zone).
-- Idempotent, additif. À exécuter APRÈS 20261116_geo_discovery.sql, dans le SQL Editor, par un humain.
-- Rollback : drop function public.geo_units_geojson(int, uuid), public.geo_zone_counts(uuid, int, uuid, text);
--
-- Principes :
--   * geo_units_geojson : LIMITES seulement (données publiques du référentiel). Aucune donnée de membre,
--     jamais de comptes dans le GeoJSON ; coordonnées arrondies (4 décimales ≈ 11 m) pour alléger la réponse ;
--   * geo_zone_counts : nombres de membres par zone. Renvoie les comptes BRUTS au SERVEUR uniquement ; la route
--     applique le seuil de 5 et la suppression complémentaire avant de répondre ;
--   * un membre n'est compté que s'il a activé location_discoverable ; le demandeur doit avoir activé
--     nearby_search_enabled (sinon aucun compte) ; mêmes filtres que la découverte (membre approuvé, genre opposé) ;
--   * aucune coordonnée de membre n'est lue ni renvoyée : seules les colonnes d'appartenance (zone) servent ;
--   * service_role SEULEMENT, search_path vide.

create or replace function public.geo_units_geojson(p_level int, p_parent uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'id', u.id,
        'properties', jsonb_build_object('id', u.id, 'code', u.code, 'level', u.level, 'name', u.name_fr, 'parentId', u.parent_id),
        'geometry', extensions.ST_AsGeoJSON(coalesce(u.geom_simplified, u.geom), 4)::jsonb
      ) order by u.name_fr
    ), '[]'::jsonb)
  )
  from public.geo_admin_units u
  where u.country_code = 'CM'
    and u.level = p_level
    and p_level between 1 and 3
    and (p_parent is null or u.parent_id = p_parent)
    and coalesce(u.geom_simplified, u.geom) is not null;
$$;

create or replace function public.geo_zone_counts(p_viewer uuid, p_level int, p_parent uuid, p_exclude_email text)
returns table (unit_id uuid, member_count int)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select 1 from public.member_locations where user_id = p_viewer and nearby_search_enabled
  ),
  vg as (select gender from public.profiles where id = p_viewer),
  members as (
    select ml.region_id, ml.department_id, ml.arrondissement_id
    from public.member_locations ml
    join public.profiles p on p.id = ml.user_id
    cross join vg
    where exists (select 1 from v)
      and ml.location_discoverable
      and p.id <> p_viewer
      and p.status = 'approved'
      and p.account_type = 'member'
      and (p_exclude_email is null or p.email is distinct from p_exclude_email)
      and p.gender in ('homme', 'femme') and vg.gender in ('homme', 'femme') and p.gender <> vg.gender
  )
  select u.id,
         (select count(*)::int from members m
           where case p_level
                   when 1 then m.region_id
                   when 2 then m.department_id
                   when 3 then m.arrondissement_id
                 end = u.id)
  from public.geo_admin_units u
  where u.country_code = 'CM'
    and u.level = p_level
    and p_level between 1 and 3
    and (p_parent is null or u.parent_id = p_parent)
  order by u.id;                      -- ordre neutre
$$;

revoke all on function public.geo_units_geojson(int, uuid) from public, anon, authenticated;
revoke all on function public.geo_zone_counts(uuid, int, uuid, text) from public, anon, authenticated;
grant execute on function public.geo_units_geojson(int, uuid) to service_role;
grant execute on function public.geo_zone_counts(uuid, int, uuid, text) to service_role;

notify pgrst, 'reload schema';
