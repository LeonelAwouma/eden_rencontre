-- ============================================================
--  Photos d'inscription dans Supabase Storage (bucket privé)
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Avant : photos de profil, selfie et rafale de la preuve de présence
--  partaient en base64 dans le JSON d'inscription (limite Vercel 4,5 Mo,
--  erreurs 413) et étaient stockées en base64 dans la table profiles.
--  Désormais : le navigateur dépose chaque image ici via une adresse
--  d'envoi signée (/api/registration/media), la route d'inscription ne
--  reçoit que les chemins, et profiles ne garde que ces chemins.
--
--  Bucket PRIVÉ : selfies et photos de vérification sont des données
--  sensibles. Aucune politique de lecture : seul le serveur (service role)
--  les lit, et l'admin les voit via des liens signés temporaires.
--  Les envois passent par des jetons signés : aucune politique d'écriture.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registration-media', 'registration-media', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
