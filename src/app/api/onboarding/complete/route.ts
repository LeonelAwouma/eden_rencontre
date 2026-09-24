import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkQuestionnaireCompletion } from "@/lib/onboarding";

/**
 * POST — Fin du questionnaire d'onboarding.
 * Header : Authorization: Bearer <jeton Supabase du membre>
 * Body   : { answers }
 *
 * Le membre est identifié par son jeton, jamais par un user_id envoyé par le
 * navigateur (sinon n'importe qui pourrait écraser le questionnaire d'un autre).
 * La demande de badge (verification_status « under_review ») n'est créée que si
 * toutes les questions requises sont remplies, et jamais pour un profil déjà vérifié.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });
    const { data: auth } = await supabase.auth.getUser(token);
    const userId = auth.user?.id;
    if (!userId) return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const answers = body && typeof body.answers === "object" && body.answers !== null && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, pseudo, email, verification_status")
      .eq("id", userId)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const completion = checkQuestionnaireCompletion(answers, { excludeOptional: true });
    const alreadyVerified = profile.verification_status === "verified";
    const requestBadge = completion.percentage === 100 && !alreadyVerified && profile.verification_status !== "under_review";

    const update: Record<string, unknown> = {
      questionnaire: answers,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    if (requestBadge) update.verification_status = "under_review";

    const { error: updateError } = await supabase.from("profiles").update(update).eq("id", userId);
    if (updateError) {
      console.error("[Onboarding Complete] Error saving onboarding:", updateError.message);
      return NextResponse.json({ error: "Enregistrement impossible. Réessayez." }, { status: 500 });
    }

    if (requestBadge) {
      try {
        await supabase.from("meeting_notifications").insert({
          user_id: userId,
          notification_type: "verification_pending",
          title: "Profil en cours de vérification",
          message: "Votre profil a été complété avec succès. Il est maintenant en cours de révision par notre équipe. Vous recevrez une notification dès que votre statut « Profil Vérifié » sera attribué.",
        });
      } catch (notifErr) {
        console.error("[Onboarding Complete] Failed to create user notification:", notifErr);
      }
      try {
        await supabase.from("admin_notifications").insert({
          type: "user",
          title: "Demande de vérification de profil",
          message: `${profile.pseudo || profile.name || profile.email} a complété son questionnaire et demande le badge « Profil Vérifié ».`,
          link: `/admin/users/${userId}`,
          metadata: { user_id: userId },
        });
      } catch (adminNotifErr) {
        console.error("[Onboarding Complete] Failed to create admin notification:", adminNotifErr);
      }
    }

    return NextResponse.json({
      ok: true,
      verification_requested: requestBadge,
      questionnaire: { answered: completion.answered, total: completion.total },
    });
  } catch (err) {
    console.error("[Onboarding Complete]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
