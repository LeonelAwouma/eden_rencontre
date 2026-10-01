// Badge « Profil vérifié » — attribution automatique (côté serveur uniquement).
//
// Règle (demande du 2026-10-01) : dès qu'un membre a rempli TOUTES les
// informations de son profil (src/lib/profile-completion.ts) ET tout le
// questionnaire (questions obligatoires), le badge lui est attribué
// automatiquement, sans attendre l'admin. L'admin garde la main : un badge
// qu'il a refusé (« rejected ») n'est jamais réattribué automatiquement, et il
// peut toujours le retirer depuis la fiche du membre.
// Le badge ne s'affiche que tant que le profil reste complet (isProfileFullyComplete).

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getProfileCompletion } from "@/lib/profile-completion";
import { checkQuestionnaireCompletion } from "@/lib/onboarding";
import { sendVerificationApprovedEmail } from "@/lib/email";

type Db = ReturnType<typeof getSupabaseAdmin>;

export interface BadgeProgress {
  status: string;
  /** Badge attribué lors de cet appel. */
  granted: boolean;
  profile: { completed: number; total: number; missing: string[] };
  questionnaire: { answered: number; total: number };
  rejectionReason: string | null;
}

export async function evaluateVerificationBadge(db: Db, userId: string): Promise<BadgeProgress | null> {
  const { data: p } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!p) return null;

  const profile = getProfileCompletion(p);
  const answers = (p.questionnaire && typeof p.questionnaire === "object" ? p.questionnaire : {}) as Record<string, unknown>;
  const questionnaire = checkQuestionnaireCompletion(answers, { excludeOptional: true });

  const status: string = p.verification_status || "none";
  const complete = profile.percentage === 100 && questionnaire.total > 0 && questionnaire.percentage === 100;
  const eligible = complete && (status === "none" || status === "under_review");

  let granted = false;
  if (eligible) {
    // Condition sur l'ancien statut : deux appels simultanés n'attribuent (et ne notifient) qu'une fois.
    const { data: updated } = await db
      .from("profiles")
      .update({ verification_status: "verified", verification_rejection_reason: null })
      .eq("id", userId)
      .in("verification_status", ["none", "under_review"])
      .select("id");
    granted = !!updated?.length;
  }

  if (granted) {
    try {
      await db.from("meeting_notifications").insert({
        user_id: userId,
        notification_type: "verification_approved",
        title: "✅ Profil Vérifié",
        message: "Félicitations ! Votre profil et votre questionnaire sont complets : le badge « Profil Vérifié » est maintenant affiché sur votre profil.",
      });
    } catch (err) {
      console.error("[Badge] notification non créée:", err);
    }
    try {
      await db.from("admin_notifications").insert({
        type: "user",
        title: "Badge « Profil Vérifié » attribué",
        message: `${p.pseudo || p.name || p.email} a complété son profil et son questionnaire : le badge lui a été attribué automatiquement.`,
        link: `/admin/users/${userId}`,
        metadata: { user_id: userId, auto: true },
      });
    } catch { /* non bloquant */ }
    if (p.email) await sendVerificationApprovedEmail(p.email, p.name || "Membre", true).catch(() => false);
  }

  return {
    status: granted ? "verified" : status,
    granted,
    profile: { completed: profile.completed, total: profile.total, missing: profile.missing },
    questionnaire: { answered: questionnaire.answered, total: questionnaire.total },
    rejectionReason: status === "rejected" ? p.verification_rejection_reason ?? null : null,
  };
}
