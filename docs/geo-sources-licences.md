# Géolocalisation — sources de données et licences

> **Statut : à renseigner à l'import réel.** Aucune donnée géographique n'est livrée dans le dépôt. Ce
> tableau est rempli (et daté) lors de l'exécution de `scripts/geo/import-cameroon.mjs --apply`, à partir
> de la licence **lue sur le fichier réellement téléchargé** et recopiée dans `meta.json`. La licence
> n'est jamais déduite de la plateforme qui héberge le fichier. Le script refuse de continuer si
> `source`, `url`, `version`, `license` ou `retrievedAt` manque.

## Sources effectivement utilisées (état au 2026-11-14)

| Couche | Fichier | Licence | Statut |
|---|---|---|---|
| Limites ADM1-ADM3 | `public/geo/cameroun-{regions,departements,arrondissements}.geojson` (format geoBoundaries) | CC BY 4.0 | **Confirmée par le propriétaire du projet** (une première mention « MIT » a été corrigée). Version et date de téléchargement exactes non connues : à compléter. |
| Localités | `public/geo/CM.txt` (GeoNames) | CC BY 4.0 | Lue dans `public/geo/readme.txt` (fichier réel). |

Les deux sont CC BY 4.0 : usage commercial et modification permis **sous attribution**, avec mention des
modifications (simplification des géométries, fusion de deux polygones homonymes, réparation des accents).
Métadonnées d'import : `scripts/geo/meta.cameroun.json`.

**Attribution à afficher (carte et page « à propos »)** : « Limites administratives : geoBoundaries
(CC BY 4.0), simplifiées. Localités : GeoNames, geonames.org (CC BY 4.0). » — à ajouter à l'interface avec la
carte (Lot 3).

## Sources candidates (à vérifier fichier par fichier)

| Couche | Source candidate | Licence attendue (À VÉRIFIER sur le fichier) | Usage commercial | Remarques |
|---|---|---|---|---|
| ADM0-ADM3 (limites) | OCHA COD-AB CMR — https://data.humdata.org/dataset/cod-ab-cmr | CC BY-IGO (à confirmer) | À confirmer | Source prioritaire si ADM3 présent. |
| Contrôle croisé | geoBoundaries `gbOpen` CMR ADM1-ADM3 | CC BY 4.0 (à confirmer) | Oui sous attribution | Les collections `gbHumanitarian` / `gbAuthoritative` ont d'AUTRES conditions : ne pas les mélanger. |
| Validation | UN SALB — https://salb.un.org/en/data/cmr | À confirmer | À confirmer | Sert au contrôle (10 régions, noms). |
| Hiérarchie / noms | open-admin-data/cameroon-administrative-divisions | À confirmer | À confirmer | Alias et relations parent-enfant. |
| Localités | GeoNames `CM.txt` | CC BY 4.0 (à confirmer) | Oui sous attribution | OSM (ODbL, partage à l'identique) volontairement écarté par défaut. |

## Métadonnées conservées en base
`geo_admin_units` et `geo_places` portent `source`, `source_url`, `source_version`, `license`, `retrieved_at`.
`geo_import_runs` consigne chaque exécution (statistiques, anomalies, conflits).

## Attribution à afficher
À compléter avec le texte exigé par chaque licence confirmée (carte, page « à propos »). Aucune attribution
n'est inventée tant que la licence n'est pas confirmée.

## Droits de modification / redistribution
La simplification des géométries (affichage) est une modification : vérifier que chaque licence l'autorise
(CC BY et CC BY-IGO l'autorisent sous attribution et mention des modifications). La géométrie originale est
conservée (`geom`) à côté de la version simplifiée (`geom_simplified`).

## Procédure d'import
1. Télécharger les fichiers dans un dossier vide, hors dépôt (ex. `~/geo-import/`).
2. Écrire `meta.json` (voir l'en-tête du script).
3. `node scripts/geo/import-cameroon.mjs --dir ~/geo-import` (dry-run : valide, ne touche pas à la base).
4. `SUPABASE_DB_URL=… node scripts/geo/import-cameroon.mjs --dir ~/geo-import --apply`.
5. Relancer est sans danger (upsert sur `(country_code, level, code)` et `(source, source_id)`). Une unité
   marquée `validated = true` n'est jamais écrasée : le conflit est consigné dans `geo_import_runs.conflicts`.
