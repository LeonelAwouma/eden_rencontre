// ── Newsletter du blog ───────────────────────────────────────────
// Audience d'un article : membres approuvés (abonnés d'office) + visiteurs
// inscrits depuis /blog, moins les adresses désabonnées. Les e-mails partent
// de contact@gardenofalliance.com via email.ts.
//
// Serveur uniquement (rôle service, secret de signature).

import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";
import { getSessionSecret } from "./session-secret";
import { blogPostNewsletterEmail } from "./email-templates";
import { sendNewsletterEmails } from "./email";

type Db = ReturnType<typeof getSupabaseAdmin>;

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://gardenofalliance.com").replace(/\/$/, "");

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Jeton de désabonnement signé : aucun stockage, valable pour les membres comme pour les abonnés publics. */
export function unsubscribeToken(email: string): string {
  return createHmac("sha256", getSessionSecret()).update(`newsletter:${normalizeEmail(email)}`).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token || "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Lien de désabonnement (page de confirmation, et cible POST du désabonnement en un clic). */
export function unsubscribeUrl(email: string): string {
  const e = normalizeEmail(email);
  return `${appUrl()}/newsletter/desabonnement?e=${encodeURIComponent(e)}&t=${unsubscribeToken(e)}`;
}

/** Table ou colonne absente : la migration 20260924_blog_newsletter.sql n'a pas encore été appliquée. */
export function isMissingSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code || "")) return true;
  const msg = error.message || "";
  return /newsletter/.test(msg) && /does not exist|could not find/i.test(msg);
}

async function approvedMemberEmails(db: Db): Promise<string[]> {
  const emails: string[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db.from("profiles").select("email").eq("status", "approved").range(from, from + page - 1);
    if (error) throw error;
    for (const row of data || []) if (row.email) emails.push(normalizeEmail(row.email));
    if (!data || data.length < page) return emails;
  }
}

async function subscriberRows(db: Db): Promise<{ email: string; status: string }[]> {
  const rows: { email: string; status: string }[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db.from("newsletter_subscribers").select("email, status").range(from, from + page - 1);
    if (error) {
      if (isMissingSchema(error)) return rows;
      throw error;
    }
    rows.push(...(data || []));
    if (!data || data.length < page) return rows;
  }
}

export interface NewsletterAudience {
  emails: string[];
  members: number;
  subscribers: number;
  unsubscribed: number;
}

export async function getNewsletterAudience(db: Db = getSupabaseAdmin()): Promise<NewsletterAudience> {
  const [members, rows] = await Promise.all([approvedMemberEmails(db), subscriberRows(db)]);
  const unsubscribed = new Set(rows.filter(r => r.status === "unsubscribed").map(r => normalizeEmail(r.email)));
  const publicActive = rows.filter(r => r.status === "active").map(r => normalizeEmail(r.email));
  const emails = [...new Set([...members, ...publicActive])].filter(e => e && isValidEmail(e) && !unsubscribed.has(e));
  return {
    emails,
    members: new Set(members.filter(e => !unsubscribed.has(e))).size,
    subscribers: new Set(publicActive).size,
    unsubscribed: unsubscribed.size,
  };
}

export type SendPostResult =
  | { ok: true; sent: number; audience: number }
  | { ok: false; reason: "not_found" | "not_published" | "already_sent" | "error"; error?: string };

/**
 * Envoie un article publié à toute l'audience. `newsletter_sent_at` est posé
 * avant l'envoi : deux publications simultanées ne doublent pas les e-mails.
 * `force` permet un renvoi volontaire depuis l'admin.
 */
export async function sendPostNewsletter(postId: string, { force = false } = {}): Promise<SendPostResult> {
  const db = getSupabaseAdmin();
  try {
    const { data: post } = await db.from("blog_posts")
      .select("id, title, slug, excerpt, cover_image_url, author, status").eq("id", postId).maybeSingle();
    if (!post) return { ok: false, reason: "not_found" };
    if (post.status !== "published") return { ok: false, reason: "not_published" };

    let tracked = true;
    let claim = db.from("blog_posts").update({ newsletter_sent_at: new Date().toISOString(), newsletter_recipients: null }).eq("id", postId);
    if (!force) claim = claim.is("newsletter_sent_at", null);
    const { data: claimed, error: claimError } = await claim.select("id");
    if (claimError) {
      if (!isMissingSchema(claimError)) throw claimError;
      tracked = false; // colonnes absentes : on envoie quand même, sans protection contre le doublon
    } else if (!claimed || claimed.length === 0) {
      return { ok: false, reason: "already_sent" };
    }

    const audience = await getNewsletterAudience(db);
    const postUrl = `${appUrl()}/blog/${post.slug}`;
    const sent = await sendNewsletterEmails(audience.emails.map(to => {
      const unsubscribe = unsubscribeUrl(to);
      return {
        to,
        unsubscribeUrl: unsubscribe,
        rendered: blogPostNewsletterEmail({
          title: post.title, excerpt: post.excerpt, coverImageUrl: post.cover_image_url,
          author: post.author, postUrl, unsubscribeUrl: unsubscribe,
        }),
      };
    }));

    if (tracked) {
      // Rien n'est parti (SMTP en panne…) : on libère l'article pour permettre un nouvel essai.
      const failed = sent === 0 && audience.emails.length > 0;
      await db.from("blog_posts")
        .update(failed ? { newsletter_sent_at: null, newsletter_recipients: null } : { newsletter_recipients: sent })
        .eq("id", postId);
    }
    console.log(`[Newsletter] « ${post.title} » : ${sent}/${audience.emails.length} e-mail(s) envoyé(s).`);
    return { ok: true, sent, audience: audience.emails.length };
  } catch (err) {
    console.error("[Newsletter] Échec de l'envoi :", err);
    return { ok: false, reason: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Envoi après la réponse HTTP : l'admin n'attend pas la fin des envois SMTP. */
export function schedulePostNewsletter(postId: string, options?: { force?: boolean }) {
  after(() => sendPostNewsletter(postId, options).then(() => undefined));
}
