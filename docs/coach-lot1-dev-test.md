# Lot 1 Coach — test contrôlé de la migration (projet Supabase DE DÉVELOPPEMENT uniquement)

> **Ne jamais exécuter ceci sur la production.** Utilisez un projet Supabase séparé (ou une branche de
> développement) contenant uniquement des données de test. Rien dans ce dépôt n'exécute ces scripts.

## 0. Avant de commencer
- Projet de **développement** distinct, avec les migrations `20261024_coach_accounts.sql` et
  `20261024_coach_dual_access.sql` déjà passées. Sinon, les exécuter d'abord, dans l'ordre.
- Une sauvegarde / un point de restauration du projet de développement.
- Trois comptes de test : un coach (créé via Admin → Utilisateurs → Coachs), `member_a` et `member_b`
  (membres **approuvés**, `account_type = 'member'`). Notez leurs `user_id` ci-dessous : `:coach`, `:a`, `:b`.

## 1. Ordre d'exécution (SQL Editor, un fichier à la fois)
1. `supabase/migrations/20261107_coach_hardening.sql`
2. `supabase/migrations/20261108_coach_assignments.sql`

Chaque fichier est idempotent : le rejouer ne doit produire aucune erreur (à vérifier en le relançant).

## 2. Contrôles de structure (lecture seule)
```sql
-- Les 3 tables existent, RLS activée
select relname, relrowsecurity from pg_class
 where relname in ('coach_member_assignments','coach_audit_logs','coach_notifications');   -- attendu : 3 lignes, true

-- Droits des tables : aucune ligne pour anon / authenticated
select table_name, grantee, privilege_type from information_schema.role_table_grants
 where table_name in ('coach_member_assignments','coach_audit_logs','coach_notifications')
   and grantee in ('anon','authenticated','PUBLIC');                                        -- attendu : 0 ligne

-- Droits d'exécution des fonctions : service_role seulement
select routine_name, grantee from information_schema.routine_privileges
 where routine_schema='public' and routine_name like 'coach\_%'
   and grantee in ('anon','authenticated','PUBLIC');                                        -- attendu : 0 ligne

-- is_active_coach n'est plus exécutable par authenticated
select has_function_privilege('authenticated','public.is_active_coach(uuid)','execute');   -- attendu : false

-- Fonctions SECURITY DEFINER avec search_path figé
select proname, prosecdef, proconfig from pg_proc
 where pronamespace='public'::regnamespace and proname like 'coach\_%';                      -- attendu : secdef true, proconfig {search_path=public, pg_temp}
```

## 3. Machine à états (tout dans une transaction annulée à la fin)
```sql
begin;
-- 3.1 Cycle nominal
select public.coach_assign_member(:'coach', :'a', 'test-admin') as assignment \gset
select status, consent_status from public.coach_member_assignments where id = :'assignment';   -- pending / pending
select public.coach_can_access_member(:'coach', :'a');                                          -- false (pas de consentement)
select public.coach_respond_assignment(:'a', :'assignment', true);                              -- active
select public.coach_can_access_member(:'coach', :'a');                                          -- true
select public.coach_can_access_member(:'coach', :'b');                                          -- false (autre membre)

-- 3.2 Retrait du consentement
select public.coach_end_assignment('member', :'a', :'assignment', 'test');                      -- revoked
select public.coach_can_access_member(:'coach', :'a');                                          -- false
rollback;
```
Cas d'erreur attendus (chacun dans sa propre transaction, `rollback` ensuite) :

| Action | Résultat attendu |
|---|---|
| `coach_assign_member(:coach, :coach, 'x')` | erreur `self_assignment` |
| `coach_assign_member(:coach, <un coach>, 'x')` | erreur `member_not_eligible` |
| `coach_respond_assignment(:b, <assignment de a>, true)` | erreur `assignment_not_found` |
| Répondre deux fois à la même attribution | erreur `invalid_state` |
| `coach_end_assignment('member', :b, <assignment de a>, 'x')` | erreur `assignment_not_found` |
| `update ... set status='active' where status='declined'` | erreur `23514` (état terminal) |
| `insert into coach_member_assignments (..., status) values (..., 'active')` | erreur `23514` (doit naître `pending`) |
| `update ... set status='active', consent_status='pending'` | violation de `coach_assignment_state_chk` |
| Réaffectation de `a` à un second coach | l'ancien dossier passe `ended` (`reassigned`), le nouveau est `pending` ; l'historique garde les 2 lignes |

## 4. Désactivation transactionnelle d'un coach
```sql
begin;
select public.coach_assign_member(:'coach', :'a', 'test-admin') as x \gset
select public.coach_respond_assignment(:'a', :'x', true);
select public.coach_set_active(:'coach', false, 'test-admin');   -- {"active": false, "assignments_ended": 1}
select active from public.coach_accounts where user_id = :'coach';                -- false
select status from public.profiles where id = :'coach';                            -- suspended
select status, end_reason from public.coach_member_assignments where id = :'x';   -- ended / coach_deactivated
select public.coach_can_access_member(:'coach', :'a');                             -- false
rollback;
```
Test de rollback : forcer une erreur (par ex. `coach_set_active(:'a', false, 'x')` sur un **membre**) →
erreur `not_a_coach`, et aucune ligne modifiée.

## 5. Isolation des rôles (les appels doivent échouer pour un utilisateur connecté)
```sql
begin;
set local role authenticated;
select public.coach_assign_member(:'coach', :'a', 'x');          -- attendu : permission denied for function
select * from public.coach_member_assignments;                    -- attendu : permission denied for table
select public.coach_can_access_member(:'coach', :'a');            -- attendu : permission denied
rollback;
-- idem avec « set local role anon; »
```
Vérifier aussi qu'un **coach connecté** (jeton réel) ne lit aucun profil de membre :
`select count(*) from public.profiles where id <> auth.uid();` doit renvoyer 0.

## 6. Concurrence (deux sessions SQL Editor ouvertes en parallèle)
1. Session 1 : `begin; select public.coach_assign_member(:'coach', :'a', 's1');` (ne pas valider).
2. Session 2 : `select public.coach_assign_member(:'coach2', :'a', 's2');` → doit **attendre** (verrou consultatif).
3. Session 1 : `commit;` → la session 2 se débloque, termine l'attribution de la session 1 (`ended`/`reassigned`) et crée la sienne.
4. Contrôle final : `select member_id, count(*) from coach_member_assignments where status in ('pending','active') group by 1 having count(*) > 1;` → 0 ligne.

Variante coach : session 1 `begin; select public.coach_set_active(:'coach', false, 's1');` ; session 2 `coach_assign_member(:'coach', :'b', 's2')` → doit attendre puis échouer avec `coach_not_active`.

## 7. Contrôles applicatifs (avec `npm run dev` pointé sur le projet de développement)
- Admin → Utilisateurs → Coachs → « Membres » : attribuer `member_a` ; la recherche ne propose **pas** de coach.
- `GET /api/member/coach` avec le jeton de `member_a` : dossier `pending`. Avec le jeton de `member_b` : `current: null`.
- `POST /api/member/coach/consent` avec le jeton de `member_b` et l'`assignment_id` de `member_a` : **404**.
- Suspendre le coach depuis Admin → Coachs : ses requêtes (`/api/coach/me`, `/api/meetings`, `/api/push/subscribe`) répondent 401/403 **immédiatement**, même avec son ancien jeton.
- Tenter « Supprimer » un coach avec historique : **409** `coach_has_history`.
- Depuis la fiche d'un coach, via les routes génériques (`/api/admin/users/<id>/suspend|approve|reject`) : **409**.

## 8. Nettoyage
Supprimer les comptes de test, ou restaurer le point de sauvegarde du projet de développement.
Annuler tout ce qui précède dans la production : **ne rien faire** (aucune exécution n'y a eu lieu).
