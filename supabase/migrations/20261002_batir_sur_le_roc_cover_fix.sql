-- ============================================================
--  Médiathèque : image de la formation « Bâtir sur le roc »
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  La couverture du parcours doit être /batir_roc.png. Selon les migrations
--  exécutées, elle pouvait être vide ou pointer vers /batir_roc.webp, un
--  fichier qui n'existe plus : l'image n'apparaissait pas dans la médiathèque.
-- ============================================================

update public.mediatheque_learning_paths
set cover_url = '/batir_roc.png', updated_at = now()
where slug like 'batir-sur-le-roc%'
  and (cover_url is null or cover_url = '' or cover_url = '/batir_roc.webp');
