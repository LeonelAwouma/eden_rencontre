-- Formation « Bâtir sur le roc » — leçons terminées, enregistrées sur la fiche du membre.
-- Jusqu'ici la progression ne vivait que dans le navigateur : elle suit désormais le
-- compte d'un appareil à l'autre, et conditionne l'accès au matching (les six leçons
-- du pilier 1 doivent être terminées — voir isPillarOneComplete dans le code).
-- Les réflexions personnelles restent privées : elles ne quittent pas l'appareil.
-- À exécuter dans : Supabase Dashboard → SQL Editor. Idempotent.

alter table public.profiles
  add column if not exists formation_completed text[] not null default '{}';
