-- ============================================================
--  Relance des profils incomplets
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Date de la dernière relance « Complétez votre profil » envoyée depuis
--  Admin → Utilisateurs → À traiter. Un membre n'est pas relancé plus
--  d'une fois par semaine.
-- ============================================================

alter table public.profiles add column if not exists profile_reminder_sent_at timestamptz;

notify pgrst, 'reload schema';
