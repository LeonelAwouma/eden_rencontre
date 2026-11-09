import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/admin/password-resets/[id]/reject — refuse la demande (identité non confirmée).
 * Le compte reste inchangé ; un éventuel lien déjà émis est invalidé (jeton effacé).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

    const { data, error } = await db
      .from("password_reset_requests")
      .update({
        status: "rejected",
        token_hash: null,
        expires_at: null,
        note,
        decided_by: admin.email,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id)
      .in("status", ["pending", "approved", "expired"])
      .select("id, user_id, phone")
      .maybeSingle();

    if (error) {
      console.error("Admin password-reset reject error:", error);
      return NextResponse.json({ error: "Erreur lors du refus." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Demande introuvable ou déjà traitée." }, { status: 404 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "password_reset_rejected", "user", data.user_id, { request_id: data.id, phone: data.phone, note }, ip);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin password-reset reject error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
