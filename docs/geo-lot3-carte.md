# Géolocalisation — Lot 3 : carte interactive

## Ce que ça fait
Dans **Découvrir**, le bouton « Voir la carte » ouvre une carte administrative du Cameroun **sans fond de tuiles** :
polygones seuls sur fond crème. Navigation régions → départements → arrondissements (clic ou bouton
« Explorer »), fil d'Ariane, infobulle au survol, légende, zone du membre entourée. MapLibre n'est chargé qu'à
l'ouverture (aucun poids ajouté au Discover fermé).

## Données
- `GET /api/geo/geojson?level=1|2|3[&parent=id]` : **limites seulement** (géométrie simplifiée, 4 décimales),
  publiques, cache CDN long. Aucune donnée de membre, jamais de compte dans le GeoJSON.
- `GET /api/geo/zone-counts?level=…[&parent=id]` : nombre de profils par zone, authentifié, `no-store`.

## Confidentialité des comptes
| Règle | Où |
|---|---|
| Seuil : sous 5 profils, aucun nombre n'est communiqué (« moins de 5 ») | `maskCounts` (serveur) |
| Suppression complémentaire : une seule zone masquée → la plus petite zone visible l'est aussi (anti-différence) | `maskCounts` |
| Seuls comptent les membres ayant activé `location_discoverable` ; le demandeur doit avoir activé `nearby_search_enabled` (sinon aucun compte) | SQL `geo_zone_counts` |
| Mêmes filtres que la découverte : membre approuvé, genre opposé, hors compte système | SQL |
| Aucune coordonnée lue ni renvoyée (seules les colonnes d'appartenance à une zone) | SQL |
| Limitation 60 requêtes / 90 s (persistante, atomique) + 150 zones distinctes / jour | route |
| Fonctions : `search_path` vide, `service_role` seulement | migration |

## Synchronisation liste / carte
La carte **ne permet pas de lister les profils d'une zone arbitraire** : le filtre de la liste reste celui du
Lot 2 (relatif à la zone du demandeur). Sur la carte, la zone du membre est entourée ; le bouton
« Filtrer la liste ici » (ou le clic sur sa zone au niveau arrondissement) règle la portée région / département /
arrondissement ; la portée active est reflétée dans le bouton. Les autres zones affichent un compte seulement.
Lister n'importe quelle zone aurait permis de sonder des individus zone par zone.

## Repli
Si WebGL ou le GeoJSON échoue, un message l'indique et la **liste textuelle des zones** (avec comptes, navigation
et filtre) reste utilisable. Cette liste existe aussi sous la carte comme alternative accessible.

## Attribution (affichée sous la carte)
« Limites administratives : geoBoundaries (CC BY 4.0), simplifiées. Localités : GeoNames, geonames.org (CC BY 4.0) »

## Limites connues
- Rien ne s'affiche tant que les données ne sont pas importées (aucune limite en base).
- Interface non vérifiée dans un navigateur (pas de données importées).
- Les comptes sont avant compatibilité (nombre de profils compatibles par genre, pas par score).
- Poids réel des GeoJSON à mesurer après import (régions ≈ quelques dizaines de Ko attendus).
- Textes FR/EN en dur dans le composant, comme le Lot 2.

## Déploiement
1. SQL Editor : `20261117_geo_map.sql` (après les trois migrations précédentes).
2. Importer les données, déployer. 3. Plus tard : `20261115_geo_guard_profile_location.sql`.
4. Annonce `geo-map` dans `whats-new.ts` : `active: false` jusqu'à la mise en ligne réelle.
