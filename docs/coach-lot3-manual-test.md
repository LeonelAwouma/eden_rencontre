# Lot 3 — séances, notes privées, comptes rendus partagés, plan d'action : test manuel

> **Rien de ce document n'a été exécuté.** Les tests automatisés (Vitest, Node) utilisent un faux client Supabase et une
> **simulation en mémoire** des fonctions SQL : ils prouvent la logique des routes (accès, erreurs, audit, DTO,
> confidentialité), **pas** le comportement réel de Postgres (triggers, verrous consultatifs, contraintes, RLS) ni celui
> du navigateur. Tout ce qui suit exige un **projet Supabase de développement** et un **navigateur**.
> Ne jamais coller un jeton, une clé ou le contenu d'une note dans un ticket, un chat ou un rapport.

## 0. Préparation (projet de DÉVELOPPEMENT uniquement)

1. Vérifier que `20261107_coach_hardening.sql` et `20261108_coach_assignments.sql` sont appliquées.
2. Appliquer **à la main**, dans le SQL Editor, `supabase/migrations/20261110_coach_sessions_notes.sql` (jamais exécutée par le dépôt).
3. Vérifier (lecture seule) :
   - `select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('coach_sessions','coach_notes','coach_shared_reports','coach_action_items');` → `rowsecurity = true` pour les quatre ;
   - droits d'exécution : seules `coach_schedule_session`, `coach_reschedule_session`, `coach_postpone_session`, `coach_transition_session`, `coach_update_action_status` sont accordées, et **à `service_role` uniquement** ;
   - depuis un client `authenticated` (jeton de membre, via l'API REST du projet), `select` sur ces quatre tables → refusé ou vide.
4. Préparer : un Coach actif **C1**, un second Coach **C2**, trois membres approuvés **M1**, **M2**, **M3** ; attribuer M1 et M3 à C1 (consentement accepté côté membre), laisser M2 en proposition **en attente**, attribuer un membre **M4** à C2.

## 1. Parcours principal

| # | Action | Résultat attendu |
|---|---|---|
| 1 | C1 → **Rendez-vous** → « Nouvelle séance » : M1, « Accompagnement individuel », demain 10:00, fuseau du navigateur, 60 min, sujet « Premier échange ». | Séance « Programmée » dans la liste ; le sélecteur de membre ne propose **que M1 et M3** (ni M2, ni M4). |
| 2 | M1 → tableau de bord → carte « Mon accompagnement ». | La séance apparaît dans « Prochaine séance » (heure du navigateur, et celle de la séance si le fuseau diffère). Aucun bouton de modification. |
| 3 | C1 tente de planifier une seconde séance **chevauchant** la première (même créneau, M3). | Refus : « Une autre séance programmée occupe déjà ce créneau ». |
| 4 | **Reprogrammer** la séance au surlendemain. | **Même** séance, nouvel horaire, statut « Programmée ». |
| 5 | **Reporter** la séance. | L'ancienne passe à « Reportée » et un lien « Voir la nouvelle séance » apparaît ; une **nouvelle** séance « Programmée » existe. |
| 6 | Planifier une séance dans **6 minutes** (la création accepte jusqu'à 5 min de retard, jamais plus), attendre qu'elle ait commencé, puis « Marquer comme réalisée ». | Statut « Réalisée ». Avant le début, le bouton est désactivé et l'API répond 409 (`not_started`). |
| 7 | Fiche M1 → **Notes privées** → ajouter une note rattachée à la séance réalisée. | Note visible par C1 uniquement. Le message « Strictement privées » est affiché. |
| 8 | Fiche M1 → **Compte rendu partagé** → créer un brouillon, rattaché à la séance, puis « Publier ». | « Publier » est désactivé tant que le titre ou le résumé est vide. Après publication : badge « Publié ». |
| 9 | M1 → carte « Mon accompagnement ». | Le compte rendu **publié** apparaît (jamais le brouillon, jamais les notes privées). |
| 10 | C1 → « Dépublier ». M1 recharge. | Le compte rendu a **disparu** de l'espace de M1 immédiatement. Republier pour la suite. |
| 11 | C1 → fiche M1 → **Plan d'action** → ajouter une action dont **le membre** est responsable, échéance dans 3 jours. | Statut « À faire ». |
| 12 | M1 → « Commencer » puis « Terminer ». | « En cours » puis « Terminée » (avec la date). Le membre ne voit **aucun** bouton « Annuler » ni champ de saisie libre. |
| 13 | C1 → **Comptes rendus** → onglet « Plan d'action ». | L'action apparaît « Terminée » ; le Coach peut la rouvrir (« En cours »). |
| 14 | **M1 retire son consentement** (« Arrêter l'accompagnement »). | **C1** : fiche M1, séances, notes, comptes rendus et actions de M1 → « introuvable » immédiatement ; M1 disparaît du sélecteur ; les séances de M1 ne sont plus comptées au tableau de bord. **M1** : conserve son historique de séances (réalisée, annulée, reportée, absence), ses comptes rendus publiés et ses actions ; les séances « Programmées » sont masquées. |
| 15 | Contrôle des données en base (SQL Editor, `service_role`) : les lignes de C1 pour M1 existent toujours (historique conservé). | Oui. |

## 2. Contrôles de sécurité (à jouer avec des jetons réels, hors interface)

Avec le jeton de **C2** (Coach actif sans lien avec M1) : `GET /api/coach/sessions/<id d'une séance de C1>`, `PATCH`, `GET /api/coach/members/<M1>/notes`,
`PATCH /api/coach/notes/<id>`, `PATCH /api/coach/reports/<id>`, `PATCH /api/coach/actions/<id>` → **404 identique** à un identifiant inexistant.
Avec le jeton de **M1** : toutes les routes `/api/coach/*` → **403** ; avec le jeton de **C1** : `/api/member/coach/*` → **401**.
`PATCH /api/coach/sessions/<id>` avec `{"scheduled_at": …}`, `{"status": "completed"}`, `{"coach_id": …}` → **400**, rien n'est modifié.

### Garde SQL (même sous `service_role`) — à tester dans le SQL Editor, rôle `service_role`
| Tentative | Attendu |
|---|---|
| `insert into coach_sessions …` directement | exception `coach_session_direct_write` |
| `update coach_sessions set scheduled_at = … where id = …` | exception `coach_session_direct_change` |
| `update coach_sessions set status = 'cancelled' …` | exception `coach_session_direct_change` |
| `update coach_sessions set coach_id = …` | exception `coach_session_immutable_link` |
| `insert into coach_notes (…, session_id = <séance d'un autre membre>)` | exception `coach_content_session_mismatch` |
| `insert into coach_action_items (…, status = 'done')` | exception `coach_action_must_start_todo` |
| `update coach_action_items set status = 'done' …` | exception `coach_action_direct_status_change` |
| `update coach_notes set session_id = …` | exception `coach_content_immutable_link` |
| `select coach_schedule_session(<C1>, <M1>, 'couple', …)` | exception `bad_type` |
| `select coach_schedule_session(…, p_duration => 17, …)` | exception `bad_duration` |
| deux appels simultanés de `coach_schedule_session` sur le même créneau (deux sessions SQL) | un seul réussit, l'autre `overlap` |
| deux coachs, **même membre**, même créneau, simultanés | un seul réussit (verrou sur le membre) |
| `select coach_update_action_status('member', <M1>, <action du coach>, 'done')` | `not_owner` |
| `select coach_update_action_status('member', <M1>, <action du membre>, 'cancelled')` | `invalid_transition` |

## 3. Fuseaux et changements d'heure
- Séance saisie « 02:30 » le **dernier dimanche d'octobre** en `Europe/Paris` → l'interface propose **les deux occurrences** (première / seconde) ; sans choix, l'envoi reste bloqué.
- Séance saisie « 02:30 » le **dernier dimanche de mars** en `Europe/Paris` → « Cette heure n'existe pas ce jour-là ».
- Même heure en `Africa/Douala` → acceptée sans question.
- Changer de fuseau d'affichage du navigateur (DevTools → Sensors) : l'heure affichée change, l'instant reste le même.

## 4. Tests non réalisés (à ne pas présenter comme faits)
Tous les parcours ci-dessus ; le comportement réel des triggers, des verrous consultatifs et de la RLS ; le rendu mobile ; l'accessibilité (clavier, lecteur d'écran) ; le comportement multi-onglets ; la charge.

## 5. Hors périmètre de ce lot (décisions)
Lien de visioconférence / Google Meet (reporté), séances de couple (retirées), messagerie Coach-Membre (retirée : l'échange se fait uniquement par visio), notifications push ou e-mail vers le membre, statistiques administrateur, ressources, supervision (lot 4).
