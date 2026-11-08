# Lot 2 Coach — parcours de test manuel (projet Supabase DE DÉVELOPPEMENT uniquement)

> **Rien de ce document n'a été exécuté par l'implémentation.** Les tests automatisés (Vitest) utilisent un faux
> client : ils ne remplacent pas ce parcours dans un navigateur, avec une vraie base.
> Ne jamais l'exécuter sur la production. Aucun secret ne doit être copié dans un ticket ou un journal.

## Prérequis
- Projet Supabase de **développement** séparé, avec ces migrations déjà passées par vous, dans l'ordre :
  `20261024_coach_accounts` → `20261024_coach_dual_access` → `20261107_coach_hardening` → `20261108_coach_assignments`.
  (`docs/coach-lot1-dev-test.md` décrit les contrôles SQL de ces migrations.)
- Deux membres de test **approuvés** (`member_a`, `member_b`) et un administrateur.
- `npm run dev` (port 9002) pointé sur ce projet. Deux navigateurs (ou profils) : un pour l'administration/le coach, un pour le membre.

## Parcours (15 étapes) — résultat attendu entre parenthèses
1. **Créer un coach** : Admin → Utilisateurs → Coachs → « Ajouter un coach » (e-mail + mot de passe de 12 caractères, lettres et chiffres).
   *(Compte créé. En cas d'échec voir « Diagnostic de création » ci-dessous.)*
2. **Attribuer un membre** : sur la ligne du coach, « Membres » → rechercher `member_a` (la recherche ne propose aucun coach) → « Attribuer ».
   *(Proposition « en attente du membre » dans la liste ; le membre n'est PAS visible côté coach.)*
3. **Ouvrir le tableau de bord membre** avec `member_a`. *(Une carte « Un accompagnement vous est proposé » apparaît entre l'invitation aux notifications et les nouveautés.)*
4. **Vérifier l'identité du coach dans la proposition.** *(Le nom d'affichage du coach est affiché — jamais son e-mail ni son téléphone ; un monogramme tient lieu d'avatar.)*
5. **Accepter le suivi** (« Accepter »). *(Message « Accompagnement accepté », la carte passe à « Votre accompagnement » ; un double clic n'envoie qu'une requête.)*
6. **Vérifier l'état actif.** *(Nom du coach, date de consentement, bouton « Arrêter l'accompagnement ».)*
7. **Ouvrir `/coach`** avec le coach (connexion e-mail : il arrive directement sur `/coach`). *(Cartes : 1 membre accompagné, 0 proposition ; « Derniers membres accompagnés » contient `member_a` ; activité récente : « Un membre a accepté votre accompagnement » — sans pseudo.)*
8. **Vérifier `/coach/members`.** *(`member_a` listé ; recherche par pseudo, filtres, actualisation fonctionnent ; état vide si aucun résultat.)*
9. **Ouvrir `/coach/members/[id]`.** *(Pseudo, avatar, pays et ville, dates d'attribution et de consentement, progression par pilier ; mentions « non disponible » pour quiz, réflexions et positions de lecture ; bandeau « séances et comptes rendus bientôt ». Aucune adresse e-mail, aucun téléphone, aucun nom réel, aucun selfie.)*
10. **Vérifier `/coach/formation`.** *(Agrégats par pilier et une ligne par membre ; titres de leçons en français.)*
11. **Retirer le consentement** depuis le compte membre (« Arrêter l'accompagnement » → confirmer). *(Message « Accompagnement arrêté ».)*
12. **Actualiser côté coach** (sans se reconnecter). *(Le membre a disparu de `/coach/members`, du tableau de bord et de `/coach/formation` ; rouvrir sa fiche donne « Membre introuvable » — même message qu'un identifiant inexistant.)*
13. **Contrôles complémentaires** (dans une fenêtre privée / après un nouvel essai d'attribution) :
    - refuser une nouvelle proposition (« Refuser ») : le compteur « Propositions en attente » du coach repasse à 0, sans qu'aucune identité ne soit apparue ;
    - basculer la langue FR ↔ EN dans l'espace coach et sur la carte membre : aucune clé brute (`coachNav.…`) ne doit s'afficher.
14. **Suspendre le coach** : Admin → Coachs → « Suspendre ».
15. **Vérifier que toutes ses pages et API refusent** : dans la session du coach, recharger `/coach` (→ déconnexion puis `/login`, message de compte suspendu) ; avec l'ancien jeton, `/api/coach/dashboard`, `/api/coach/members`, `/api/coach/members/<id>`, `/api/coach/formation`, `/api/coach/profile`, `/api/coach/notifications` répondent **403**.

## Diagnostic de création de coach (indépendant du lot 2)
Message historique : « Création impossible : adresse déjà utilisée ou identifiants invalides. » — il masquait **toute** erreur de Supabase Auth.
Depuis ce correctif, la création renvoie un **code stable** et un message sûr, affichés dans l'écran Admin → Coachs (le code apparaît sous le message : « Code : … »).
Le message brut de Supabase n'est **ni renvoyé ni journalisé** (il peut contenir des données personnelles) ; le journal serveur
(`[admin/coaches] createUser refusé`) ne garde que `code`, `name`, `status` et le code API calculé, jamais le mot de passe, l'adresse ni une clé.

| Code affiché | HTTP | Signification | Que faire |
|---|---|---|---|
| `email_exists` | 409 | Adresse déjà utilisée par un compte (membre ou autre). Le code ne promeut ni n'écrase jamais un compte existant. | Utiliser une autre adresse (vérifier Supabase → Authentication → Users). |
| `weak_password` | 422 | Mot de passe refusé par la politique d'Auth (longueur, caractères, mots de passe compromis). | Mot de passe plus long et aléatoire. |
| `invalid_email` | 400 | Adresse refusée par le service d'authentification. | Corriger l'adresse. |
| `auth_validation_failed` | 400 | Validation générique d'Auth (≠ adresse invalide). | Vérifier les champs saisis. |
| `email_provider_disabled` | 500 | Fournisseur e-mail désactivé. | Supabase → Authentication → Providers → Email. |
| `supabase_admin_auth_rejected` | 500 | L'authentification **serveur** auprès de Supabase est refusée (`bad_jwt`, `no_authorization`, `not_admin`, ou 401/403 sans code). | Vérifier dans Vercel la clé réellement configurée (ancienne clé `service_role` ou nouvelle clé secrète `sb_secret_`), surtout après une rotation ; redéployer. **Aucune rotation n'est faite par le code.** |
| `auth_rate_limited` | 429 | Trop de requêtes vers Auth. | Réessayer dans quelques minutes. |
| `auth_internal_error` | 502 | Erreur interne d'Auth ou réseau. Elle peut venir d'un déclencheur ou d'un objet de base. | Consulter les journaux Auth **et** base de données de Supabase. |
| `auth_create_failed` | 502 | Cause non identifiée (code inconnu). | Consulter les journaux serveur (`code`, `name`, `status`). |
| `server_misconfigured` | 500 | Variables d'environnement Supabase absentes côté serveur. | Vérifier `NEXT_PUBLIC_SUPABASE_URL` et la clé serveur dans Vercel. |

Vérifications sans modifier le code : journaux Vercel (filtre « createUser refusé »), Supabase → Authentication → Users,
essai avec une adresse jamais utilisée et un mot de passe long avec symboles, politique de mot de passe (« leaked passwords »).
Le rollback d'une création partielle est **compensatoire, non transactionnel** entre Auth et PostgreSQL : si `deleteUser()` échoue
aussi pendant l'annulation, un compte Auth orphelin peut subsister (le code ne le garantit pas).

## Déconnexion et renouvellement de session (lots B et C) — parcours manuels

> Aucun de ces parcours n'a été exécuté : les tests automatisés (Vitest, Node) utilisent un faux service d'authentification et le vrai package
> `@supabase/auth-js` 2.108.2 avec `fetch` simulé. **Aucun n'a été joué dans un navigateur ni sur Supabase.** Tous exigent un **projet Supabase de
> développement** ET un **navigateur** (DevTools → Application → Cookies / Local Storage / Network ; deux profils de navigateur pour le parcours 10).
> Ne jamais copier un jeton dans un ticket, un chat ou un rapport.

### Préparation (une seule fois, projet de DÉVELOPPEMENT)
1. Appliquer à la main `supabase/migrations/20261109_session_is_active.sql` (jamais exécutée par le dépôt).
2. Vérifier la fonction dans SQL Editor : `public.session_is_active(uuid)` existe ; son propriétaire peut lire `auth.sessions` ; noter si `auth.sessions` possède une colonne `not_after`
   (`select column_name from information_schema.columns where table_schema='auth' and table_name='sessions'`). Vérifier les droits : `anon` et `authenticated` ne doivent PAS pouvoir l'exécuter.
3. Ne **pas** définir `COACH_REQUIRE_ACTIVE_SESSION=true` avant d'avoir validé les parcours 5 et 11 : tant que le comportement réel de `auth.sessions` après
   `admin.signOut(jwt, "local")` n'est pas constaté, l'invalidation immédiate n'est **pas garantie**.

### Parcours
1. **Connexion membre et déconnexion.** Se connecter par e-mail/mot de passe, ouvrir `/dashboard`, « Se déconnecter ». *(Retour sur `/login` ; aucun bandeau d'avertissement ; DevTools : `sb-access-token` et `sb-refresh-token` supprimés, entrée `sb-…-auth-token` du Local Storage absente.)*
2. **Connexion Google et déconnexion.** Se connecter avec Google. *(Aucun cookie `sb-access-token` n'existe : session navigateur seule. Après déconnexion : retour `/login`, aucun avertissement — la branche cookie vaut `no_cookie`, la branche navigateur `revoked`.)* Vérifier dans la réponse du DELETE (Network → Response) : `legs.cookie = "no_cookie"`, `legs.bearer = "revoked"`, `confirmed = true`.
3. **Connexion Coach et déconnexion.** *(Deux sessions existent (A cookie du login, B navigateur) : `legs.cookie` et `legs.bearer` valent `revoked` — ou `deduplicated: true` si une synchronisation a déjà remplacé le cookie par le jeton de B.)*
4. **Déconnexion suivie d'un rechargement direct de `/coach`.** *(Redirection vers `/login?next=%2Fcoach` ; aucun contenu Coach rendu.)*
5. **Tentative d'accès à une API avec l'ancien JWT.** Avant de se déconnecter, copier l'`Authorization: Bearer …` d'une requête du Network ; se déconnecter ; rejouer la requête (curl, depuis une machine de test) sur :
   - une API **Coach** (`/api/coach/dashboard`) ;
   - une API **partagée** (`/api/coach-notifications`) ;
   - une API **membre** (`/api/member/coach` avec un jeton de membre).
   *Résultat à CONSTATER, non à supposer.* Sans `COACH_REQUIRE_ACTIVE_SESSION` : l'ancien access token reste normalement valide jusqu'à son expiration (≤ 1 h) partout. Avec le drapeau activé **et** la migration appliquée : refus attendu sur les routes Coach et partagées (côté Coach) ; les routes **membres** acceptent toujours le jeton jusqu'à expiration (limite assumée). Noter ce qui est réellement observé.
6. **Déconnexion pendant une coupure réseau.** DevTools → Network → « Offline », puis « Se déconnecter ». *(La session locale est effacée ; la page `/login` affiche « Déconnexion locale effectuée, révocation serveur non confirmée » ; aucune annonce de déconnexion complète ; le bouton « Réessayer » est désactivé tant que le navigateur est hors ligne.)*
7. **Retour du réseau et nouvelle tentative.** Repasser « Online », cliquer « Réessayer ». *(Une seule requête. Selon la présence des cookies de nouvelle tentative (≤ 120 s) : confirmation (« Le serveur a confirmé… ») ou avertissement conservé. Attendre plus de 2 minutes avant de réessayer : la révocation reste **non confirmée** — l'absence des cookies ne prouve rien.)*
8. **Mise en veille prolongée puis reprise.** Ouvrir `/coach`, mettre l'ordinateur en veille > 1 h, reprendre. *(Au retour de l'onglet : une synchronisation (`POST /api/auth/session`) renouvelle le cookie ; recharger `/coach` ne renvoie pas vers la connexion. Si le coach a été suspendu pendant la veille : le POST répond 403, la page se rafraîchit côté serveur et le message de suspension apparaît ; aucun cookie n'est posé.)*
9. **Retour après expiration du cookie.** Supprimer manuellement `sb-access-token` (ou attendre 1 h hors ligne), recharger `/coach` : redirection vers `/login?next=%2Fcoach` ; la page de connexion resynchronise le cookie si la session navigateur existe encore (une seule tentative automatique par fenêtre de 20 s).
10. **Deux appareils, scope `local`.** Se connecter avec le même compte sur deux navigateurs (appareils P1 et P2). Se déconnecter sur P1. *(P2 reste connecté : sa session n'a pas été révoquée ; vérifier `/dashboard` sur P2.)*
11. **Validation réelle de `session_is_active`** (après la préparation) : sur un compte Coach, noter le `session_id` du jeton (claim, via un décodeur local), se déconnecter, puis `select public.session_is_active('<session_id>')` avec la clé de service — attendu `false` ; vérifier aussi `select count(*) from auth.sessions where id = '<session_id>'` (la ligne a-t-elle réellement disparu ?). Tant que ce n'est pas constaté, ne pas activer le drapeau.
12. **Autres onglets.** Ouvrir `/dashboard` dans deux onglets, se déconnecter dans l'un. *(L'autre onglet revient sur `/login` ; si le nettoyage de secours a été nécessaire — réseau coupé + jeton expiré — le signal explicite `BroadcastChannel` / `storage` le prévient.)* Cas à tester séparément : onglet public (`/blog`) ouvert — il ne doit pas être redirigé.

### Cookies : tableau par scénario (comportement implémenté ; non vérifié en navigateur)
| Scénario | Cookies présents avant | Opérations Auth | Cookies émis dans la réponse | Cookies conservés | Résultat métier |
|---|---|---|---|---|---|
| Connexion classique, deux sessions valides | `sb-access-token`, `sb-refresh-token` + Bearer B | `signOut(A,"local")`, `signOut(B,"local")` | suppression de `sb-access-token`, `sb-refresh-token`, des 3 cookies de nouvelle tentative | aucun | `revoked` / `revoked`, confirmé |
| Google / membre sans cookie | Bearer B seul | `signOut(B,"local")` | suppression de `sb-access-token` | aucun | `no_cookie` / `revoked`, confirmé |
| Erreur Auth temporaire (2 essais serveur) | A + B | `signOut` ×2 par branche | `sb-access-token` supprimé ; `sb-revoke-pending-a`, `-a-refresh`, `-b` posés (≤ 120 s, Strict, Path `/api/auth/session`) ; `sb-refresh-token` supprimé dans la **même** réponse | cookies de nouvelle tentative | `temporary`, 503, `pendingRetry`, non confirmé |
| Access A expiré + refresh valide | `sb-access-token` (expiré), `sb-refresh-token` | `refreshSession` (client temporaire, 1 fois) → `getUser` sur le nouveau jeton → `signOut` | tout supprimé si confirmé | aucun | `revoked` |
| Access A expiré + refresh `refresh_token_not_found` / `session_expired` | idem | `refreshSession` refusé | `sb-refresh-token` supprimé (credential inutilisable) | aucun | `invalid_token` — **rien de prouvé**, non confirmé |
| Rotation incertaine (délai dépassé) ou `refresh_token_already_used` | idem | `refreshSession` sans réponse exploitable | `sb-refresh-token` supprimé après transfert vers `sb-revoke-pending-a-refresh` (même réponse) | cookie de nouvelle tentative | `refresh_rotation_unconfirmed`, non confirmé ; aucune affirmation sur l'ancien refresh token |
| Synchronisation, sessions A ≠ B | A + Bearer B | `signOut(A,"local")` uniquement | cookie = jeton de B ; `sb-refresh-token` supprimé | — | `oldSession: "revoked"` |
| Synchronisation, même session | cookie = jeton de B | aucune révocation | cookie renouvelé | — | `oldSession: "same_session"` |
| Synchronisation, erreur temporaire sur A | A + Bearer B | `signOut(A)` ×2 | **aucun** | ancien cookie conservé | 503 `oldSession: "temporary"`, B non posé |

### Codes Auth à relever sur le projet de développement (non inventés)
Dans `auth-js` 2.108.2, la liste de codes connus du SDK comprend notamment `bad_jwt`, `session_not_found`, `session_expired`, `refresh_token_not_found`, `refresh_token_already_used`, `user_not_found`, `over_request_rate_limit`. **Constat vérifié dans le SDK** : une réponse `session_not_found` y est convertie en `AuthSessionMissingError` (status 400, sans code). Ce que le service hébergé renvoie réellement pour chaque situation (jeton d'une session supprimée sur `/logout`, `/user` et `/token?grant_type=refresh_token`) reste **à relever** : noter statut + corps pour chaque cas des parcours 5, 6, 7 et 11.

### Limites connues
- Un **échec réseau pendant le rafraîchissement** d'un refresh token est signalé comme `refresh_rotation_unconfirmed` (le SDK réessaie en interne avec un backoff de ~25 s ; l'échéance de 5 s ne permet pas de distinguer « jamais envoyé » de « envoyé, réponse perdue »). C'est volontairement conservateur.
- Le limiteur de tentatives (`logout_attempt`, table `password_reset_rate_limits`) est **fail-open** (si la base est indisponible, il laisse passer) et non atomique (des requêtes simultanées peuvent dépasser le plafond) ; il n'est pas une garantie distribuée.
- `POST /api/auth/session` remplace le cookie de A par le jeton de B : A est révoquée (parcours 3) ; si A avait déjà été remplacée avant ce déploiement, ses jetons sont perdus et non révocables (ils expirent d'eux-mêmes).
- `DELETE /api/push/subscribe` utilise encore `getAuthenticatedUser` (retrait de sa propre souscription) : l'ancien JWT d'un Coach reste accepté pour cette seule action tant que son access token n'a pas expiré.
- `/api/auth/login` appelle `admin.signOut(jeton)` en scope par défaut (global) pour les comptes refusés (en attente, rejeté, suspendu…) : comportement antérieur, hors périmètre, **non modifié**.

## Nettoyage
Supprimer les comptes de test du projet de développement, ou restaurer son point de sauvegarde.
