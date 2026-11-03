-- ============================================================
--  Contenu protégé des formations (bucket privé formation-media)
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Avant : images, audio (+ transcriptions) et PDF des leçons (y compris
--  piliers 2-3) étaient des fichiers STATIQUES PUBLICS sous
--  public/formation/batir-sur-le-roc/{images,audio,pdf}/ — servis par
--  Next.js sans aucune vérification de session, indépendamment de toute
--  protection ajoutée à la page ou à l'API.
--
--  Désormais : ces fichiers vivent dans ce bucket privé, résolus
--  uniquement via src/lib/formation/media.ts (getFormationAssetUrl),
--  appelé exclusivement depuis /api/formation/lesson/[slug] — jamais
--  depuis le client directement. Le pilier 1 reste public (gratuit par
--  la mission, aucune raison de le protéger).
--
--  Bucket PRIVÉ : aucune politique de lecture ; seul le serveur (service
--  role) délivre des URL signées à durée de vie courte, après vérification
--  de hasFeatureAccess (src/lib/subscription/effective.ts).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('formation-media', 'formation-media', false, 15728640, array['image/webp', 'audio/mpeg', 'application/pdf', 'application/json'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
