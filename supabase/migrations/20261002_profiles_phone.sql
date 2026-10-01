-- ============================================================
--  Numéro de téléphone des membres
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Demandé à l'inscription (indicatif du pays + numéro), enregistré au
--  format international E.164 : ex. +237690123456 pour le Cameroun.
--  Visible par l'admin uniquement (fiche du membre) : la colonne n'est
--  jamais lue par les pages publiques des membres.
-- ============================================================

alter table public.profiles add column if not exists phone text;

alter table public.profiles drop constraint if exists profiles_phone_format;
alter table public.profiles add constraint profiles_phone_format
  check (phone is null or phone ~ '^\+[0-9]{8,15}$');
