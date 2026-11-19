# Notifications push — configuration et procédure de test

Ce document s'adresse à la personne qui déploie Garden of Alliance (Supabase + Vercel) et à celle qui fait la recette sur téléphone.

## 1. Fonctionnement

```
Jean envoie un message ──► /api/chat/send ──► INSERT messages
                                                  │ trigger push_on_message (pg_net, asynchrone)
                                                  ▼
                  POST /api/push/dispatch   { source: "message", ref: <id> }
                  en-tête x-push-secret = push_settings.dispatch_secret
                                                  │ 1. secret vérifié (PUSH_DISPATCH_SECRET) sinon 401
                                                  │ 2. message relu en base, ignoré s'il a plus de 10 min
                                                  │ 3. push_log : chaque événement n'est envoyé qu'une fois
                                                  │ 4. destinataires = membres de la conversation − expéditeur,
                                                  │    comptes approuvés uniquement
                                                  ▼
                  web-push (VAPID) ──► tous les appareils de Marie (push_subscriptions)
                                                  │ 404/410 : abonnement expiré supprimé
                                                  ▼
                  public/sw.js : affiche la notification, même site fermé
                  toucher ──► /dashboard?conv=<id> (la conversation exacte)
```

- **Plusieurs appareils** : une ligne `push_subscriptions` par navigateur ou téléphone, unique par `endpoint`.
- **Aperçu** : sur chaque appareil, le membre choisit si le nom et le texte s'affichent sur l'écran verrouillé (`show_preview`). Sinon, la notification indique seulement « Vous avez reçu un nouveau message ».
- **Conversation déjà ouverte** : le service worker demande aux fenêtres visibles si elles affichent cette conversation. Si oui, Chrome, Edge et Firefox n'affichent rien ; Safari affiche une notification silencieuse, car il retire l'abonnement d'un site qui reçoit un push sans rien afficher. Sans réponse en 300 ms, la notification s'affiche.
- **Renouvellement** : si le navigateur change l'abonnement (`pushsubscriptionchange`), le service worker l'envoie à `/api/push/resubscribe`. La page renvoie aussi l'abonnement à chaque ouverture du tableau de bord.

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Côté | Rôle |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public (navigateur) | Clé publique VAPID, utilisée par `PushManager.subscribe()` |
| `VAPID_PRIVATE_KEY` | **serveur uniquement** | Signe les envois. Ne jamais la préfixer `NEXT_PUBLIC_` |
| `VAPID_SUBJECT` | serveur | `mailto:` d'un contact de la plateforme |
| `PUSH_DISPATCH_SECRET` | **serveur uniquement** | Secret partagé avec les triggers Supabase (voir l'étape 3.3) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** | Déjà en place, utilisée par les routes `/api/push/*` |

Générer les clés VAPID, une seule fois : si on les change, tous les abonnements existants deviennent invalides.

```bash
npx web-push generate-vapid-keys
```

## 3. Supabase (SQL Editor)

Ne considérez pas une migration comme appliquée parce qu'elle est dans le dépôt : vérifiez-la.

1. **Exécuter, dans l'ordre** (toutes idempotentes) :
   - `supabase/migrations/20261002_push_notifications.sql`
   - `supabase/migrations/20261112_coach_member_notifications.sql`
   - `supabase/migrations/20261119_push_hardening.sql`
2. **Vérifier** :
   ```sql
   select extname from pg_extension where extname in ('pg_net', 'pgcrypto');           -- 2 lignes
   select dispatch_url, enabled, dispatch_secret is not null as has_secret from public.push_settings;
   select tgname, tgrelid::regclass from pg_trigger where tgname like 'push_on_%';      -- message, friendship, notification, coach_notification
   select column_name from information_schema.columns
    where table_name = 'push_subscriptions' and column_name = 'show_preview';           -- 1 ligne
   ```
   `dispatch_url` doit être l'adresse HTTPS de production (`https://www.gardenofalliance.com/api/push/dispatch`). Si le domaine change :
   `update public.push_settings set dispatch_url = 'https://…/api/push/dispatch' where id = 1;`
3. **Copier le secret** dans Vercel :
   ```sql
   select dispatch_secret from public.push_settings where id = 1;
   ```
   Collez-le dans `PUSH_DISPATCH_SECRET`, puis **redéployez**.
4. **Contrôler les appels** après un message de test :
   ```sql
   select id, status_code, created from net._http_response order by created desc limit 20;
   select * from public.push_log order by created_at desc limit 20;
   ```
   `401` signifie que le secret est différent entre la base et Vercel. `200` avec `push_log.status = 'sent'` signifie que l'envoi a été fait.

**Ordre de déploiement sans coupure** : migration 20261119, puis la variable `PUSH_DISPATCH_SECRET`, puis le redéploiement. Tant que la variable n'est pas définie, le site accepte encore les appels sans secret et l'écrit dans les journaux Vercel (`PUSH_DISPATCH_SECRET non défini`). Ce mode de transition ne doit pas rester en production.

## 4. Ce qui est compatible

| Plateforme | Prise en charge |
|---|---|
| Android : Chrome, Edge, Samsung Internet, Firefox | Oui, même navigateur fermé. Un économiseur de batterie agressif (certains Xiaomi, Huawei ou Oppo) peut retarder les notifications : autorisez le navigateur dans les réglages de batterie. |
| iPhone et iPad, **iOS 16.4 ou plus récent**, site **ajouté à l'écran d'accueil** et ouvert depuis l'icône | Oui |
| iPhone dans Safari (onglet normal), Chrome iOS, Firefox iOS | **Non** : Apple ne le permet pas. L'interface affiche alors les étapes d'installation. |
| Ordinateur : Chrome, Edge, Firefox, Safari 16 ou plus sur macOS 13 ou plus | Oui, tant que le navigateur tourne (souvent en arrière-plan) |
| Navigation privée | En général non |

L'invitation à activer n'est jamais affichée automatiquement en demande système. L'autorisation n'est demandée qu'après un clic sur « Activer les notifications » : bannière de l'accueil, ou onglet **Notifications** du tableau de bord.

## 5. Procédure de test sur appareils réels

Prérequis : étapes 2 et 3 faites, site en HTTPS, deux comptes approuvés (Jean et Marie) avec une conversation entre eux.

| # | Étapes | Résultat attendu |
|---|---|---|
| 1 | **Android** : Marie ouvre le site dans Chrome, va dans Tableau de bord → Notifications → *Activer les notifications* → *Autoriser*. Elle ferme Chrome, puis verrouille le téléphone. Jean lui écrit. | Une notification de confirmation arrive à l'activation. Puis « Jean », « Bonjour Marie… » arrive sur l'écran verrouillé. |
| 2 | **iPhone** : dans Safari, *Partager* → *Sur l'écran d'accueil*. Marie ouvre Garden depuis l'icône → Notifications → *Activer* → *Autoriser*. Elle ferme l'app et verrouille. Jean écrit. | La notification arrive. Si rien n'arrive, vérifier Réglages → Notifications → Garden of Alliance. |
| 3 | Marie touche la notification. | Garden s'ouvre directement dans la conversation avec Jean, et le compteur de non-lus est à jour. |
| 4 | Marie active les notifications sur un deuxième appareil. Jean écrit. | Les deux appareils sonnent. Les deux apparaissent dans « Appareils qui reçoivent vos notifications ». |
| 5 | Sur l'un des deux, Marie touche *Désactiver*, ou *Retirer* depuis l'autre appareil. Jean écrit. | Seul l'appareil restant reçoit. |
| 6 | Jean envoie un message depuis un téléphone où il a activé les notifications. | Jean ne reçoit rien pour son propre message. |
| 7 | Désinstaller la PWA ou effacer les données du site sur un appareil abonné, puis Jean écrit. | Le service push répond 410 et la ligne disparaît de `push_subscriptions`. |
| 8 | `curl -X POST https://www.gardenofalliance.com/api/push/dispatch -H 'Content-Type: application/json' -d '{"source":"message","ref":"<un id>"}'` | `401 Non autorisé` (une fois `PUSH_DISPATCH_SECRET` défini). |
| 9 | Jean envoie un texte, puis une photo, puis un sticker. | Le texte s'affiche tel quel, puis « 📷 Photo », puis « 🙏 Sticker » (l'émoji du sticker). |
| 10 | Messagerie, cloche de notifications, connexion et déconnexion. | Comportement inchangé. |
| + | Marie a la conversation avec Jean ouverte à l'écran quand il écrit. | Le message apparaît dans le fil, sans notification système (Android et ordinateur) ou avec une notification silencieuse (iPhone). |
| + | Marie désactive « Afficher le nom et le message sur l'écran verrouillé ». Jean écrit. | La notification affiche « Garden of Alliance » et « Vous avez reçu un nouveau message ». |

## 6. Fichiers concernés

- Navigateur : `public/sw.js`, `src/lib/push.ts`, `src/components/push-opt-in.tsx`, `src/app/dashboard/page.tsx` (écoute du service worker), `src/app/manifest.ts`.
- Serveur :
  - `src/app/api/push/subscribe/route.ts` (GET, POST, PATCH, DELETE)
  - `src/app/api/push/resubscribe/route.ts`
  - `src/app/api/push/dispatch/route.ts`
  - `src/lib/push-server.ts`
  - `src/lib/push-dispatch-auth.ts`
  - `src/lib/push-message.ts`
  - `src/lib/push-devices.ts`
  - `src/lib/push-claim.ts`
- Base : `supabase/migrations/20261002_push_notifications.sql`, `20261112_coach_member_notifications.sql`, `20261119_push_hardening.sql`.
- Tests :
  - `src/app/api/push/dispatch/route.test.ts`
  - `src/app/api/push/subscribe/route.test.ts`
  - `src/lib/push-helpers.test.ts`
  - `src/lib/push-service-worker.test.ts`
  - `src/lib/push-claim.test.ts`
