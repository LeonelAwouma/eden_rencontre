# Connexion des coachs par téléphone — déploiement

Identifiant de connexion d'un coach = **numéro E.164 + mot de passe**. L'e-mail devient une coordonnée de contact
facultative, partageable entre plusieurs coachs. Les nouveaux comptes ont une adresse Auth technique
`<chiffres>@phone.eden.invalid` (jamais affichée ni utilisée pour écrire).

## Ordre d'exécution (validation humaine, rien n'est appliqué automatiquement)

1. **Vérification (lecture seule)** : `supabase/checks/20261114_coach_phone_login_check.sql` dans le SQL Editor.
   Lire : un `user_id` et un compte Auth distincts par coach ? numéros renseignés ? doublons ? contraintes présentes ?
2. **Migration** : `supabase/migrations/20261114_coach_phone_login.sql` (idempotente, non destructive ; refuse de
   s'exécuter s'il existe des numéros en double). Elle rend `coach_accounts.email` facultative et lève l'unicité d'e-mail.
3. **Déploiement du code** — **après** la migration (créer un coach sans e-mail de contact échoue tant que la colonne est NOT NULL).

## Comptes existants (interventions manuelles)

- **Chaque coach existant** doit avoir `profiles.phone` renseigné (E.164, unique) pour se connecter par numéro.
  Tant que ce n'est pas fait, il continue de se connecter par son adresse e-mail Auth (compatibilité conservée).
- **Deux coachs qui partageaient réellement un seul compte Auth** (même `user_id`) ne peuvent pas être distingués :
  recréer le second via Admin → Coachs (nouveau numéro, nouveau mot de passe), puis réaffecter ses membres via
  Admin → Affectations. Rien n'est fusionné ni supprimé automatiquement.
- Une adresse e-mail partagée ne permet plus de désigner un coach : l'écran de connexion invite à utiliser le numéro.
- Réinitialisation de mot de passe d'un coach : demande par téléphone autorisée même avec un e-mail de contact
  (validation manuelle par l'administration, compte désigné par `user_id`).

## Sécurité à traiter séparément

`phase0-tmp-test.mjs` (racine, non suivi par git) contient une clé `sb_secret_…` en clair : la considérer comme
compromise, la **faire pivoter** dans Supabase et ne jamais la committer.
