// Résolution des actifs protégés de formation (images/audio/PDF des piliers
// 2+) — même modèle que src/lib/registration-media.ts : bucket privé
// `formation-media`, URL signées à durée de vie courte. Appelé exclusivement
// depuis /api/formation/lesson/[slug] (jamais depuis le client directement).
//
// Le pilier 1 reste public (gratuit par la mission) : ses fichiers restent
// sous public/formation/batir-sur-le-roc/ et ne passent jamais par ce module.

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasFeatureAccess } from "@/lib/subscription/effective";
import { pillarOfLesson } from "@/lib/formation/structure";

type Db = ReturnType<typeof getSupabaseAdmin>;

export const FORMATION_BUCKET = "formation-media";

/**
 * URL signée d'un actif protégé pour une leçon donnée, si l'abonnement
 * effectif du membre couvre le pilier de cette leçon. Toujours autorisé pour
 * le pilier 1 (gratuit) et pour tout pilier tant que
 * `commercial_restrictions_enabled=false` (comportement actuel préservé).
 */
export async function getFormationAssetUrl(
  db: Db,
  path: string,
  { userId, lessonSlug, expiresIn = 3600 }: { userId: string; lessonSlug: string; expiresIn?: number }
): Promise<string | null> {
  const pillar = pillarOfLesson(lessonSlug);
  if (pillar === null) return null;
  if (pillar > 1) {
    const allowed = await hasFeatureAccess(db, userId, "all_formations");
    if (!allowed) return null;
  }
  const { data, error } = await db.storage.from(FORMATION_BUCKET).createSignedUrl(path, expiresIn);
  if (error) {
    console.error("[formation/media] URL signée indisponible:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
