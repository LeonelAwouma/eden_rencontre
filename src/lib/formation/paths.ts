// Chemins de la formation, sans le contenu des leçons : importables partout
// (layout admin compris) sans embarquer tout le texte de la formation.

export const FORMATION_BASE_PATH = "/dashboard/academie/batir-sur-le-roc";
/** Aperçu des leçons dans l'admin (protégé par la session admin, pas par la connexion membre).
 *  L'Académie est rangée dans la médiathèque admin (onglet « Académie du mariage »). */
export const ADMIN_FORMATION_PATH = "/admin/mediatheque/academie";
export const ADMIN_LESSON_PREVIEW_PATH = `${ADMIN_FORMATION_PATH}/batir-sur-le-roc`;
/** Histoires de l'Académie : lecture membre et aperçu admin. */
export const STORIES_BASE_PATH = "/dashboard/academie/histoires";
export const ADMIN_STORY_PREVIEW_PATH = `${ADMIN_FORMATION_PATH}/histoires`;
