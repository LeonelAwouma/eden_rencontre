/**
 * POST /api/push/dispatch — { source: "notification" | "message" | "friendship" | "coach_notification", ref }
 *
 * Appelé par les triggers de la base (supabase/migrations/20261002_push_notifications.sql)
 * à chaque événement. On ne fait confiance qu'à l'identifiant reçu : tout est
 * relu en base, chaque événement n'est envoyé qu'une fois (push_log) et seuls
 * les événements récents sont poussés. Un appel forgé ne peut donc rien
 * inventer ni renvoyer en boucle.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { isPushConfigured, sendPushToUsers, type PushResult } from "@/lib/push-server";
import { claimPushEvent, finishPushEvent, pushOutcome } from "@/lib/push-claim";

const MAX_AGE_MS = 10 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const recent = (iso: string | null | undefined) => !!iso && Date.now() - new Date(iso).getTime() < MAX_AGE_MS;

export async function POST(req: NextRequest) {
  const { source, ref } = await req.json().catch(() => ({}));
  if (!["notification", "message", "friendship", "coach_notification"].includes(source) || typeof ref !== "string" || ref.length > 120) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (!isPushConfigured()) return NextResponse.json({ skipped: "push non configuré" });

  const id = ref.split(":")[0];
  if (!UUID.test(id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Une seule fois par événement : prise en charge atomique (claimed), puis sent / failed.
  // Un événement déjà envoyé n'est jamais renvoyé ; un échec complet ou une prise en charge abandonnée peut être repris.
  const claim = await claimPushEvent(db, source, ref);
  if (claim === "duplicate") return NextResponse.json({ skipped: "déjà envoyé" });
  if (claim === "error") return NextResponse.json({ error: "Journal push indisponible" }, { status: 500 });

  try {
    let result = await dispatchEvent(db, source, id, ref);
    // Tous les appareils ont échoué (aucun n'a rien reçu) : un seul nouvel essai immédiat, sans risque de doublon.
    if (isPushResult(result) && pushOutcome(result) === "failed") result = await dispatchEvent(db, source, id, ref);
    await finishPushEvent(db, source, ref, isPushResult(result) ? pushOutcome(result) : "sent", claim);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[push/dispatch]", source, ref, err);
    await finishPushEvent(db, source, ref, "failed", claim);
    return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
  }
}

const isPushResult = (r: unknown): r is PushResult =>
  !!r && typeof r === "object" && "subscriptions" in r && "failed" in r;

async function dispatchEvent(db: Db, source: string, id: string, ref: string) {
  if (source === "notification") return pushNotification(db, id);
  if (source === "message") return pushMessage(db, id);
  if (source === "coach_notification") return pushCoachNotification(db, id);
  return pushFriendship(db, id, ref.split(":")[1]);
}

type Db = ReturnType<typeof getSupabaseAdmin>;

async function displayName(db: Db, userId: string): Promise<{ name: string; isSystem: boolean }> {
  const { data } = await db.from("profiles").select("pseudo, name, email").eq("id", userId).maybeSingle();
  if (data?.email === ADMIN_SYSTEM_EMAIL) return { name: "Garden of Alliance", isSystem: true };
  return { name: data?.pseudo || "Un membre", isSystem: false };
}

/** Types d'accompagnement poussés aux MEMBRES (la notification en base reste la référence ; le push la complète). */
const COACH_PUSH_TEXTS: Record<string, { fr: [string, string]; en: [string, string] }> = {
  coach_assignment_proposed: {
    fr: ["Un accompagnement vous est proposé", "Un coach souhaite vous accompagner. Vous pouvez accepter ou refuser."],
    en: ["A coaching offer is waiting for you", "A coach would like to support you. You can accept or decline."],
  },
  assignment_ended: {
    fr: ["Votre accompagnement a pris fin", "Consultez votre espace pour en savoir plus."],
    en: ["Your coaching has ended", "Open your space to learn more."],
  },
};

/** Notification d'accompagnement → le membre destinataire UNIQUEMENT (rôle relu dans profiles, jamais déduit du type). */
async function pushCoachNotification(db: Db, id: string) {
  const { data: n } = await db.from("coach_notifications").select("id, recipient_id, kind, link, created_at").eq("id", id).maybeSingle();
  if (!n || !recent(n.created_at)) return { skipped: "introuvable ou ancienne" };
  const texts = COACH_PUSH_TEXTS[n.kind as string];
  if (!texts) return { skipped: "type non poussé" };
  const { data: p } = await db.from("profiles").select("account_type, status").eq("id", n.recipient_id).maybeSingle();
  if (!p || p.account_type !== "member" || p.status !== "approved") return { skipped: "destinataire non membre" };
  const link = typeof n.link === "string" && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/dashboard?tab=Notifications";
  return sendPushToUsers(db, [n.recipient_id as string], (locale) => ({
    title: texts[locale][0],
    body: texts[locale][1],
    url: link,
    tag: `coach-notif-${n.id}`,
  }));
}

/** Notifications de la cloche : texte tel qu'enregistré par la plateforme. */
async function pushNotification(db: Db, id: string) {
  const { data: n } = await db.from("meeting_notifications").select("*").eq("id", id).maybeSingle();
  if (!n || !recent(n.created_at)) return { skipped: "introuvable ou ancienne" };
  const link = typeof n.link === "string" && n.link.startsWith("/") ? n.link : "/dashboard?tab=Notifications";
  return sendPushToUsers(db, [n.user_id], () => ({
    title: n.title || "Garden of Alliance",
    body: n.message || "",
    url: link,
    tag: `notif-${n.id}`,
  }));
}

/** Nouveau message privé → les autres membres de la conversation. */
async function pushMessage(db: Db, id: string) {
  const { data: m } = await db.from("messages").select("id, conversation_id, sender_id, content, image_url, created_at").eq("id", id).maybeSingle();
  if (!m || !recent(m.created_at)) return { skipped: "introuvable ou ancien" };

  const { data: members } = await db.from("conversation_members").select("user_id").eq("conversation_id", m.conversation_id);
  const recipients = (members || []).map((r) => r.user_id).filter((u) => u !== m.sender_id);
  if (!recipients.length) return { skipped: "aucun destinataire" };

  const sender = await displayName(db, m.sender_id);
  const text = (m.content || "").trim();
  return sendPushToUsers(db, recipients, (locale) => ({
    title: sender.isSystem
      ? (locale === "en" ? "Message from the Garden of Alliance team" : "Message de l'équipe Garden of Alliance")
      : sender.name,
    body: text || (m.image_url ? (locale === "en" ? "📷 Photo" : "📷 Photo") : ""),
    url: `/dashboard?conv=${m.conversation_id}`,
    tag: `conv-${m.conversation_id}`,
  }));
}

/** Demande d'alliance reçue, ou acceptée. */
async function pushFriendship(db: Db, id: string, status: string | undefined) {
  const { data: f } = await db.from("friendships").select("requester_id, addressee_id, status, updated_at").eq("id", id).maybeSingle();
  if (!f || f.status !== status || !recent(f.updated_at)) return { skipped: "introuvable, changée ou ancienne" };

  if (f.status === "pending") {
    const from = await displayName(db, f.requester_id);
    if (from.isSystem) return { skipped: "compte système" };
    return sendPushToUsers(db, [f.addressee_id], (locale) => ({
      title: locale === "en" ? "New alliance request" : "Nouvelle demande d'alliance",
      body: locale === "en" ? `${from.name} would like to form an alliance with you.` : `${from.name} souhaite faire alliance avec vous.`,
      url: "/dashboard?tab=Requests",
      tag: `friendship-${id}`,
    }));
  }

  // Acceptée : on prévient celui ou celle qui avait envoyé la demande.
  const by = await displayName(db, f.addressee_id);
  if (by.isSystem) return { skipped: "compte système" };
  return sendPushToUsers(db, [f.requester_id], (locale) => ({
    title: locale === "en" ? "Alliance request accepted 🤝" : "Demande d'alliance acceptée 🤝",
    body: locale === "en" ? `${by.name} accepted your request. You can now talk to each other.` : `${by.name} a accepté votre demande. Vous pouvez maintenant échanger.`,
    url: "/dashboard?tab=Messages",
    tag: `friendship-${id}`,
  }));
}
