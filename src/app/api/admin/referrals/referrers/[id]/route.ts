// GET /api/admin/referrals/referrers/[id] — détail d'un parrain : tous ses
// filleuls (avec statut de compte/parrainage, dates, motif de rejet,
// récompense à laquelle ils ont contribué) et toutes ses récompenses (avec
// sources exactes, fenêtre d'activation, révocations). Aucune donnée
// personnelle dupliquée : tout est lu en direct depuis `profiles`.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();

    const { data: referrer } = await db.from("profiles").select("id, name, pseudo, avatar_url, status").eq("id", id).maybeSingle();
    if (!referrer) return NextResponse.json({ error: "Parrain introuvable." }, { status: 404 });

    const { data: code } = await db.from("referral_codes").select("code, is_active, created_at").eq("user_id", id).maybeSingle();

    const { data: referrals } = await db
      .from("referrals")
      .select("id, referred_user_id, status, created_at, validated_at, rejected_at, rejection_reason, rewarded, flagged_fraud")
      .eq("referrer_id", id)
      .order("created_at", { ascending: false });

    const referredIds = (referrals || []).map((r) => r.referred_user_id as string);
    const { data: referredProfiles } = referredIds.length
      ? await db.from("profiles").select("id, name, pseudo, avatar_url, status, created_at").in("id", referredIds)
      : { data: [] as any[] };
    const profileById = new Map((referredProfiles || []).map((p) => [p.id as string, p]));

    const { data: sources } = referredIds.length
      ? await db.from("referral_reward_sources").select("reward_id, referral_id").in("referral_id", (referrals || []).map((r) => r.id))
      : { data: [] as any[] };
    const rewardIdByReferralId = new Map((sources || []).map((s) => [s.referral_id as string, s.reward_id as string]));

    const { data: rewards } = await db
      .from("referral_rewards")
      .select("id, duration_days, status, granted_at, activated_at, expires_at, remaining_duration, revoked_reason, revoked_by")
      .eq("user_id", id)
      .order("granted_at", { ascending: false });

    const referredList = (referrals || []).map((r) => {
      const profile = profileById.get(r.referred_user_id as string);
      return {
        referralId: r.id,
        referredUserId: r.referred_user_id,
        name: profile?.name || null,
        pseudo: profile?.pseudo || null,
        avatarUrl: profile?.avatar_url || null,
        accountStatus: profile?.status || null,
        accountCreatedAt: profile?.created_at || null,
        referralStatus: r.status,
        createdAt: r.created_at,
        validatedAt: r.validated_at,
        rejectedAt: r.rejected_at,
        rejectionReason: r.rejection_reason,
        flaggedFraud: r.flagged_fraud,
        contributedToRewardId: rewardIdByReferralId.get(r.id as string) || null,
      };
    });

    return NextResponse.json({
      referrer: { id: referrer.id, name: referrer.name, pseudo: referrer.pseudo, avatarUrl: referrer.avatar_url, accountStatus: referrer.status },
      code: code ? { code: code.code, isActive: code.is_active, createdAt: code.created_at } : null,
      referred: referredList,
      rewards: (rewards || []).map((r) => ({
        id: r.id,
        durationDays: r.duration_days,
        status: r.status,
        grantedAt: r.granted_at,
        activatedAt: r.activated_at,
        expiresAt: r.expires_at,
        remainingDuration: r.remaining_duration,
        revokedReason: r.revoked_reason,
        revokedBy: r.revoked_by,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referrer detail error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
