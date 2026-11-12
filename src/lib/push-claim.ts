// Journal des envois push (push_log) : prise en charge atomique, puis « sent » ou « failed ».
// Un événement déjà « sent » n'est jamais renvoyé ; « failed » ou une prise en charge abandonnée (« claimed » périmé)
// peut être reprise par UNE SEULE exécution (UPDATE conditionnel + RETURNING). Voir 20261112_coach_member_notifications.sql.
// Limite assumée : en cas de livraison partielle (certains appareils ont reçu), l'événement est « sent » et non repris.

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { PushResult } from "@/lib/push-server";

type Db = ReturnType<typeof getSupabaseAdmin>;

export const PUSH_CLAIM_STALE_MS = 10 * 60 * 1000;

export type PushClaim = "claimed" | "legacy" | "duplicate" | "error";
export type PushOutcome = "sent" | "failed";

/** Échec complet = rien n'a été livré et au moins une erreur temporaire ; sinon l'événement est considéré traité. */
export function pushOutcome(r: PushResult): PushOutcome {
  return r.sent === 0 && r.failed > 0 ? "failed" : "sent";
}

export async function claimPushEvent(db: Db, source: string, ref: string, now: Date = new Date()): Promise<PushClaim> {
  const iso = now.toISOString();
  const { error } = await db.from("push_log").insert({ source, ref, status: "claimed", claimed_at: iso });
  if (!error) return "claimed";

  if (error.code === "42703") {
    // Migration 20261112 pas encore appliquée : comportement historique (une seule tentative).
    const legacy = await db.from("push_log").insert({ source, ref });
    if (!legacy.error) return "legacy";
    return legacy.error.code === "23505" ? "duplicate" : "error";
  }
  if (error.code !== "23505") return "error";

  // Déjà connu : reprise atomique si l'envoi précédent a échoué ou a été abandonné.
  const staleBefore = new Date(now.getTime() - PUSH_CLAIM_STALE_MS).toISOString();
  const { data, error: upError } = await db.from("push_log")
    .update({ status: "claimed", claimed_at: iso })
    .eq("source", source).eq("ref", ref)
    .or(`status.eq.failed,and(status.eq.claimed,claimed_at.lt.${staleBefore})`)
    .select("ref");
  if (upError) return "error";
  return data && data.length > 0 ? "claimed" : "duplicate";
}

export async function finishPushEvent(db: Db, source: string, ref: string, outcome: PushOutcome, claim: PushClaim): Promise<void> {
  if (claim !== "claimed") return; // « legacy » : pas de colonne status
  const { error } = await db.from("push_log").update({ status: outcome }).eq("source", source).eq("ref", ref);
  if (error) console.warn("[push/dispatch] journal non mis à jour:", error.message);
}
