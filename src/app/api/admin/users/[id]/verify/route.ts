import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const action = body.action as "approve" | "reject";
    const reason = body.reason as string | undefined;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide. Utilisez 'approve' ou 'reject'." }, { status: 400 });
    }

    // Get the user
    const { data: user, error: fetchError } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // Check that user is under review
    if (user.verification_status !== "under_review") {
      return NextResponse.json(
        { error: "Cet utilisateur n'est pas en attente de vérification." },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "verified" : "rejected";

    // Update verification status
    const { error: updateError } = await db
      .from("profiles")
      .update({
        verification_status: newStatus,
        verification_rejection_reason: action === "reject" ? (reason || null) : null,
      })
      .eq("id", id);

    if (updateError) {
      console.error(`Error ${action}ing verification:`, updateError);
      return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
    }

    // Create a user notification (meeting_notifications)
    if (action === "approve") {
      try {
        await db.from("meeting_notifications").insert({
          user_id: id,
          notification_type: "verification_approved",
          title: "✅ Profil Vérifié",
          message: "Félicitations ! Votre profil a été vérifié par notre équipe. Le badge « Profil Vérifié » est maintenant affiché sur votre profil.",
        });
      } catch (notifErr) {
        console.error("[Admin Verify] Failed to create approval notification:", notifErr);
      }

      // Send email
      if (user.email) {
        await sendVerificationApprovedEmail(user.email, user.name || "Membre");
      }
    } else {
      try {
        await db.from("meeting_notifications").insert({
          user_id: id,
          notification_type: "verification_rejected",
          title: "Vérification de profil non approuvée",
          message: `Votre demande de vérification de profil n'a pas été approuvée.${reason ? ` Raison : ${reason}` : ""} Vous pouvez compléter ou mettre à jour votre profil puis soumettre à nouveau une demande.`,
        });
      } catch (notifErr) {
        console.error("[Admin Verify] Failed to create rejection notification:", notifErr);
      }

      // Send email
      if (user.email) {
        await sendVerificationRejectedEmail(user.email, user.name || "Membre", reason);
      }
    }

    // Log admin action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(
      admin.adminId,
      admin.email,
      `verification_${action === "approve" ? "approved" : "rejected"}`,
      "user",
      id,
      { user_email: user.email, user_name: user.name, reason },
      ip
    );

    return NextResponse.json({
      ok: true,
      message: action === "approve"
        ? "Profil vérifié avec succès."
        : "Vérification rejetée.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin verify API error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}