-- Rattrapage des membres existants — APERÇU, LECTURE SEULE (aucune écriture).
-- À exécuter dans le SQL Editor APRÈS supabase/migrations/20261123_geo_resolve_city.sql, puis à relire avant de
-- lancer scripts/geo/backfill-members-apply.sql. Aucun identifiant de membre n'est affiché.

-- 1. Valeurs de pays présentes chez les membres : repérer d'éventuelles variantes (« Cameroon »…) hors périmètre.
select country, count(*) as membres
from public.profiles
where account_type = 'member'
group by country
order by membres desc;

-- 2. Ce que ferait le rattrapage, par nom de ville.
with candidats as (
  select p.id, p.city, ml.user_id as ml_uid, ml.place_id as ml_place
  from public.profiles p
  left join public.member_locations ml on ml.user_id = p.id
  where p.account_type = 'member'
    and p.country = 'Cameroun'
    and public.geo_normalize_name(p.city) <> ''
    -- mêmes valeurs génériques que isGenericCityLabel (src/lib/geo/public-label.ts)
    and public.geo_normalize_name(p.city) not in ('non precisee', 'not specified', 'non renseignee', 'unspecified')
),
decision as (
  select c.*,
         r.n_places, r.n_cities, r.total
  from candidats c
  left join lateral (
    select count(distinct x.place_id) as n_places,
           count(distinct x.place_id) filter (where x.place_type = 'city') as n_cities,
           max(x.total_count) as total
    from public.geo_resolve_city(c.city, 'CM') x
  ) r on true
)
select city as ville,
       case
         when ml_uid is not null and ml_place is not null then 'déjà structuré'
         when ml_uid is not null then 'déjà en texte libre (hors périmètre)'
         when coalesce(n_places, 0) = 0 then 'non reconnu'
         when total > 50 then 'ambigu (plus de 50 localités)'
         when n_places = 1 or n_cities = 1 then 'serait inséré'
         else 'ambigu'
       end as categorie,
       count(*) as membres
from decision
group by 1, 2
order by 2, 3 desc, 1;
