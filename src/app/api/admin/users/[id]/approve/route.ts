import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendAccountApprovedEmail, getLastEmailError } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    // Get the user
    const { data: user, error: fetchError } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    // Update status to approved (env-admin has no UUID, so null out reviewed_by)
    const { error: updateError } = await db
      .from("profiles")
      .update({
        status: "approved",
        reviewed_by: admin.adminId === "env-admin" ? null : admin.adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error approving user:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de l'approbation." },
        { status: 500 }
      );
    }

    // Send approval email — le résultat est renvoyé à l'admin, qui doit savoir si le membre a été prévenu.
    const emailSent = user.email ? await sendAccountApprovedEmail(user.email, user.name || "Membre") : false;
    // Trace de l'envoi (20261002_approval_email_tracking.sql) : sans elle, le rattrapage
    // d'Admin → Paramètres ne saurait pas qui a déjà reçu l'e-mail. Sans la colonne, on continue.
    if (emailSent) {
      const { error: trackError } = await db.from("profiles").update({ approval_email_sent_at: new Date().toISOString() }).eq("id", id);
      if (trackError) console.warn("[approve] envoi de l'e-mail non enregistré:", trackError.message);
    }

    // Log the action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(
      admin.adminId,
      admin.email,
      "user_approved",
      "user",
      id,
      { user_email: user.email, user_name: user.name },
      ip
    );

    return NextResponse.json({ ok: true, message: "Utilisateur approuvé avec succès.", emailSent, emailError: emailSent ? null : getLastEmailError() });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin approve API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}