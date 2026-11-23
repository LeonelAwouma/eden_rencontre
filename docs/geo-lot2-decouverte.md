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
| Rapprochement par ville automatique : `nearby_search_enabled` et `location_discoverable` valent toujours `true` dès qu'une ville est enregistrée (décision du 2026-11-23) | `saveMemberLocation` + migration 20261123 |
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

## La ville suffit (2026-11-23)
Le membre ne saisit que sa ville (« Yaoundé ») : une seule recherche, des suggestions qui ne montrent que le nom
de la ville, ou une saisie libre. Il ne voit jamais d'arrondissement, de département ni de région.

Côté serveur (`saveMemberLocation`) : si aucun identifiant n'est fourni, la ville est cherchée par
**correspondance exacte** (nom officiel ou alias, normalisation commune) avec `geo_resolve_city`, puis
`resolvePlaceFromCandidates` décide : une seule localité → retenue ; plusieurs dont une seule ville → retenue ;
plusieurs villes, plusieurs villages sans ville ou plus de 50 résultats → ambigu ; rien → aucune. Ambigu, inconnu
ou référentiel indisponible : la ville reste en texte libre, sans jamais bloquer l'inscription.

> **Rattachement administratif indicatif.** L'arrondissement, le département et la région sont déduits
> automatiquement à partir du point de référence géographique de la localité dans le référentiel GeoNames.
> Ce traitement ne nécessite aucune autorisation de géolocalisation personnelle et ne collecte aucune coordonnée GPS
> du membre. L'arrondissement obtenu représente uniquement le rattachement administratif du point de référence de la
> ville. Il ne constitue pas une vérification du lieu de résidence réel du membre.

Conséquence : à Yaoundé et Douala, tous les membres sont rattachés au même arrondissement (celui du centre-ville) ;
« même arrondissement » s'y comporte comme « même ville ».

## Réglages du membre (Profil → Localisation)
- **Rapprochement par ville : automatique**, sans case à cocher ni réglage admin. Une ville renseignée sert à
  chercher et à être rapproché des membres de la même ville. Le score de compatibilité n'est jamais modifié.
- **Localisation affichée sur mon profil** : « Ne pas afficher » (par défaut) ou « Afficher ma ville ». Un ancien
  niveau (région, département…) reçu par le serveur est ramené à « Ne pas afficher ».
- « Supprimer ma localisation » reste disponible : le membre n'est alors plus rapproché par ville.

## Rattrapage des membres inscrits avant l'outil
`scripts/geo/backfill-members-preview.sql` (lecture seule) puis `scripts/geo/backfill-members-apply.sql`
(rejouable, `on conflict do nothing`). Même règle de résolution ; `display_level = city` (leur ville était déjà
publique). Rapport par ville : inséré / déjà structuré / déjà en texte libre / ambigu / non reconnu. Les lignes
existantes en texte libre sont hors périmètre (réparation distincte, sans toucher à leur affichage ni à leur historique).

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
4. Ville seule (2026-11-23) : `20261123_geo_resolve_city.sql`, puis `scripts/geo/check-normalize.sql` (toutes les
   lignes `ok = true`), puis l'aperçu et l'insertion du rattrapage. Déployer l'application avec ou après la migration.
