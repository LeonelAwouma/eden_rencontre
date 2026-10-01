-- ============================================================
--  Vérification du selfie renforcée : détail conservé pour l'admin
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Le détail de la vérification (score de chaque photo de profil, problème
--  détecté — aucun visage, plusieurs visages, ne correspond pas —, et
--  résultat de la preuve de présence) est enregistré ici, pour que l'admin
--  voie POURQUOI un profil est vérifié ou non.
--  Sans cette colonne, l'inscription fonctionne quand même (détail non gardé).
-- ============================================================

alter table public.profiles add column if not exists selfie_verification_details jsonb;
