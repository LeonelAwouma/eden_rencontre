-- Géolocalisation — Lot 1 (1/3) : référentiel géographique PUBLIC (limites administratives + localités).
-- Idempotent, additif. À exécuter dans le SQL Editor de Supabase, par un humain, APRÈS avoir activé les
-- extensions (le « create extension » ci-dessous le fait dans le schéma « extensions », comme pg_net).
-- Rollback : drop table public.geo_import_runs, public.geo_places, public.geo_admin_units cascade;
--
-- Principes :
--   * référentiel de limites uniquement : AUCUNE donnée de membre ici ;
--   * tables réservées au serveur (service_role) : RLS activée, aucun droit pour anon / authenticated ;
--     les routes /api/geo/* servent les données publiques (limites, noms) après contrôle ;
--   * géométries originales conservées en EPSG:4326 ; version simplifiée à part (affichage) ;
--   * identifiants stables : « code » (p-code OCHA ou code normalisé), jamais le nom seul.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Unités administratives (pays → région → département → arrondissement)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.geo_admin_units (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,                         -- stable : p-code source (ex. CM004) ou code normalisé
  country_code    text not null check (country_code ~ '^[A-Z]{2}$'),
  level           smallint not null check (level between 0 and 3),
  name_fr         text not null,
  name_en         text,
  aliases         text[] not null default '{}',
  normalized_names text[] not null default '{}',         -- noms/alias sans accents, minuscules (recherche)
  parent_id       uuid references public.geo_admin_units(id) on delete restrict,
  geom            extensions.geometry(MultiPolygon, 4326),            -- ORIGINALE, jamais modifiée par la simplification
  geom_simplified extensions.geometry(MultiPolygon, 4326),            -- affichage (simplifiée en projection métrique)
  centroid        extensions.geometry(Point, 4326),                   -- ST_PointOnSurface : toujours dans le polygone
  source          text not null,                         -- ex. « OCHA COD-AB CMR »
  source_url      text,
  source_version  text,
  license         text,                                  -- lue dans les métadonnées du fichier réellement importé
  retrieved_at    timestamptz,
  validated       boolean not null default false,        -- une donnée validée n'est jamais écrasée par une source de moindre qualité
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint geo_admin_units_code_uniq unique (country_code, level, code),
  constraint geo_admin_units_parent_chk check ((level = 0 and parent_id is null) or (level > 0))
);
create index if not exists geo_admin_units_parent_idx   on public.geo_admin_units(parent_id);
create index if not exists geo_admin_units_level_idx    on public.geo_admin_units(country_code, level);
create index if not exists geo_admin_units_geom_gix     on public.geo_admin_units using gist (geom);
create index if not exists geo_admin_units_simpl_gix    on public.geo_admin_units using gist (geom_simplified);
create index if not exists geo_admin_units_centroid_gix on public.geo_admin_units using gist (centroid);
create index if not exists geo_admin_units_names_gin    on public.geo_admin_units using gin (normalized_names);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Localités (villes, communes, villages) — points représentatifs, jamais une position de membre
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.geo_places (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  normalized_name     text not null,
  aliases             text[] not null default '{}',
  country_code        text not null check (country_code ~ '^[A-Z]{2}$'),
  place_type          text not null default 'locality',  -- city | town | village | locality
  admin_unit_id       uuid references public.geo_admin_units(id) on delete set null,  -- arrondissement (null = non vérifié)
  representative_point extensions.geometry(Point, 4326) not null,
  population          integer,
  source              text not null,
  source_id           text not null,
  source_url          text,
  source_version      text,
  license             text,
  retrieved_at        timestamptz,
  verification_status text not null default 'unverified',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint geo_places_source_uniq unique (source, source_id),
  constraint geo_places_status_chk check (verification_status in ('verified','unverified','rejected'))
);
create index if not exists geo_places_country_idx  on public.geo_places(country_code);
create index if not exists geo_places_admin_idx    on public.geo_places(admin_unit_id);
create index if not exists geo_places_point_gix    on public.geo_places using gist (representative_point);
create index if not exists geo_places_name_trgm    on public.geo_places using gin (normalized_name extensions.gin_trgm_ops);
create index if not exists geo_places_country_name_idx on public.geo_places(country_code, normalized_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Journal des imports (statistiques, anomalies, conflits signalés)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.geo_import_runs (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  source        text not null,
  source_version text,
  mode          text not null default 'apply' check (mode in ('dry-run','apply')),
  stats         jsonb not null default '{}'::jsonb,       -- comptes par niveau, créés/mis à jour/ignorés
  anomalies     jsonb not null default '[]'::jsonb,       -- géométries invalides, orphelins, doublons
  conflicts     jsonb not null default '[]'::jsonb        -- données validées non écrasées
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Accès : serveur seulement
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.geo_admin_units enable row level security;
alter table public.geo_places      enable row level security;
alter table public.geo_import_runs enable row level security;

revoke all on public.geo_admin_units from anon, authenticated;
revoke all on public.geo_places      from anon, authenticated;
revoke all on public.geo_import_runs from anon, authenticated;

drop policy if exists geo_admin_units_no_client on public.geo_admin_units;
create policy geo_admin_units_no_client on public.geo_admin_units for all using (false) with check (false);
drop policy if exists geo_places_no_client on public.geo_places;
create policy geo_places_no_client on public.geo_places for all using (false) with check (false);
drop policy if exists geo_import_runs_no_client on public.geo_import_runs;
create policy geo_import_runs_no_client on public.geo_import_runs for all using (false) with check (false);

grant all on public.geo_admin_units to service_role;
grant all on public.geo_places      to service_role;
grant all on public.geo_import_runs to service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Fonctions de lecture du référentiel (SECURITY DEFINER, service_role SEULEMENT)
--    Justification : les tables sont fermées aux rôles clients ; ces fonctions ne renvoient que des
--    données PUBLIQUES (noms, hiérarchie) et jamais de donnée de membre. search_path verrouillé.
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.geo_search_places(p_query text, p_country text default 'CM', p_limit int default 10)
returns table (
  place_id uuid, name text, place_type text, verification_status text,
  arrondissement_id uuid, arrondissement_fr text,
  department_id uuid, department_fr text,
  region_id uuid, region_fr text
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select trim(regexp_replace(lower(extensions.unaccent(coalesce(p_query, ''))), '[-_.,/]+', ' ', 'g')) as n
  )
  select p.id, p.name, p.place_type, p.verification_status,
         a.id, a.name_fr, d.id, d.name_fr, r.id, r.name_fr
  from public.geo_places p
  cross join q
  left join public.geo_admin_units a on a.id = p.admin_unit_id
  left join public.geo_admin_units d on d.id = a.parent_id
  left join public.geo_admin_units r on r.id = d.parent_id
  where length(q.n) >= 2
    and p.country_code = upper(coalesce(p_country, 'CM'))
    and p.verification_status <> 'rejected'
    and (p.normalized_name like q.n || '%' or p.normalized_name like '% ' || q.n || '%'
         or q.n = any (select lower(extensions.unaccent(x)) from unnest(p.aliases) x))
  order by (p.normalized_name = q.n) desc, coalesce(p.population, 0) desc, p.name
  limit least(greatest(coalesce(p_limit, 10), 1), 25);
$$;

revoke all on function public.geo_search_places(text, text, int) from public, anon, authenticated;
grant execute on function public.geo_search_places(text, text, int) to service_role;

notify pgrst, 'reload schema';
