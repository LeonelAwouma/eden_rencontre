// POST /api/admin/referrals/rewards/[id]/revoke — { reason } (obligatoire).
// Révoque une récompense frauduleuse. Guichet atomique sur l'état courant :
// seule une récompense encore `pending_activation`/`active` peut être
// révoquée. Si elle était `active`, getEffectiveSubscription retombe
// naturellement au niveau réel au prochain calcul — aucune logique de
// "rétrogradation" séparée nécessaire.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return NextResponse.json({ error: "Un motif est requis." }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("referral_rewards")
      .update({ status: "revoked", revoked_reason: reason, revoked_by: admin.email, activated_at: null, expires_at: null })
      .eq("id", id)
      .in("status", ["pending_activation", "active"])
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Erreur lors de la révocation." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Récompense introuvable ou déjà révoquée/expirée." }, { status: 409 });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "referral_reward_revoked", "user", id, { reason }, ip);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin reward revoke API error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
