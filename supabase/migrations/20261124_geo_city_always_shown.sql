-- Géolocalisation — la ville est TOUJOURS affichée sur le profil (décision du 2026-11-24).
-- Le réglage « Localisation affichée sur mon profil » est supprimé de l'interface : display_level vaut toujours
-- 'city', et profiles.city reçoit la vraie ville (et non plus l'étiquette générique « Non précisée »).
-- Idempotent. À exécuter APRÈS 20261123_geo_resolve_city.sql, dans le SQL Editor de Supabase, par un humain.
-- Rollback : alter table public.member_locations alter column display_level set default 'none';
--            (les valeurs modifiées ne sont pas restaurées automatiquement)

begin;

alter table public.member_locations alter column display_level set default 'city';

update public.member_locations
   set display_level = 'city', updated_at = now()
 where display_level <> 'city';

-- profiles.city : la vraie ville pour les membres localisés dont le profil affiche encore une étiquette générique
-- (mêmes valeurs que isGenericCityLabel, src/lib/geo/public-label.ts). Le pays n'est pas touché.
update public.profiles p
   set city = v.ville
  from (
    select ml.user_id, coalesce(gp.name, nullif(trim(ml.free_text_city), '')) as ville
    from public.member_locations ml
    left join public.geo_places gp on gp.id = ml.place_id
  ) v
 where v.user_id = p.id
   and v.ville is not null
   and (p.city is null
        or public.geo_normalize_name(p.city) in ('', 'non precisee', 'not specified', 'non renseignee', 'unspecified'));

commit;

-- Contrôle : les deux nombres doivent valoir 0.
select
  (select count(*) from public.member_locations where display_level <> 'city') as affichage_non_ville,
  (select count(*) from public.profiles p join public.member_locations ml on ml.user_id = p.id
    where public.geo_normalize_name(coalesce(p.city, '')) in ('', 'non precisee', 'not specified', 'non renseignee', 'unspecified')
      and (ml.place_id is not null or nullif(trim(ml.free_text_city), '') is not null)) as ville_generique_restante;
