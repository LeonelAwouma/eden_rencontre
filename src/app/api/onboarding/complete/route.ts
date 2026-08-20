import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// POST — Complete onboarding and set verification status to "under_review"
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { user_id, answers } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    // 1. Get the user profile for the notification
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // 2. Create a user notification (meeting_notifications table)
    try {
      await supabase.from("meeting_notifications").insert({
        user_id: user_id,
        notification_type: "verification_pending",
        title: "Profil en cours de vérification",
        message: "Votre profil a été complété avec succès. Il est maintenant en cours de révision par notre équipe. Vous recevrez une notification dès que votre statut « Profil Vérifié » sera attribué.",
      });
    } catch (notifErr) {
      console.error("[Onboarding Complete] Failed to create user notification:", notifErr);
    }

    // 3. Create an admin notification
    try {
      await supabase.from("admin_notifications").insert({
        type: "user",
        title: "Demande de vérification de profil",
        message: `${profile.name || profile.email} a complété son profil et demande le badge « Profil Vérifié ».`,
        link: `/admin/users/${user_id}`,
        metadata: { user_id },
      });
    } catch (adminNotifErr) {
      console.error("[Onboarding Complete] Failed to create admin notification:", adminNotifErr);
    }

    // 4. Save onboarding answers + mark as completed + set verification status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        questionnaire: answers || {},
        onboarding_completed: true,
        verification_status: "under_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("[Onboarding Complete] Error saving onboarding:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Onboarding complété, profil en cours de vérification." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Onboarding Complete]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}