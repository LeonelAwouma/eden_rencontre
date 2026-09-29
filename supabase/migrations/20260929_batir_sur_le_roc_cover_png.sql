-- Nouvelle image de couverture du parcours « Bâtir sur le roc · Pilier 1 » :
-- public/batir_roc.png (un couple pose une pierre sur le rocher « Jésus Christ,
-- notre fondation »), qui remplace public/batir_roc.webp, supprimé.
-- À exécuter dans : Supabase Dashboard → SQL Editor. Idempotent.
UPDATE mediatheque_learning_paths
SET cover_url = '/batir_roc.png', updated_at = now()
WHERE cover_url = '/batir_roc.webp';
