import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeCoachAudit } from "@/lib/coach/audit";

type Db = ReturnType<typeof getSupabaseAdmin>;

/**
 * Le coach peut-il consulter le dossier de ce membre ?
 * Oui seulement si : attribution ACTIVE + consentement ACCEPTÉ + coach actif et approuvé
 * (vérifié par la fonction SQL coach_can_access_member, lecture seule, booléen).
 * Toute erreur ou réponse inattendue = refus. L'appelant répond 404 (jamais 403 : on ne révèle
 * pas l'existence d'un membre non attribué).
 */
export async function assertCoachMemberAccess(
  db: Db,
  coachId: string,
  memberId: string,
  opts: { audit?: boolean; action?: string } = {}
): Promise<boolean> {
  if (!coachId || !memberId || coachId === memberId) return false;
  try {
    const { data, error } = await db.rpc("coach_can_access_member", { p_coach: coachId, p_member: memberId });
    if (error || data !== true) return false;
  } catch {
    return false;
  }
  if (opts.audit !== false) {
    // Consultation autorisée : journalisée sans aucun contenu (ni notes, ni données de profil).
    await writeCoachAudit(db, {
      actorId: coachId, actorKind: "coach", action: opts.action ?? "member_file_viewed",
      targetType: "member", targetId: memberId,
    });
  }
  return true;
}
