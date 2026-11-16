-- Géolocalisation — Lot 2 : découverte géographique (filtre de portée) + limitation de débit persistante.
-- Idempotent, additif. À exécuter APRÈS 20261115_geo_reference.sql et 20261115_geo_member_locations.sql,
-- dans le SQL Editor de Supabase, par un humain.
-- Rollback : drop function public.geo_candidates_in_scope(uuid,text,int,boolean,text,int,int),
--            public.geo_rate_limit_hit(uuid,int,int), public.geo_scope_hit(uuid,text,int);
--            drop table public.geo_rate_limits, public.geo_scope_usage;
--
-- Principes :
--   * AUCUNE de ces fonctions n'est exécutable par anon / authenticated : service_role SEULEMENT. Elles sont
--     appelées par /api/discover/geo APRÈS authentification et contrôle du statut du membre ; l'identité du
--     demandeur (p_viewer) vient du jeton côté serveur, jamais d'un paramètre du navigateur ;
--   * elles lisent des tables privées (member_locations) : SECURITY DEFINER est nécessaire, avec
--     search_path vide et références entièrement qualifiées ;
--   * un membre n'apparaît dans un périmètre QUE s'il a explicitement activé location_discoverable, et le
--     demandeur doit avoir activé nearby_search_enabled ;
--   * la fonction renvoie des données brutes au SERVEUR ; la route les expurge (niveau d'affichage,
--     catégories de distance) avant de répondre : aucune coordonnée ni distance exacte ne quitte le serveur ;
--   * l'ordre de sortie est NEUTRE (catégorie puis identifiant) : il ne doit jamais révéler un classement
--     par distance, notamment pour les membres qui ne montrent pas leur localisation.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Limitation de débit : persistante, atomique, partagée entre les instances
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.geo_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket  timestamptz not null,
  hits    integer not null default 0,
  primary key (user_id, bucket)
);
create table if not exists public.geo_scope_usage (
  user_id   uuid not null references auth.users(id) on delete cascade,
  day       date not null,
  scope_key text not null,
  primary key (user_id, day, scope_key)
);
alter table public.geo_rate_limits enable row level security;
alter table public.geo_scope_usage enable row level security;
revoke all on public.geo_rate_limits from anon, authenticated;
revoke all on public.geo_scope_usage from anon, authenticated;
drop policy if exists geo_rate_limits_no_client on public.geo_rate_limits;
create policy geo_rate_limits_no_client on public.geo_rate_limits for all using (false) with check (false);
drop policy if exists geo_scope_usage_no_client on public.geo_scope_usage;
create policy geo_scope_usage_no_client on public.geo_scope_usage for all using (false) with check (false);
grant all on public.geo_rate_limits to service_role;
grant all on public.geo_scope_usage to service_role;

-- Un « coup » dans la fenêtre courante ; faux = limite dépassée. L'upsert est atomique (une seule instruction).
create or replace function public.geo_rate_limit_hit(p_user uuid, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w   int := greatest(coalesce(p_window_seconds, 60), 1);
  b   timestamptz := to_timestamp(floor(extract(epoch from now()) / w) * w);
  n   int;
begin
  insert into public.geo_rate_limits as r (user_id, bucket, hits)
  values (p_user, b, 1)
  on conflict (user_id, bucket) do update set hits = r.hits + 1
  returning r.hits into n;

  if random() < 0.02 then  -- ménage occasionnel des fenêtres anciennes
    delete from public.geo_rate_limits where bucket < now() - interval '1 day';
    delete from public.geo_scope_usage where day < current_date - 1;
  end if;
  return n <= p_limit;
end;
$$;

-- Plafond de portées DISTINCTES par jour (freine l'exploration systématique des zones). Une portée déjà
-- utilisée aujourd'hui reste toujours autorisée.
create or replace function public.geo_scope_hit(p_user uuid, p_scope_key text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted int;
  total    int;
begin
  insert into public.geo_scope_usage (user_id, day, scope_key)
  values (p_user, current_date, left(p_scope_key, 40))
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return true; end if;

  select count(*) into total from public.geo_scope_usage where user_id = p_user and day = current_date;
  if total > p_max then
    delete from public.geo_scope_usage where user_id = p_user and day = current_date and scope_key = left(p_scope_key, 40);
    return false;
  end if;
  return true;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Candidats dans un périmètre
--    p_scope : city | arrondissement | department | region | country | radius (avec p_radius_km)
--    Retour : DONNÉES BRUTES pour le serveur (jamais renvoyées telles quelles au navigateur).
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.geo_candidates_in_scope(
  p_viewer uuid,
  p_scope text,
  p_radius_km int,
  p_include_unlocated boolean,
  p_exclude_email text,
  p_limit int,
  p_offset int
)
returns table (
  user_id uuid,
  category text,               -- 'in_scope' | 'unlocated'
  display_level text,
  country_code text,
  same_place boolean,
  distance_m double precision,
  region_name text,
  department_name text,
  arrondissement_name text,
  city_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select ml.country_code, ml.region_id, ml.department_id, ml.arrondissement_id, ml.place_id,
           gp.representative_point as pt
    from public.member_locations ml
    left join public.geo_places gp on gp.id = ml.place_id
    where ml.user_id = p_viewer and ml.nearby_search_enabled
  ),
  vg as (select gender from public.profiles where id = p_viewer),
  base as (
    select p.id as uid,
           ml.user_id as ml_uid,
           coalesce(ml.location_discoverable, false) as discoverable,
           ml.display_level, ml.country_code,
           ml.region_id, ml.department_id, ml.arrondissement_id, ml.place_id,
           ml.free_text_city,
           cp.representative_point as cpt,
           (v.pt is not null and cp.representative_point is not null) as has_pts,
           coalesce(case p_scope
             when 'city'           then ml.place_id is not null and ml.place_id = v.place_id
             when 'arrondissement' then ml.arrondissement_id is not null and ml.arrondissement_id = v.arrondissement_id
             when 'department'     then ml.department_id is not null and ml.department_id = v.department_id
             when 'region'         then ml.region_id is not null and ml.region_id = v.region_id
             when 'country'        then ml.country_code is not null and ml.country_code = v.country_code
             when 'radius'         then v.pt is not null and cp.representative_point is not null
                                        and extensions.ST_DWithin(v.pt::extensions.geography,
                                                                  cp.representative_point::extensions.geography,
                                                                  greatest(coalesce(p_radius_km, 0), 25) * 1000.0)
             else false
           end, false) as in_scope,
           (ml.user_id is null
            or not ml.location_discoverable
            or (ml.place_id is null and ml.region_id is null and ml.department_id is null and ml.arrondissement_id is null)
           ) as unlocated
    from public.profiles p
    cross join v
    cross join vg
    left join public.member_locations ml on ml.user_id = p.id
    left join public.geo_places cp on cp.id = ml.place_id
    where p.id <> p_viewer
      and p.status = 'approved'
      and p.account_type = 'member'
      and (p_exclude_email is null or p.email is distinct from p_exclude_email)
      -- même règle que le Discover existant : genre opposé (valeurs canoniques « homme » / « femme »)
      and p.gender in ('homme', 'femme') and vg.gender in ('homme', 'femme') and p.gender <> vg.gender
  )
  select b.uid,
         case when b.discoverable and b.in_scope then 'in_scope' else 'unlocated' end,
         b.display_level,
         b.country_code,
         (b.place_id is not null and b.place_id = (select place_id from v)),
         case when b.has_pts then extensions.ST_Distance(
                (select pt from v)::extensions.geography, b.cpt::extensions.geography) end,
         r.name_fr, d.name_fr, a.name_fr,
         coalesce(gp.name, b.free_text_city)
  from base b
  left join public.geo_admin_units r  on r.id  = b.region_id
  left join public.geo_admin_units d  on d.id  = b.department_id
  left join public.geo_admin_units a  on a.id  = b.arrondissement_id
  left join public.geo_places      gp on gp.id = b.place_id
  where (b.discoverable and b.in_scope)
     or (coalesce(p_include_unlocated, false) and b.unlocated)
  order by 2, b.uid                       -- ordre NEUTRE : jamais trié par distance
  limit least(greatest(coalesce(p_limit, 100), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.geo_rate_limit_hit(uuid, int, int) from public, anon, authenticated;
revoke all on function public.geo_scope_hit(uuid, text, int) from public, anon, authenticated;
revoke all on function public.geo_candidates_in_scope(uuid, text, int, boolean, text, int, int) from public, anon, authenticated;
grant execute on function public.geo_rate_limit_hit(uuid, int, int) to service_role;
grant execute on function public.geo_scope_hit(uuid, text, int) to service_role;
grant execute on function public.geo_candidates_in_scope(uuid, text, int, boolean, text, int, int) to service_role;

notify pgrst, 'reload schema';
