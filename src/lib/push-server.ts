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
  /** Type d'événement, lu par le service worker (ex. « message » : pas d'alerte si la conversation est déjà ouverte). */
  kind?: string;
  /** Conversation concernée (messages privés). */
  conversationId?: string;
  /**
   * Version sans nom ni contenu, envoyée aux appareils dont le membre a désactivé l'aperçu
   * (push_subscriptions.show_preview = false). Absente : le contenu normal est envoyé partout.
   */
  generic?: { title: string; body: string };
}

/**
 * `failed` = échecs temporaires (réseau, 5xx…), donc à reprendre ; `removed` = abonnements expirés (404/410),
 * définitivement sans objet ; `subscriptions` = 0 signifie « aucun appareil », pas une erreur.
 */
export interface PushResult { sent: number; removed: number; failed: number; subscriptions: number }

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
): Promise<PushResult> {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, removed: 0, failed: 0, subscriptions: 0 };

  type SubRow = { id: string; endpoint: string; p256dh: string; auth: string; locale: string | null; show_preview?: boolean | null };
  let res = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, locale, show_preview")
    .in("user_id", userIds);
  if (res.error?.code === "42703") {
    // Migration 20261119 pas encore appliquée : pas de colonne show_preview, aperçu affiché partout.
    res = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth, locale").in("user_id", userIds) as typeof res;
  }
  const subs = res.data as SubRow[] | null;
  const subsError = res.error;
  // Lecture des abonnements impossible : échec temporaire (à reprendre), pas « aucun abonnement ».
  if (subsError) return { sent: 0, removed: 0, failed: 1, subscriptions: 0 };

  let sent = 0;
  let failed = 0;
  const stale: string[] = [];
  const used: string[] = [];

  await Promise.all((subs || []).map(async (s) => {
    const locale = s.locale === "en" ? "en" : "fr";
    const c = content(locale);
    const hidden = s.show_preview === false && !!c.generic;
    const title = hidden ? c.generic!.title : c.title;
    const body = hidden ? c.generic!.body : c.body;
    const payload = JSON.stringify({
      title,
      body: body.length > 180 ? `${body.slice(0, 177)}…` : body,
      url: c.url,
      tag: c.tag,
      kind: c.kind,
      conversationId: c.conversationId,
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
      else {
        failed++;
        // Ni contenu ni adresse d'abonnement dans les journaux : seulement le code retourné.
        console.warn("[push] envoi échoué, statut:", status ?? "réseau");
      }
    }
  }));

  if (stale.length) await db.from("push_subscriptions").delete().in("id", stale);
  if (used.length) await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", used);
  return { sent, removed: stale.length, failed, subscriptions: (subs || []).length };
}
