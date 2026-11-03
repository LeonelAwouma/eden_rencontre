// POST /api/admin/referrals/[id]/reject — { reason } (obligatoire).

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
    const { data: referral } = await db.from("referrals").select("status").eq("id", id).maybeSingle();
    if (!referral) return NextResponse.json({ error: "Parrainage introuvable." }, { status: 404 });

    const { error } = await db
      .from("referrals")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", id)
      .in("status", ["pending", "under_review"]);
    if (error) return NextResponse.json({ error: "Erreur lors du refus." }, { status: 500 });

    await db.from("referral_status_history").insert({ referral_id: id, from_status: referral.status, to_status: "rejected", reason });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "referral_rejected", "user", id, { reason }, ip);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referral reject API error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
