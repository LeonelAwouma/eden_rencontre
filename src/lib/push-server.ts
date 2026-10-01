// Notifications push — envoi côté serveur (routes API uniquement).
// Clés VAPID à définir dans les variables d'environnement (Vercel) :
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
// Génération : npx web-push generate-vapid-keys

import webpush from "web-push";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = ReturnType<typeof getSupabaseAdmin>;

export interface PushContent {
  title: string;
  body: string;
  /** Page ouverte au toucher de la notification. */
  url: string;
  /** Même tag = la nouvelle notification remplace la précédente (ex. une conversation). */
  tag?: string;
}

let configured: boolean | null = null;

export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@gardenofalliance.com", publicKey, privateKey);
  return (configured = true);
}

/**
 * Envoie à tous les téléphones / navigateurs des membres indiqués.
 * `content` reçoit la langue choisie à l'abonnement (fr / en).
 * Les abonnements expirés (404 / 410) sont supprimés.
 */
export async function sendPushToUsers(
  db: Db,
  userIds: string[],
  content: (locale: "fr" | "en") => PushContent
): Promise<{ sent: number; removed: number }> {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, removed: 0 };

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, locale")
    .in("user_id", userIds);

  let sent = 0;
  const stale: string[] = [];
  const used: string[] = [];

  await Promise.all((subs || []).map(async (s) => {
    const locale = s.locale === "en" ? "en" : "fr";
    const c = content(locale);
    const payload = JSON.stringify({
      title: c.title,
      body: c.body.length > 180 ? `${c.body.slice(0, 177)}…` : c.body,
      url: c.url,
      tag: c.tag,
    });
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: "high" }
      );
      sent++;
      used.push(s.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) stale.push(s.id);
      else console.warn("[push] envoi échoué:", status, (err as Error).message);
    }
  }));

  if (stale.length) await db.from("push_subscriptions").delete().in("id", stale);
  if (used.length) await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", used);
  return { sent, removed: stale.length };
}
