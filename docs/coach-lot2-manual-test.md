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
Message observé : « Création impossible : adresse déjà utilisée ou identifiants invalides. »
La route renvoie volontairement ce message générique pour **toute** erreur de Supabase Auth ; l'erreur réelle est désormais écrite dans les
**journaux serveur** (Vercel → Logs, ou le terminal de `npm run dev`) sous la forme :
`[admin/coaches] createUser refusé : { code, status, message }` (jamais le mot de passe ni l'adresse saisie).
Lire `code`/`message` pour trancher :
- `email_exists` / « already been registered » → l'adresse appartient déjà à un compte (membre ou autre). **Utiliser une autre adresse** : le code ne promeut ni n'écrase jamais un compte existant.
- `weak_password` / message sur la longueur ou les caractères → la politique de mot de passe de Supabase Auth (Authentication → Policies) est plus stricte que « 12 caractères, lettres et chiffres » : choisir un mot de passe plus long/complexe.
- `validation_failed` / adresse invalide → corriger l'adresse.
- autre code (`unexpected_failure`, limite d'envoi, clé de service) → vérifier la configuration du projet Supabase.

## Nettoyage
Supprimer les comptes de test du projet de développement, ou restaurer son point de sauvegarde.
