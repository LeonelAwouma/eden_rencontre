# Géolocalisation — Lot 2 : découverte géographique

## Ce que ça fait
Dans **Découvrir**, un sélecteur « Où chercher ? » (aucune restriction, même ville, même arrondissement,
même département, même région, rayons 25 / 50 / 100 / 250 km, partout dans mon pays), un tri
« Compatibilité / Proximité » et l'option « Inclure les profils sans localisation ».

**Sans portée choisie, le Discover est strictement inchangé** (aucun appel réseau supplémentaire, même liste,
même classement). La géographie ne modifie jamais un pourcentage de compatibilité : elle filtre et classe des
profils que le moteur existant a déjà jugés compatibles (score ≥ 60).

## Chaîne de traitement
1. `GET /api/discover/geo` (membre approuvé ; identité = jeton) → fonction SQL `geo_candidates_in_scope`.
2. Le serveur **expurge** chaque ligne (`toPublicCandidate`) : seuls `userId`, catégorie de distance et libellé
   de zone autorisé sortent. Aucune coordonnée, aucune distance exacte.
3. Le navigateur charge les profils **par identifiant** (`listMembersByIds`, mêmes colonnes et même RLS que
   `listMembers`) — la fenêtre des 200 membres récents ne limite donc plus le filtre — puis applique le
   classement de compatibilité existant, puis le tri géographique secondaire (`orderForDiscover`).
4. Pagination : pages de 100 côté serveur, jusqu'à 1000 profils côté navigateur ; au-delà l'interface dit
   « affinez la portée » (aucune troncature silencieuse).

## Règles de confidentialité appliquées côté serveur
| Règle | Où |
|---|---|
| Le demandeur doit avoir activé « utiliser ma localisation pour chercher » (`nearby_search_enabled`) | SQL + route |
| Un membre n'apparaît que s'il a activé `location_discoverable` | SQL |
| `display_level` = `none` : ni ville, ni zone, ni distance | `toPublicCandidate` |
| Catégorie de distance seulement pour les niveaux département / arrondissement / ville | `toPublicCandidate` |
| « Même ville » seulement au niveau ville (département / arrondissement : « < 25 km ») | `toPublicCandidate` |
| Distances en catégories (même ville, < 25, 25–50, 50–100, 100–250, > 250 km) | `distanceBand` |
| Rayon minimal 25 km (aucun rayon plus fin) | `parseScope` + SQL |
| Ordre de sortie neutre (jamais trié par distance) | SQL |
| Non localisés : catégorie distincte, sans ville ni distance, après les localisés | route + UI |
| Limitation 30 requêtes / minute, atomique, persistante, partagée entre instances | `geo_rate_limit_hit` |
| Plafond de 40 portées distinctes par jour | `geo_scope_hit` |
| Réponses jamais mises en cache (`private, no-store`) → une révocation agit au prochain appel | route |
| Fonctions : `search_path` vide, exécution `service_role` seulement | migration |

## Réglages du membre (Profil → Localisation)
Trois réglages **indépendants**, désactivés par défaut, appliqués immédiatement (`PATCH /api/member/location`) :
utiliser ma localisation pour chercher · autoriser mon profil à apparaître dans les recherches des autres ·
niveau d'affichage. Le texte explique que la présence dans une zone peut être révélée même si la ville et la
distance sont masquées. Refuser de partager n'empêche rien d'autre.

## Limites connues
- **Verrou de formation** : la route le rejoue (pilier 1 lu dans `profiles.formation_completed`, motif
  `viewer_formation_locked`). Cette progression est déclarée par le membre : c'est le même niveau de garantie
  que le Discover. La **complétude du profil** reste contrôlée côté interface seulement.
- **Compte du demandeur sans localité** : les rayons et « même ville » exigent une localité du référentiel ;
  sinon un message l'invite à préciser sa ville (région/département/pays restent possibles s'ils sont connus).
- **Ville masquée** : voir `docs/geo-matching-impact.md` (critère de pays à la place de « même ville »).
- Le filtre « Près de moi » (pays seul) est remplacé par la portée « Partout dans mon pays ».
- Textes de l'interface géographique en dur (FR/EN dans les composants) ; à migrer vers `locales/*.json`
  si l'équipe préfère un fichier unique.

## Déploiement
1. SQL Editor : `20261116_geo_discovery.sql` (après les deux migrations du Lot 1).
2. Déployer l'application. 3. Plus tard : `20261115_geo_guard_profile_location.sql`.
