-- Rattrapage des membres HORS CAMEROUN — script manuel (pas une migration de schéma), rejouable.
-- À exécuter dans le SQL Editor APRÈS supabase/migrations/20261123_geo_resolve_city.sql.
--
-- Pourquoi : la vue Admin → Géographie → International ne compte que les membres qui ont une ligne member_locations.
-- Les membres étrangers inscrits avant l'outil de localisation n'en ont pas (le rattrapage précédent ne traitait que
-- le Cameroun). Les nouvelles inscriptions créent déjà leur ligne (saveMemberLocation).
--
-- Périmètre : membres (account_type = 'member') dont profiles.country est renseigné et n'est pas le Cameroun, SANS
-- ligne member_locations. Une ligne existante n'est jamais modifiée.
-- Pays : correspondance nom → ISO générée depuis COUNTRIES (src/lib/geo.ts). Pays non reconnu → rien n'est inséré.
-- Ville : profiles.city si ce n'est pas une étiquette générique (mêmes valeurs que isGenericCityLabel) ; aucun
-- identifiant géographique (le référentiel ne couvre que le Cameroun).
-- Règles actuelles : ville toujours affichée (display_level = 'city'), rapprochement par ville automatique.
--
-- APERÇU sans écrire : exécuter le script en remplaçant la dernière ligne « commit; » par « rollback; ».

begin;

-- BEGIN COUNTRY MAP (généré par scripts/geo/build-country-map.mjs — ne pas modifier à la main)
create temporary table country_map (name text, iso text) on commit drop;
insert into country_map (name, iso) values
  ('Cameroun', 'CM'),
  ('Cameroon', 'CM'),
  ('Gabon', 'GA'),
  ('Congo-Brazzaville', 'CG'),
  ('Republic of the Congo', 'CG'),
  ('RD Congo', 'CD'),
  ('DR Congo', 'CD'),
  ('République centrafricaine', 'CF'),
  ('Central African Republic', 'CF'),
  ('Tchad', 'TD'),
  ('Chad', 'TD'),
  ('Guinée équatoriale', 'GQ'),
  ('Equatorial Guinea', 'GQ'),
  ('Sao Tomé-et-Principe', 'ST'),
  ('São Tomé and Príncipe', 'ST'),
  ('Angola', 'AO'),
  ('Burundi', 'BI'),
  ('Rwanda', 'RW'),
  ('Côte d''Ivoire', 'CI'),
  ('Ivory Coast (Côte d''Ivoire)', 'CI'),
  ('Sénégal', 'SN'),
  ('Senegal', 'SN'),
  ('Mali', 'ML'),
  ('Burkina Faso', 'BF'),
  ('Bénin', 'BJ'),
  ('Benin', 'BJ'),
  ('Togo', 'TG'),
  ('Guinée', 'GN'),
  ('Guinea', 'GN'),
  ('Niger', 'NE'),
  ('Mauritanie', 'MR'),
  ('Mauritania', 'MR'),
  ('Guinée-Bissau', 'GW'),
  ('Guinea-Bissau', 'GW'),
  ('Cap-Vert', 'CV'),
  ('Cape Verde', 'CV'),
  ('Gambie', 'GM'),
  ('The Gambia', 'GM'),
  ('Ghana', 'GH'),
  ('Nigeria', 'NG'),
  ('Liberia', 'LR'),
  ('Sierra Leone', 'SL'),
  ('Kenya', 'KE'),
  ('Ouganda', 'UG'),
  ('Uganda', 'UG'),
  ('Tanzanie', 'TZ'),
  ('Tanzania', 'TZ'),
  ('Éthiopie', 'ET'),
  ('Ethiopia', 'ET'),
  ('Érythrée', 'ER'),
  ('Eritrea', 'ER'),
  ('Djibouti', 'DJ'),
  ('Somalie', 'SO'),
  ('Somalia', 'SO'),
  ('Soudan', 'SD'),
  ('Sudan', 'SD'),
  ('Soudan du Sud', 'SS'),
  ('South Sudan', 'SS'),
  ('Madagascar', 'MG'),
  ('Maurice', 'MU'),
  ('Mauritius', 'MU'),
  ('Seychelles', 'SC'),
  ('Comores', 'KM'),
  ('Comoros', 'KM'),
  ('Mozambique', 'MZ'),
  ('Malawi', 'MW'),
  ('Zambie', 'ZM'),
  ('Zambia', 'ZM'),
  ('Zimbabwe', 'ZW'),
  ('Afrique du Sud', 'ZA'),
  ('South Africa', 'ZA'),
  ('Namibie', 'NA'),
  ('Namibia', 'NA'),
  ('Botswana', 'BW'),
  ('Lesotho', 'LS'),
  ('Eswatini', 'SZ'),
  ('Maroc', 'MA'),
  ('Morocco', 'MA'),
  ('Algérie', 'DZ'),
  ('Algeria', 'DZ'),
  ('Tunisie', 'TN'),
  ('Tunisia', 'TN'),
  ('Égypte', 'EG'),
  ('Egypt', 'EG'),
  ('Libye', 'LY'),
  ('Libya', 'LY'),
  ('France', 'FR'),
  ('Belgique', 'BE'),
  ('Belgium', 'BE'),
  ('Suisse', 'CH'),
  ('Switzerland', 'CH'),
  ('Luxembourg', 'LU'),
  ('Royaume-Uni', 'GB'),
  ('United Kingdom', 'GB'),
  ('Irlande', 'IE'),
  ('Ireland', 'IE'),
  ('Allemagne', 'DE'),
  ('Germany', 'DE'),
  ('Pays-Bas', 'NL'),
  ('Netherlands', 'NL'),
  ('Italie', 'IT'),
  ('Italy', 'IT'),
  ('Espagne', 'ES'),
  ('Spain', 'ES'),
  ('Portugal', 'PT'),
  ('Autriche', 'AT'),
  ('Austria', 'AT'),
  ('Suède', 'SE'),
  ('Sweden', 'SE'),
  ('Norvège', 'NO'),
  ('Norway', 'NO'),
  ('Danemark', 'DK'),
  ('Denmark', 'DK'),
  ('Finlande', 'FI'),
  ('Finland', 'FI'),
  ('Pologne', 'PL'),
  ('Poland', 'PL'),
  ('Russie', 'RU'),
  ('Russia', 'RU'),
  ('Ukraine', 'UA'),
  ('Turquie', 'TR'),
  ('Turkey', 'TR'),
  ('Canada', 'CA'),
  ('USA', 'US'),
  ('United States', 'US'),
  ('Brésil', 'BR'),
  ('Brazil', 'BR'),
  ('Haïti', 'HT'),
  ('Haiti', 'HT'),
  ('Guadeloupe', 'GP'),
  ('Martinique', 'MQ'),
  ('Guyane', 'GF'),
  ('French Guiana', 'GF'),
  ('La Réunion', 'RE'),
  ('Réunion', 'RE'),
  ('Mayotte', 'YT'),
  ('Émirats arabes unis', 'AE'),
  ('United Arab Emirates', 'AE'),
  ('Qatar', 'QA'),
  ('Arabie saoudite', 'SA'),
  ('Saudi Arabia', 'SA'),
  ('Koweït', 'KW'),
  ('Kuwait', 'KW'),
  ('Liban', 'LB'),
  ('Lebanon', 'LB'),
  ('Israël', 'IL'),
  ('Israel', 'IL'),
  ('Chine', 'CN'),
  ('China', 'CN'),
  ('Inde', 'IN'),
  ('India', 'IN'),
  ('Japon', 'JP'),
  ('Japan', 'JP'),
  ('Corée du Sud', 'KR'),
  ('South Korea', 'KR'),
  ('Malaisie', 'MY'),
  ('Malaysia', 'MY'),
  ('Australie', 'AU'),
  ('Australia', 'AU'),
  ('Nouvelle-Zélande', 'NZ'),
  ('New Zealand', 'NZ');
-- END COUNTRY MAP

create temporary table foreign_report (pays text, categorie text, membres int) on commit drop;

-- Déjà localisés AVANT cette exécution (comptés avant l'insertion, jamais modifiés).
insert into foreign_report
select p.country, 'déjà localisé', count(*)
from public.profiles p
join public.member_locations ml on ml.user_id = p.id
where p.account_type = 'member'
  and nullif(btrim(coalesce(p.country, '')), '') is not null
  and p.country <> 'Cameroun'
group by 1, 2;

with candidats as (
  select p.id, p.country,
         (select cm.iso from country_map cm where lower(cm.name) = lower(btrim(p.country)) limit 1) as iso,
         case
           when public.geo_normalize_name(coalesce(p.city, '')) in ('', 'non precisee', 'not specified', 'non renseignee', 'unspecified')
             then null
           else left(btrim(p.city), 120)
         end as ville
  from public.profiles p
  where p.account_type = 'member'
    and nullif(btrim(coalesce(p.country, '')), '') is not null
    and p.country <> 'Cameroun'
    and not exists (select 1 from public.member_locations ml where ml.user_id = p.id)
),
inseres as (
  insert into public.member_locations
    (user_id, country_code, region_id, department_id, arrondissement_id, place_id, free_text_city,
     verification_status, nearby_search_enabled, location_discoverable, display_level, location_consent_at)
  select c.id, c.iso, null, null, null, null, c.ville, 'unverified', true, true, 'city', null
  from candidats c
  where c.iso is not null and c.iso <> 'CM'
  on conflict (user_id) do nothing
  returning user_id
)
insert into foreign_report
select c.country,
       case
         when c.id in (select user_id from inseres) then 'inséré pendant cette exécution'
         when c.iso is null then 'pays non reconnu'
         else 'non inséré'
       end,
       count(*)
from candidats c
group by 1, 2;

select * from foreign_report order by categorie, pays;

commit;
