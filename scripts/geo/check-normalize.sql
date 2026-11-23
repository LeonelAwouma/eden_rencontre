-- Contrôle de conformité : public.geo_normalize_name doit donner exactement les mêmes résultats que
-- normalizePlaceName (src/lib/geo/normalize.ts). Mêmes cas que src/lib/geo/normalize.cases.ts.
-- Lecture seule. À exécuter dans le SQL Editor après 20261123_geo_resolve_city.sql : toutes les lignes doivent
-- afficher ok = true (le dictionnaire unaccent d'une instance peut différer du dictionnaire standard).
select input, expected, public.geo_normalize_name(input) as got, public.geo_normalize_name(input) = expected as ok
from (values
  ('Yaoundé', 'yaounde'),
  ('YAOUNDE', 'yaounde'),
  ('  Yaoundé  ', 'yaounde'),
  ('Yaoundé' || chr(160) || 'Centre', 'yaounde centre'),
  ('Yaoundé' || chr(8239) || 'Centre', 'yaounde centre'),
  ('N’Gaoundéré', 'n''gaoundere'),
  ('N`Gaoundéré', 'n''gaoundere'),
  ('Extrême-Nord', 'extreme nord'),
  ('Bafoussam / Mifi', 'bafoussam mifi'),
  ('Ébolowa', 'ebolowa'),
  ('Cœur', 'coeur'),
  ('Æther', 'aether')
) as t(input, expected)
order by ok, input;

-- Résolution de la capitale : une seule localité attendue, de type « city ».
select * from public.geo_resolve_city('Yaoundé', 'CM');
select * from public.geo_resolve_city(' yaounde ', 'CM');
