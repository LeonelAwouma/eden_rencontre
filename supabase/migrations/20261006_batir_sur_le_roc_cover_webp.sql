-- ============================================================
--  Médiathèque : couverture de la formation « Bâtir sur le roc » en WebP
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  /batir_roc.png (2,8 Mo) est remplacée par la même image en WebP (≈ 330 Ko),
--  rangée avec les images des leçons. Les anciennes valeurs restent servies
--  grâce à une redirection (next.config.ts), mais autant pointer directement
--  vers le bon fichier.
-- ============================================================

update public.mediatheque_learning_paths
set cover_url = '/formation/batir-sur-le-roc/images/couverture.webp', updated_at = now()
where slug like 'batir-sur-le-roc%'
  and (cover_url is null or cover_url = '' or cover_url in ('/batir_roc.png', '/batir_roc.webp'));
