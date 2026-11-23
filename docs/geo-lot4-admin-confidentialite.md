# Géolocalisation — Lot 4 : administration et confidentialité avancée

## Admin → Membres & Coachs → Géographie (`/admin/geographie`)
- **Référentiel importé** : nombre d'unités par niveau (régions, départements, arrondissements), géométries
  présentes/simplifiées, localités vérifiées / à valider / rejetées.
- **Sources, versions, licences** : lues dans la base (celles de l'import). Une version ou une licence absente
  s'affiche « non renseignée » (cas actuel de la version geoBoundaries).
- **Derniers imports** : mode (simulation / appliqué), anomalies, conflits signalés (données validées jamais écrasées).
- **Incohérences** : unités sans parent ou au mauvais niveau, sans géométrie ou invalides, localités mal rattachées
  ou « vérifiées » sans arrondissement.
- **Localités à valider** : recherche, rattachement à un arrondissement, valider, rejeter, rouvrir. Une localité n'est
  « vérifiée » qu'avec un arrondissement. Chaque action est journalisée (`admin_audit_log`, action `geo_place_updated`).
- **Membres localisés (totaux)** : localisation renseignée, discoverable, recherche activée, non vérifiée, niveaux
  d'affichage, et par région (membres discoverable seulement, masqué sous 5).

**Ce que l'admin ne voit jamais** : coordonnées, localisation individuelle d'un membre, liste de membres par zone.
Aucune colonne géographique n'a été ajoutée à l'export Excel ni à `profiles`.

## Confidentialité avancée côté membre (Profil → Localisation)
- Depuis le 2026-11-23 : rapprochement par ville automatique (plus de cases « recherche par zone » / « apparaître
  dans les recherches ») ; seul réglage : « Ne pas afficher » / « Afficher ma ville ». Voir `docs/geo-lot2-decouverte.md`.
- **Télécharger mes données de localisation** : `GET /api/member/location/export` (JSON : noms lisibles, réglages,
  historique de mes changements ; aucun identifiant interne ni coordonnée).
- **Supprimer ma localisation** : `DELETE /api/member/location` supprime la ligne privée ET l'historique ; effet immédiat
  (plus de recherches, plus de comptes) ; `profiles.city` redevient l'étiquette générique, le pays est conservé.
  Le matching et le profil ne changent pas.

## Garde-fous automatiques (`private-access.test.ts`)
- `member_locations` n'est référencée que par le code serveur prévu ; jamais par le matching, l'admin, l'export ou un
  composant navigateur ; les fonctions `geo_*` privées non plus.
- Le moteur de matching n'importe aucun module géographique privé.
- L'export Excel n'a aucune colonne géographique détaillée.

## Limites connues
- Aucun système de blocage entre membres n'existe dans l'application : rien à brancher côté géographie.
- Alias de localités non éditables depuis l'admin (non utilisés par la recherche actuelle).
- La purge automatique de l'historique n'est pas programmée : l'historique est supprimé à la demande du membre.
- Interface admin non vérifiée dans un navigateur (pas de données importées).

## Déploiement
1. SQL Editor : `20261118_geo_admin.sql` (après `20261117_geo_map.sql`).
2. Déployer. L'entrée « Géographie » apparaît dans le menu admin.
3. Plus tard : `20261115_geo_guard_profile_location.sql`.
