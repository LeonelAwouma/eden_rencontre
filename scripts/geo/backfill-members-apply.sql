-- Rattrapage des membres existants — INSERTION. Script manuel (pas une migration de schéma).
-- À exécuter dans le SQL Editor APRÈS supabase/migrations/20261123_geo_resolve_city.sql et APRÈS lecture de
-- scripts/geo/backfill-members-preview.sql. Rejouable : une deuxième exécution n'insère rien.
--
-- Périmètre : membres (account_type = 'member') au Cameroun, ville non vide et non générique, SANS ligne
-- member_locations. Une ligne existante (même en texte libre) n'est jamais modifiée.
-- Règle (identique à resolvePlaceFromCandidates, src/lib/geo/resolve-place.ts) : correspondance exacte nom/alias ;
-- plus de 50 localités → ambigu ; une seule localité → retenue ; sinon une seule ville (place_type 'city') → retenue ;
-- sinon ambigu. La population ne tranche jamais.
-- display_level = 'city' : la ville était déjà publique sur ces profils (aucune exposition nouvelle).
-- Rapprochement par ville automatique (nearby_search_enabled / location_discoverable = true).
-- Rattachement administratif indicatif : celui du point de référence GeoNames de la ville, pas la résidence du membre.

begin;

create temporary table backfill_report (ville text, categorie text, membres int) on commit drop;

-- Membres déjà localisés AVANT cette exécution (comptés avant l'insertion, jamais modifiés).
insert into backfill_report
select p.city,
       case when ml.place_id is not null then 'déjà structuré' else 'déjà en texte libre (hors périmètre)' end,
       count(*)
from public.profiles p
join public.member_locations ml on ml.user_id = p.id
where p.account_type = 'member' and p.country = 'Cameroun'
group by 1, 2;

with candidats as (
  select p.id, p.city
  from public.profiles p
  where p.account_type = 'member'
    and p.country = 'Cameroun'
    and public.geo_normalize_name(p.city) <> ''
    and public.geo_normalize_name(p.city) not in ('non precisee', 'not specified', 'non renseignee', 'unspecified')
    and not exists (select 1 from public.member_locations ml where ml.user_id = p.id)
),
resolus as (
  select c.id, c.city, r.n_places, r.total,
         case
           when coalesce(r.n_places, 0) = 0 or r.total > 50 then null
           when r.n_places = 1 then r.any_place
           when r.n_cities = 1 then r.the_city
         end as place_id
  from candidats c
  left join lateral (
    select count(distinct x.place_id) as n_places,
           count(distinct x.place_id) filter (where x.place_type = 'city') as n_cities,
           max(x.total_count) as total,
           (min(x.place_id::text))::uuid as any_place,
           (min(x.place_id::text) filter (where x.place_type = 'city'))::uuid as the_city
    from public.geo_resolve_city(c.city, 'CM') x
  ) r on true
),
inseres as (
  insert into public.member_locations
    (user_id, country_code, region_id, department_id, arrondissement_id, place_id, free_text_city,
     verification_status, nearby_search_enabled, location_discoverable, display_level, location_consent_at)
  select r.id, 'CM', d.parent_id, a.parent_id, gp.admin_unit_id, gp.id, null,
         case when gp.verification_status = 'verified' and gp.admin_unit_id is not null then 'verified' else 'unverified' end,
         true, true, 'city', null
  from resolus r
  join public.geo_places gp on gp.id = r.place_id
  left join public.geo_admin_units a on a.id = gp.admin_unit_id
  left join public.geo_admin_units d on d.id = a.parent_id
  on conflict (user_id) do nothing
  returning user_id
)
insert into backfill_report
select r.city,
       case
         when r.id in (select user_id from inseres) then 'inséré pendant cette exécution'
         when coalesce(r.n_places, 0) = 0 then 'non reconnu'
         else 'ambigu'
       end,
       count(*)
from resolus r
group by 1, 2;

select * from backfill_report order by categorie, membres desc, ville;

commit;
