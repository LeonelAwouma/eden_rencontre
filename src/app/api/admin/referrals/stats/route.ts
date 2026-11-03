// GET /api/admin/referrals/stats — KPI de la vue générale « Parrainages et
// récompenses ». Toutes les valeurs viennent de Supabase ; aucune donnée
// fictive. Le taux de transformation GOLD→payant reste explicitement
// indisponible tant qu'aucune passerelle de paiement n'existe.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const [{ count: totalReferrals }, { count: validated }, { count: pending }, { count: rejected }, { count: rewardsGranted }, { count: creditsActive }, { count: creditsQueued }] =
      await Promise.all([
        db.from("referrals").select("id", { count: "exact", head: true }),
        db.from("referrals").select("id", { count: "exact", head: true }).eq("status", "validated"),
        db.from("referrals").select("id", { count: "exact", head: true }).in("status", ["pending", "under_review"]),
        db.from("referrals").select("id", { count: "exact", head: true }).eq("status", "rejected"),
        db.from("referral_rewards").select("id", { count: "exact", head: true }),
        db.from("referral_rewards").select("id", { count: "exact", head: true }).eq("status", "active"),
        db.from("referral_rewards").select("id", { count: "exact", head: true }).eq("status", "pending_activation"),
      ]);

    const { data: activeReferrers } = await db.from("referrals").select("referrer_id");
    const activeReferrerCount = new Set((activeReferrers || []).map((r) => r.referrer_id)).size;

    return NextResponse.json({
      activeReferrers: activeReferrerCount,
      totalReferrals: totalReferrals || 0,
      validated: validated || 0,
      pending: pending || 0,
      rejected: rejected || 0,
      rewardsGranted: rewardsGranted || 0,
      creditsActive: creditsActive || 0,
      creditsQueued: creditsQueued || 0,
      conversionRateUnavailable: true, // taux de transformation GOLD→payant : pas de passerelle de paiement
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referrals stats error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
