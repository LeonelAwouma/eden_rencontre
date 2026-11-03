// POST /api/admin/referrals/[id]/approve — forçage admin d'un parrainage
// (après vérification manuelle). Appelle le même chemin que le
// déclenchement automatique (validate_referral_and_maybe_grant +
// recompute_referral_rewards), jamais un code dupliqué.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();

    const { data: rewardId, error } = await db.rpc("validate_referral_and_maybe_grant", { p_referral_id: id });
    if (error) {
      console.error("Admin referral approve error:", error.message);
      return NextResponse.json({ error: "Erreur lors de l'approbation du parrainage." }, { status: 500 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "referral_approved", "user", id, { reward_granted: !!rewardId }, ip);

    return NextResponse.json({ ok: true, rewardGranted: !!rewardId });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referral approve API error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
