/**
 * Réinitialisation de mot de passe assistée par l'administrateur (comptes « téléphone seul »).
 *
 * Aucun OTP, aucun SMS. Parcours :
 *   1. le membre saisit son numéro sur « Mot de passe oublié » → demande `pending` ;
 *   2. l'admin vérifie son identité à la main puis approuve : un jeton aléatoire est
 *      généré, SEUL SON HACHAGE est stocké, et le lien est montré une fois à l'admin
 *      pour qu'il le transmette (WhatsApp) ;
 *   3. le membre ouvre le lien, choisit lui-même son mot de passe (l'admin ne le connaît
 *      jamais) → la demande passe à `used`. Lien expirant (1 h) et à usage unique.
 * Le statut d'approbation du compte (profiles.status) n'est jamais touché.
 * Table : password_reset_requests (supabase/migrations/20261111_phone_signup.sql).
 */

import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Préfixe des jetons émis par l'admin : les distingue du jeton HMAC du parcours OTP e-mail. */
export const ADMIN_RESET_TOKEN_PREFIX = "ar_";
/** Durée de validité du lien après approbation. */
export const ADMIN_RESET_LINK_TTL_MS = 60 * 60 * 1000;

export type ResetRequestStatus = "pending" | "approved" | "rejected" | "used" | "expired";

export interface ResetRequestRow {
  id: string;
  user_id: string;
  phone: string | null;
  status: ResetRequestStatus;
  note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

export function isAdminResetToken(token: unknown): token is string {
  return typeof token === "string" && token.startsWith(ADMIN_RESET_TOKEN_PREFIX);
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Jeton aléatoire (256 bits) : le clair n'est jamais stocké. */
export function generateAdminResetToken(): { token: string; hash: string } {
  const token = `${ADMIN_RESET_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashResetToken(token) };
}

/** Statut effectif : une demande approuvée dont le lien a expiré compte comme expirée. */
export function effectiveStatus(row: Pick<ResetRequestRow, "status" | "expires_at">, now = Date.now()): ResetRequestStatus {
  if (row.status === "approved" && row.expires_at && new Date(row.expires_at).getTime() <= now) return "expired";
  return row.status;
}

/**
 * Crée une demande `pending` pour un compte « téléphone seul ».
 * Retourne false si le numéro ne correspond à aucun compte sans e-mail, ou si une demande
 * est déjà en attente (index unique) : l'appelant répond de façon identique dans tous les cas.
 */
export async function createResetRequestForPhone(db: SupabaseClient, phone: string): Promise<boolean> {
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, name, phone")
    .eq("phone", phone)
    .maybeSingle();
  // Un compte avec e-mail réinitialise son mot de passe par le parcours e-mail.
  if (!profile || profile.email) return false;

  const { error } = await db.from("password_reset_requests").insert({ user_id: profile.id, phone, status: "pending" });
  if (error) {
    if (error.code !== "23505") console.error("[password-reset] création de la demande:", error.message);
    return false;
  }

  try {
    await db.from("admin_notifications").insert({
      type: "user",
      title: "Demande de réinitialisation",
      message: `${profile.name || "Un membre"} (${phone}) demande la réinitialisation de son mot de passe.`,
      link: "/admin/password-resets",
      metadata: { user_id: profile.id, phone, kind: "password_reset_request" },
    });
  } catch (e) {
    console.error("[password-reset] notification admin:", e);
  }
  return true;
}

/**
 * Consomme un jeton admin : vérifie le haché, le statut `approved`, l'expiration et l'usage
 * unique, puis marque la demande `used` en une seule écriture conditionnelle (deux envois
 * simultanés du même lien : un seul passe). Retourne null si le jeton n'est pas utilisable.
 */
export async function consumeAdminResetToken(
  db: SupabaseClient,
  token: string,
  now = new Date(),
): Promise<{ requestId: string; userId: string } | null> {
  if (!isAdminResetToken(token)) return null;
  const { data, error } = await db
    .from("password_reset_requests")
    .update({ status: "used", used_at: now.toISOString() })
    .eq("token_hash", hashResetToken(token))
    .eq("status", "approved")
    .gt("expires_at", now.toISOString())
    .select("id, user_id")
    .maybeSingle();
  if (error || !data) return null;
  return { requestId: data.id as string, userId: data.user_id as string };
}

/** Rend le jeton de nouveau utilisable si le changement de mot de passe a échoué après la consommation. */
export async function releaseAdminResetToken(db: SupabaseClient, requestId: string): Promise<void> {
  await db.from("password_reset_requests").update({ status: "approved", used_at: null }).eq("id", requestId).eq("status", "used");
}

/** Trace de l'usage du lien (sans administrateur : action du membre), dans le journal d'audit. */
export async function logResetUsed(db: SupabaseClient, userId: string, requestId: string, ip: string | null): Promise<void> {
  const { error } = await db.from("admin_audit_log").insert({
    admin_id: null,
    admin_email: "membre (lien de réinitialisation)",
    action: "password_reset_used",
    target_type: "user",
    target_id: userId,
    details: { request_id: requestId },
    ip_address: ip,
  });
  if (error) console.error("[password-reset] audit de l'usage:", error.message);
}
