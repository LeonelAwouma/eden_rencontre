-- Géolocalisation — Lot 1 (2/3) : localisation structurée des membres (donnée PRIVÉE).
-- Idempotent, additif. À exécuter APRÈS 20261115_geo_reference.sql, dans le SQL Editor de Supabase.
-- Rollback : drop table public.member_location_history, public.member_locations cascade;
--
-- Pourquoi une table à part : la politique RLS de « profiles » est « ligne entière » — tout membre
-- approuvé peut lire toutes les colonnes de tous les membres approuvés. Une colonne géographique sur
-- « profiles » serait donc lisible par tous. member_locations est FERMÉE aux rôles clients : seul le
-- serveur (service_role, via /api/member/location et les routes de découverte) y accède.
--
-- Aucun point GPS n'est enregistré : la position d'un membre = le point représentatif de SA localité
-- déclarée (geo_places), jamais une coordonnée personnelle.

create table if not exists public.member_locations (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  country_code       text not null check (country_code ~ '^[A-Z]{2}$'),
  region_id          uuid references public.geo_admin_units(id) on delete set null,
  department_id      uuid references public.geo_admin_units(id) on delete set null,
  arrondissement_id  uuid references public.geo_admin_units(id) on delete set null,
  place_id           uuid references public.geo_places(id) on delete set null,
  free_text_city     text check (free_text_city is null or char_length(free_text_city) <= 120),
  verification_status text not null default 'unverified'
                     check (verification_status in ('verified','unverified','rejected')),
  -- Consentements : INDÉPENDANTS entre eux et de display_level ; jamais activés automatiquement.
  nearby_search_enabled boolean not null default false,  -- j'utilise ma localisation pour chercher
  location_discoverable boolean not null default false,  -- je peux être inclus dans les recherches des autres
  display_level      text not null default 'none'
                     check (display_level in ('none','country','region','department','arrondissement','city')),
  location_consent_at timestamptz,                       -- null tant que le membre n'a pas fait de choix explicite
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists member_locations_region_idx   on public.member_locations(region_id);
create index if not exists member_locations_dept_idx     on public.member_locations(department_id);
create index if not exists member_locations_arr_idx      on public.member_locations(arrondissement_id);
create index if not exists member_locations_place_idx    on public.member_locations(place_id);
create index if not exists member_locations_search_idx
  on public.member_locations(country_code, location_discoverable) where location_discoverable;

-- Historique (jamais exposé aux membres, même au propriétaire : il sert à l'audit et à la correction admin).
create table if not exists public.member_location_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  changed_at  timestamptz not null default now(),
  previous    jsonb not null
);
create index if not exists member_location_history_user_idx on public.member_location_history(user_id, changed_at desc);

alter table public.member_locations        enable row level security;
alter table public.member_location_history enable row level security;
revoke all on public.member_locations        from anon, authenticated;
revoke all on public.member_location_history from anon, authenticated;
revoke all on sequence public.member_location_history_id_seq from anon, authenticated;

drop policy if exists member_locations_no_client on public.member_locations;
create policy member_locations_no_client on public.member_locations for all using (false) with check (false);
drop policy if exists member_location_history_no_client on public.member_location_history;
create policy member_location_history_no_client on public.member_location_history for all using (false) with check (false);

grant all on public.member_locations        to service_role;
grant all on public.member_location_history to service_role;
grant usage, select on sequence public.member_location_history_id_seq to service_role;

notify pgrst, 'reload schema';
