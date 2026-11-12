-- ============================================================
--  Rappels de connexion AUTOMATIQUES (plus d'opt-in individuel)
--  À exécuter MANUELLEMENT : Supabase Dashboard → SQL Editor → New query
--  Additif et idempotent : peut être ré-exécuté sans risque. Aucune donnée supprimée ni modifiée.
--
--  Prérequis : 20261024_member_reactivation.sql (déjà appliquée) ; ordre conseillé : après
--  20261112_coach_member_notifications.sql (les deux fichiers sont indépendants).
--
--  Règle métier
--   • Tout membre approuvé et éligible est inscrit d'office aux rappels (7, 21, 45 jours après sa dernière VISITE).
--   • member_reactivation_preferences devient une LISTE D'OPPOSITION :
--       email_opt_in = false  → le membre s'est opposé (lien de désinscription des e-mails, ou ancien choix) : jamais relancé.
--       pas de ligne / true   → inscrit. Les lignes existantes ne sont NI modifiées NI supprimées.
--   • member_reactivation_sends (historique des e-mails déjà envoyés) est conservé tel quel.
--
--  ⚠️ Cette migration ne touche JAMAIS à last_member_visit_at des profils existants : aucun rappel immédiat artificiel.
--  ⚠️ L'ancienne migration 20261024 contient un « update … set last_member_visit_at = now() » (amorçage du lancement initial).
--     Ne la rejouez pas sans vérifier si elle a déjà été exécutée : elle réinitialiserait des dates d'activité.
-- ============================================================

-- 1. Nombre de tentatives d'envoi par palier (reprise après échec, bornée à 3 côté application).
alter table public.member_reactivation_sends
  add column if not exists attempts integer not null default 1;

-- 2. Nouveaux membres : dès l'approbation, la date de référence du cycle est posée si elle est vide.
--    Elle ne s'applique qu'à l'INSERTION ou au PASSAGE à « approved » et seulement si la date est NULL :
--    les dates des membres existants ne sont jamais modifiées.
create or replace function public.member_reactivation_init_visit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'approved'
     and new.last_member_visit_at is null
     and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.last_member_visit_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists member_reactivation_init_visit on public.profiles;
create trigger member_reactivation_init_visit
  before insert or update of status on public.profiles
  for each row execute function public.member_reactivation_init_visit();

comment on table public.member_reactivation_preferences is
  'Liste d''opposition aux rappels d''inactivité : email_opt_in = false = désinscrit. Absence de ligne = inscrit automatiquement.';
