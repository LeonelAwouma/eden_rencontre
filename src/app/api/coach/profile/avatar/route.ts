import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { allowCoachWrite, auditCoach, rateLimited } from "@/lib/coach/lot3-api";
import { COACH_AVATAR_MAX_BYTES, checkAvatarFile, replaceCoachAvatar } from "@/lib/coach/avatar";

/** Marge pour l'enveloppe multipart autour du fichier (limites, en-têtes de partie). */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/**
 * PUT /api/coach/profile/avatar — le coach CONNECTÉ remplace SA photo de profil.
 * Corps : multipart/form-data, champ `photo` (JPEG, PNG ou WebP, 3 Mo maximum).
 *
 * - Identité : uniquement celle de la session validée par `withActiveCoach` (coach actif et approuvé). Aucun
 *   identifiant de coach n'est lu dans la requête : un `coach_id` envoyé par le navigateur est ignoré, il est donc
 *   impossible de viser le profil d'un autre coach.
 * - Fichier : type RÉEL contrôlé par signature binaire et taille vérifiée côté serveur (`checkAvatarFile`).
 * - Écriture : même séquence que la route administrateur (`replaceCoachAvatar`) — l'ancien fichier n'est supprimé
 *   qu'après l'enregistrement réussi de la nouvelle URL ; si la base échoue, le nouveau fichier est retiré et
 *   l'ancienne photo reste en place.
 * - Une seule colonne : `profiles.avatar_url`, celle que lisent l'espace Coach et l'administration.
 * - Journal : action, format et taille — ni URL, ni nom de fichier, ni contenu.
 */
export async function PUT(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    if (!(await allowCoachWrite(coach.id))) return rateLimited();

    // Refus AVANT de lire le corps : un envoi démesuré n'est pas chargé en mémoire.
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > COACH_AVATAR_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return coachJson({ error: "Image trop lourde (3 Mo maximum).", code: "avatar_too_large" }, 413);
    }

    const form = await req.formData().catch(() => null);
    const check = await checkAvatarFile(form?.get("photo"));
    if (!check.ok) return coachJson({ error: check.message, code: check.code }, check.code === "avatar_too_large" ? 413 : 400);

    const db = getSupabaseAdmin();
    const { data, error } = await db.from("profiles").select("avatar_url").eq("id", coach.id).maybeSingle();
    if (error || !data) throw new Error("coach avatar: profile read failed");

    const replaced = await replaceCoachAvatar(db, coach.id, check, (data as { avatar_url?: string | null }).avatar_url ?? null);
    if (!replaced.ok) {
      console.error("[coach-api] avatar:", replaced.code);
      return coachJson({ error: replaced.message, code: replaced.code }, 500);
    }

    await auditCoach(db, coach.id, "coach_avatar_updated", "coach", coach.id, { format: check.type.ext, bytes: check.bytes.length });
    return coachJson({ avatarUrl: replaced.url });
  });
}
