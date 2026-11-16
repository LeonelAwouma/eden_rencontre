-- Géolocalisation — Lot 4 : tableau de bord admin du référentiel (comptes et contrôles SEULEMENT).
-- Idempotent, additif. À exécuter APRÈS 20261117_geo_map.sql, dans le SQL Editor, par un humain.
-- Rollback : drop function public.geo_admin_overview(), public.geo_admin_inconsistencies(int);
--
-- Principes :
--   * l'administration ne voit JAMAIS de coordonnée ni de localisation individuelle : uniquement des totaux ;
--   * les totaux par région ne comptent que les membres ayant activé location_discoverable, et le serveur
--     masque tout compte inférieur à 5 (même seuil que la carte) ;
--   * service_role SEULEMENT, search_path vide.

create or replace function public.geo_admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'units', coalesce((
      select jsonb_agg(jsonb_build_object(
        'level', l.level, 'total', l.total, 'withGeometry', l.with_geom, 'withSimplified', l.with_simpl
      ) order by l.level)
      from (
        select u.level,
               count(*)::int as total,
               count(*) filter (where u.geom is not null)::int as with_geom,
               count(*) filter (where u.geom_simplified is not null)::int as with_simpl
        from public.geo_admin_units u where u.country_code = 'CM' group by u.level
      ) l
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_object_agg(s.verification_status, s.n)
      from (select verification_status, count(*)::int as n from public.geo_places where country_code = 'CM' group by verification_status) s
    ), '{}'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', s.source, 'version', s.source_version, 'license', s.license, 'retrievedAt', s.retrieved_at, 'units', s.n
      ) order by s.source)
      from (
        select source, source_version, license, max(retrieved_at) as retrieved_at, count(*)::int as n
        from public.geo_admin_units group by source, source_version, license
      ) s
    ), '[]'::jsonb),
    'placeSources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source', s.source, 'version', s.source_version, 'license', s.license, 'retrievedAt', s.retrieved_at, 'places', s.n
      ) order by s.source)
      from (
        select source, source_version, license, max(retrieved_at) as retrieved_at, count(*)::int as n
        from public.geo_places group by source, source_version, license
      ) s
    ), '[]'::jsonb),
    'members', jsonb_build_object(
      'located',          (select count(*)::int from public.member_locations),
      'unverified',       (select count(*)::int from public.member_locations where verification_status <> 'verified'),
      'searchEnabled',    (select count(*)::int from public.member_locations where nearby_search_enabled),
      'discoverable',     (select count(*)::int from public.member_locations where location_discoverable),
      'consentRecorded',  (select count(*)::int from public.member_locations where location_consent_at is not null),
      'byDisplayLevel',   coalesce((
        select jsonb_object_agg(d.display_level, d.n)
        from (select display_level, count(*)::int as n from public.member_locations group by display_level) d
      ), '{}'::jsonb)
    ),
    -- comptes bruts par région (membres discoverable seulement) : le SERVEUR applique le seuil de 5
    'regionCounts', coalesce((
      select jsonb_agg(jsonb_build_object('unitId', r.id, 'name', r.name_fr, 'count', r.n) order by r.name_fr)
      from (
        select u.id, u.name_fr,
               (select count(*)::int from public.member_locations ml
                 where ml.region_id = u.id and ml.location_discoverable) as n
        from public.geo_admin_units u where u.country_code = 'CM' and u.level = 1
      ) r
    ), '[]'::jsonb)
  );
$$;

-- Incohérences du référentiel (données publiques seulement : aucune donnée de membre).
create or replace function public.geo_admin_inconsistencies(p_limit int default 200)
returns table (kind text, code text, name text, detail text)
language sql
stable
security definer
set search_path = ''
as $$
  (
    select 'unit_orphan'::text, u.code, u.name_fr, 'niveau ' || u.level || ' sans parent'
    from public.geo_admin_units u where u.level > 1 and u.parent_id is null
  )
  union all
  (
    select 'unit_wrong_parent_level', u.code, u.name_fr,
           'niveau ' || u.level || ' rattaché à un parent de niveau ' || p.level
    from public.geo_admin_units u join public.geo_admin_units p on p.id = u.parent_id
    where p.level <> u.level - 1
  )
  union all
  (
    select 'unit_no_geometry', u.code, u.name_fr, 'aucune géométrie'
    from public.geo_admin_units u where u.geom is null and u.level between 1 and 3
  )
  union all
  (
    select 'unit_invalid_geometry', u.code, u.name_fr, 'géométrie invalide'
    from public.geo_admin_units u where u.geom is not null and not extensions.ST_IsValid(u.geom)
  )
  union all
  (
    select 'place_wrong_unit_level', g.source_id, g.name, 'rattachée à une unité de niveau ' || a.level || ' (arrondissement attendu)'
    from public.geo_places g join public.geo_admin_units a on a.id = g.admin_unit_id
    where a.level <> 3
  )
  union all
  (
    select 'place_verified_without_unit', g.source_id, g.name, 'vérifiée sans arrondissement'
    from public.geo_places g where g.verification_status = 'verified' and g.admin_unit_id is null
  )
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

revoke all on function public.geo_admin_overview() from public, anon, authenticated;
revoke all on function public.geo_admin_inconsistencies(int) from public, anon, authenticated;
grant execute on function public.geo_admin_overview() to service_role;
grant execute on function public.geo_admin_inconsistencies(int) to service_role;

notify pgrst, 'reload schema';
