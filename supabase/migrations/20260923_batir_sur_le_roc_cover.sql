-- Image de couverture du parcours « Bâtir sur le roc · Pilier 1 » :
-- public/batir_roc.webp (mains qui posent une pierre sur un cairn), qui
-- englobe les six leçons du pilier dans l'admin et sur le site.
UPDATE mediatheque_learning_paths
SET cover_url = '/batir_roc.webp', updated_at = now()
WHERE slug = 'batir-sur-le-roc-pilier-1';
