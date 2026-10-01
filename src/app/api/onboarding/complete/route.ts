import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkQuestionnaireCompletion } from "@/lib/onboarding";
import { evaluateVerificationBadge } from "@/lib/verification-badge";

/**
 * POST — Fin du questionnaire d'onboarding.
 * Header : Authorization: Bearer <jeton Supabase du membre>
 * Body   : { answers }
 *
 * Le membre est identifié par son jeton, jamais par un user_id envoyé par le
 * navigateur (sinon n'importe qui pourrait écraser le questionnaire d'un autre).
 * Si le profil ET le questionnaire sont complets, le badge « Profil vérifié »
 * est attribué automatiquement (src/lib/verification-badge.ts).
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

    const { error: updateError } = await supabase.from("profiles").update({
      questionnaire: answers,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    if (updateError) {
      console.error("[Onboarding Complete] Error saving onboarding:", updateError.message);
      return NextResponse.json({ error: "Enregistrement impossible. Réessayez." }, { status: 500 });
    }

    // Profil + questionnaire complets ⇒ badge « Profil vérifié » attribué automatiquement.
    const badge = await evaluateVerificationBadge(supabase, userId);

    return NextResponse.json({
      ok: true,
      verification_granted: !!badge?.granted,
      verification_status: badge?.status ?? profile.verification_status,
      questionnaire: { answered: completion.answered, total: completion.total },
    });
  } catch (err) {
    console.error("[Onboarding Complete]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
