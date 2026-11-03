/**
 * GET /api/cron/referral-review — contrôle quotidien du parrainage (Vercel
 * Cron, planifié dans vercel.json). Protégée par CRON_SECRET, même patron
 * que /api/cron/account-health.
 *
 * Trois rôles :
 * 1. Réévaluer les parrainages `under_review` dont seul le délai de
 *    vérification restait à écouler (aucun autre événement ne le
 *    déclencherait sinon).
 * 2. Rattrapage : tout parrain ayant déjà assez de filleuls validés-non-
 *    récompensés se voit octroyer sa récompense (filet de sécurité).
 * 3. Balayage de suspension des crédits GOLD devenus redondants (promo/
 *    découverte/abonnement payant survenu depuis), et notifications
 *    d'expiration/fin de crédit.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { reevaluateReferral, catchUpUnrewardedReferrers } from "@/lib/referrals";
import { sweepSuspendRedundantCredits } from "@/lib/subscription/effective";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = getSupabaseAdmin();

  // 1. Parrainages en attente dont le délai de vérification est écoulé.
  const { data: underReview } = await db.from("referrals").select("referred_user_id").eq("status", "under_review");
  let reevaluated = 0;
  for (const row of underReview || []) {
    await reevaluateReferral(db, row.referred_user_id as string);
    reevaluated++;
  }

  // 2. Rattrapage des récompenses non attribuées malgré un seuil atteint.
  const granted = await catchUpUnrewardedReferrers(db);

  // 3. Suspension des crédits devenus redondants.
  const suspended = await sweepSuspendRedundantCredits(db);

  // Notifications d'expiration proche / fin de crédit.
  const now = Date.now();
  const soon = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiringSoon } = await db
    .from("referral_rewards")
    .select("id, user_id, expires_at")
    .eq("status", "active")
    .lte("expires_at", soon)
    .gt("expires_at", new Date(now).toISOString());
  for (const r of expiringSoon || []) {
    try {
      await db.from("meeting_notifications").insert({
        user_id: r.user_id,
        notification_type: "referral_reward_expiring_soon",
        title: "Vos jours GOLD arrivent à expiration",
        message: "Votre crédit GOLD de parrainage expire dans moins de 3 jours. Profitez-en pleinement !",
      });
    } catch { /* non bloquant */ }
  }

  const { data: justExpired } = await db
    .from("referral_rewards")
    .select("id, user_id")
    .eq("status", "active")
    .lte("expires_at", new Date(now).toISOString());
  for (const r of justExpired || []) {
    await db.from("referral_rewards").update({ status: "expired" }).eq("id", r.id);
    try {
      await db.from("meeting_notifications").insert({
        user_id: r.user_id,
        notification_type: "referral_reward_ended",
        title: "Votre période GOLD de parrainage est terminée",
        message: "Vos 30 jours GOLD offerts par le parrainage sont arrivés à leur terme. Merci d'avoir fait découvrir Garden of Alliance !",
      });
    } catch { /* non bloquant */ }
  }

  console.log(`[cron/referral-review] réévalués=${reevaluated} octrois_rattrapés=${granted} suspendus=${suspended} expirés=${justExpired?.length ?? 0}`);
  return NextResponse.json({ ok: true, reevaluated, granted, suspended, expired: justExpired?.length ?? 0 });
}
