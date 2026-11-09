import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_RESET_LINK_TTL_MS, generateAdminResetToken } from "@/lib/password-reset-requests";

/**
 * POST /api/admin/password-resets/[id]/approve
 *
 * Après vérification manuelle de l'identité : génère un lien de réinitialisation à usage
 * unique (1 h). Seul le haché du jeton est conservé ; le lien est renvoyé UNE fois, pour que
 * l'admin le transmette au membre. Rappeler cette route sur une demande déjà approuvée émet
 * un nouveau lien et invalide l'ancien. Le mot de passe, lui, n'est jamais connu de l'admin
 * et profiles.status n'est pas modifié.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const { token, hash } = generateAdminResetToken();
    const now = new Date();
    const { data, error } = await db
      .from("password_reset_requests")
      .update({
        status: "approved",
        token_hash: hash,
        expires_at: new Date(now.getTime() + ADMIN_RESET_LINK_TTL_MS).toISOString(),
        decided_by: admin.email,
        decided_at: now.toISOString(),
        used_at: null,
      })
      .eq("id", id)
      .in("status", ["pending", "approved", "expired"])
      .select("id, user_id, phone")
      .maybeSingle();

    if (error) {
      console.error("Admin password-reset approve error:", error);
      return NextResponse.json({ error: "Erreur lors de l'approbation." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Demande introuvable ou déjà traitée." }, { status: 404 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "password_reset_approved", "user", data.user_id, { request_id: data.id, phone: data.phone }, ip);

    const origin = new URL(request.url).origin;
    return NextResponse.json({
      ok: true,
      link: `${origin}/reset-password?token=${encodeURIComponent(token)}`,
      expiresInMinutes: ADMIN_RESET_LINK_TTL_MS / 60000,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin password-reset approve error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
