import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendAccountRejectedEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || undefined;

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

    // Update status to rejected
    const { error: updateError } = await db
      .from("profiles")
      .update({
        status: "rejected",
        reviewed_by: admin.adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error rejecting user:", updateError);
      return NextResponse.json(
        { error: "Erreur lors du rejet." },
        { status: 500 }
      );
    }

    // Send rejection email
    if (user.email) {
      await sendAccountRejectedEmail(user.email, user.name || "Membre", reason);
    }

    // Log the action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(
      admin.adminId,
      admin.email,
      "user_rejected",
      "user",
      id,
      { user_email: user.email, user_name: user.name, reason },
      ip
    );

    return NextResponse.json({ ok: true, message: "Utilisateur rejeté." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin reject API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}