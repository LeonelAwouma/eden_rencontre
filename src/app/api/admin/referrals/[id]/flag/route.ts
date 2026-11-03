// POST /api/admin/referrals/[id]/flag — { reason } (obligatoire). Signale un
// parrainage suspect : déclenche sa réévaluation, qui le rejette (fraude
// confirmée par un admin — jamais déduit automatiquement d'une IP partagée).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { reevaluateReferral } from "@/lib/referrals";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return NextResponse.json({ error: "Un motif est requis." }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: referral } = await db.from("referrals").select("referred_user_id").eq("id", id).maybeSingle();
    if (!referral) return NextResponse.json({ error: "Parrainage introuvable." }, { status: 404 });

    const { error } = await db.from("referrals").update({ flagged_fraud: true, flagged_reason: reason }).eq("id", id);
    if (error) return NextResponse.json({ error: "Erreur lors du signalement." }, { status: 500 });

    await reevaluateReferral(db, referral.referred_user_id as string);

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "referral_flagged", "user", id, { reason }, ip);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referral flag API error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
