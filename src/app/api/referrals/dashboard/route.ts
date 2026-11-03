// GET /api/referrals/dashboard — tableau de bord du parrain connecté.
// Jamais de nom complet/email/téléphone du filleul : uniquement des
// compteurs et des statuts anonymisés (ex. « Filleul #2 »).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { getEffectiveSubscription } from "@/lib/subscription/effective";

export async function GET(request: NextRequest) {
  const user = await getApprovedUser(request);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const db = getSupabaseAdmin();

  const { data: config } = await db.from("platform_settings").select("key, value").eq("category", "referral");
  const cfgRow = (key: string) => (config || []).find((r) => r.key === key)?.value;
  const requiredReferrals = typeof cfgRow("required_referrals") === "number" ? (cfgRow("required_referrals") as number) : 3;
  const enabled = cfgRow("enabled") === true;

  const { data: referrals } = await db
    .from("referrals")
    .select("id, status, created_at, validated_at, rejected_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const rows = referrals || [];
  const validatedCount = rows.filter((r) => r.status === "validated").length;
  const pendingCount = rows.filter((r) => r.status === "pending" || r.status === "under_review").length;
  const rejectedCount = rows.filter((r) => r.status === "rejected").length;

  const { data: rewards } = await db
    .from("referral_rewards")
    .select("id, duration_days, status, granted_at, activated_at, expires_at")
    .eq("user_id", user.id)
    .order("granted_at", { ascending: false });

  const effective = await getEffectiveSubscription(db, user.id);

  const history = rows.map((r, i) => ({
    label: `Filleul #${rows.length - i}`,
    status: r.status,
    createdAt: r.created_at,
    validatedAt: r.validated_at,
    rejectedAt: r.rejected_at,
  }));

  return NextResponse.json({
    enabled,
    requiredReferrals,
    signupsCount: rows.length,
    validatedCount,
    pendingCount,
    rejectedCount,
    progressTowardNext: validatedCount % requiredReferrals,
    rewards: (rewards || []).map((r) => ({
      durationDays: r.duration_days,
      status: r.status,
      grantedAt: r.granted_at,
      activatedAt: r.activated_at,
      expiresAt: r.expires_at,
    })),
    goldActiveUntil: effective.goldUntil,
    effectiveTier: effective.tier,
    effectiveSource: effective.source,
    queuedCreditsDays: effective.queuedCreditsDays,
    history,
  });
}
