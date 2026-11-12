// Programme de parrainage — logique serveur partagée (capture, éligibilité).
// Voir le plan feature/referral-gold-rewards pour le détail de chaque règle.

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { effectiveQuestionnaireCompletion } from "@/lib/onboarding";

type Db = ReturnType<typeof getSupabaseAdmin>;

export const REFERRAL_COOKIE = "eden_ref";
/** Fenêtre de validité du nonce d'intention — voir claim_referral_intent_and_record (SQL). */
export const REFERRAL_INTENT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Alphabet sans caractères ambigus (0/O, 1/I/L) — codes courts, difficiles à deviner. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export function isReferralCodeFormat(v: unknown): v is string {
  return typeof v === "string" && /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6,10}$/.test(v);
}

/**
 * Code personnel stable d'un membre approuvé — créé à la volée au premier
 * appel (jamais à l'inscription), un seul par utilisateur (index unique).
 */
export async function ensureReferralCode(db: Db, userId: string): Promise<string | null> {
  const { data: existing } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await db
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .single();
    if (!error && data) return data.code;
    if (error && error.code !== "23505") {
      console.error("[referrals] création du code impossible:", error.message);
      return null;
    }
    // 23505 : collision de code (rare) ou code déjà créé par un appel concurrent — on relit.
    const { data: afterConflict } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (afterConflict?.code) return afterConflict.code;
  }
  return null;
}

/**
 * Capture pour le flux classique et pour l'atterrissage Google — appel RPC
 * atomique unique (claim_referral_intent_and_record, voir la migration SQL) :
 * consommation du nonce ET création de la relation parrain-filleul dans une
 * seule transaction. Jamais bloquant pour l'inscription en cas d'échec.
 */
export async function captureReferral(db: Db, nonce: string, referredUserId: string): Promise<void> {
  try {
    await db.rpc("claim_referral_intent_and_record", { p_nonce: nonce, p_referred_user_id: referredUserId });
  } catch (err) {
    console.error("[referrals] capture impossible:", err);
  }
  // Notification « filleul enregistré » — informative uniquement, non bloquante.
  try {
    const { data: referral } = await db
      .from("referrals")
      .select("referrer_id")
      .eq("referred_user_id", referredUserId)
      .maybeSingle();
    if (referral?.referrer_id) {
      await db.from("meeting_notifications").insert({
        user_id: referral.referrer_id,
        notification_type: "referral_signup",
        title: "Un nouveau filleul s'est inscrit !",
        message: "Quelqu'un vient de s'inscrire via votre lien de parrainage. Vous le retrouverez dans votre tableau de bord « Parrainage ».",
      });
    }
  } catch { /* non bloquant */ }
}

interface ReferralConfig {
  reviewDelayDays: number;
}
async function readReferralConfig(db: Db): Promise<ReferralConfig> {
  const { data } = await db.from("platform_settings").select("key, value").eq("category", "referral");
  const row = (key: string) => (data || []).find((r) => r.key === key)?.value;
  return { reviewDelayDays: typeof row("review_delay_days") === "number" ? (row("review_delay_days") as number) : 7 };
}

async function insertHistory(db: Db, referralId: string, from: string | null, to: string, reason: string) {
  try {
    await db.from("referral_status_history").insert({ referral_id: referralId, from_status: from, to_status: to, reason });
  } catch { /* non bloquant */ }
}

async function notifyReferrer(db: Db, referrerId: string, type: string, title: string, message: string) {
  try {
    await db.from("meeting_notifications").insert({ user_id: referrerId, notification_type: type, title, message });
  } catch { /* non bloquant */ }
}

/**
 * Réévalue l'ensemble des conditions d'éligibilité d'un filleul, à chaque
 * appel, sans jamais supposer quelle condition vient de changer (ordre-
 * indépendant par construction). Aucun point d'accroche partagé n'existe
 * entre l'approbation admin et la fin du questionnaire : cette fonction doit
 * être appelée explicitement aux deux endroits, plus par le cron quotidien
 * (délai de 7 jours qui s'écoule seul).
 */
export async function reevaluateReferral(db: Db, referredUserId: string): Promise<void> {
  const { data: referral } = await db
    .from("referrals")
    .select("id, referrer_id, status, created_at, flagged_fraud, flagged_reason")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();
  if (!referral || referral.status === "validated" || referral.status === "rejected") return;

  const { data: profile } = await db
    .from("profiles")
    .select("status, onboarding_completed, questionnaire, marriage_vision")
    .eq("id", referredUserId)
    .maybeSingle();
  if (!profile) return;

  if (profile.status === "rejected" || profile.status === "suspended" || referral.flagged_fraud) {
    const reason = referral.flagged_fraud
      ? referral.flagged_reason || "Fraude confirmée par un administrateur."
      : `Compte filleul ${profile.status}.`;
    const { error } = await db
      .from("referrals")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", referral.id)
      .in("status", ["pending", "under_review"]);
    if (!error) await insertHistory(db, referral.id, referral.status, "rejected", reason);
    return;
  }

  const approved = profile.status === "approved";
  const questionnaire = effectiveQuestionnaireCompletion((profile.questionnaire as Record<string, unknown>) || {}, profile, { excludeOptional: true });
  const questionnaireDone = questionnaire.total > 0 && questionnaire.percentage === 100 && !!profile.onboarding_completed;

  const cfg = await readReferralConfig(db);
  const reviewDelayElapsed = Date.now() - new Date(referral.created_at).getTime() >= cfg.reviewDelayDays * 24 * 60 * 60 * 1000;

  const allConditionsMet = approved && questionnaireDone && reviewDelayElapsed;

  if (!allConditionsMet) {
    if (referral.status === "pending") {
      await db.from("referrals").update({ status: "under_review" }).eq("id", referral.id).eq("status", "pending");
      await insertHistory(db, referral.id, "pending", "under_review", "Conditions pas encore toutes réunies.");
    }
    return;
  }

  // Transition + recalcul de l'octroi dans une seule transaction Postgres
  // (validate_referral_and_maybe_grant, voir la migration SQL) — élimine
  // toute fenêtre de race même si plusieurs filleuls sont réévalués au même instant.
  const { data: rewardId } = await db.rpc("validate_referral_and_maybe_grant", { p_referral_id: referral.id });

  await notifyReferrer(
    db,
    referral.referrer_id,
    "referral_validated",
    "Un parrainage validé !",
    "Un de vos filleuls remplit désormais toutes les conditions. Consultez votre progression dans « Parrainage »."
  );

  if (rewardId) {
    await notifyReferrer(
      db,
      referral.referrer_id,
      "referral_reward_granted",
      "30 jours GOLD en réserve !",
      "Félicitations, vous avez atteint le seuil de parrainages requis : 30 jours GOLD sont désormais en réserve sur votre compte, activés automatiquement dès que vous en aurez besoin."
    );
    try {
      await db.from("admin_notifications").insert({
        type: "user",
        title: "Récompense de parrainage attribuée",
        message: `Le parrain (${referral.referrer_id}) a atteint le seuil requis et a reçu un crédit GOLD de parrainage.`,
        link: `/admin/referrals/referrers/${referral.referrer_id}`,
        metadata: { kind: "referral_reward", referrer_id: referral.referrer_id, reward_id: rewardId },
      });
    } catch { /* non bloquant */ }
  }
}

/** Rattrapage : tout parrain dont le compte de filleuls validés-non-récompensés atteint déjà le seuil. */
export async function catchUpUnrewardedReferrers(db: Db): Promise<number> {
  const { data } = await db.from("referrals").select("referrer_id").eq("status", "validated").eq("rewarded", false);
  const referrerIds = [...new Set((data || []).map((r) => r.referrer_id as string))];
  let granted = 0;
  for (const referrerId of referrerIds) {
    const { data: rewardId } = await db.rpc("recompute_referral_rewards", { p_referrer_id: referrerId });
    if (rewardId) granted++;
  }
  return granted;
}
