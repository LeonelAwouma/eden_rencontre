/**
 * GET    /api/push/subscribe — appareils abonnés du membre (en-tête facultatif x-push-endpoint : marque « cet appareil »)
 * POST   /api/push/subscribe — { subscription: PushSubscriptionJSON, locale, test?, showPreview? } : activer sur ce téléphone
 * PATCH  /api/push/subscribe — { endpoint, showPreview } : aperçu du message sur l'écran verrouillé de cet appareil
 * DELETE /api/push/subscribe — { endpoint } (cet appareil) ou { id } (un autre de ses appareils) : désactiver
 * Le membre est identifié par son jeton de session (Authorization: Bearer). Chaque opération est
 * filtrée par son user_id : on ne lit ni ne modifie jamais l'abonnement d'un autre compte.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser, getMemberOrCoach } from "@/lib/api-auth";
import { isPushConfigured, sendPushToUsers } from "@/lib/push-server";
import { deviceLabel, parseSubscription } from "@/lib/push-devices";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const missingTable = (code?: string) => code === "42P01" || code === "PGRST205";

export async function GET(req: NextRequest) {
  const user = await getMemberOrCoach(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  const current = req.headers.get("x-push-endpoint") || "";
  const db = getSupabaseAdmin();
  let res = await db.from("push_subscriptions")
    .select("id, endpoint, user_agent, created_at, last_used_at, show_preview")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (res.error?.code === "42703") {
    res = await db.from("push_subscriptions")
      .select("id, endpoint, user_agent, created_at, last_used_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }) as typeof res;
  }
  if (res.error) {
    if (missingTable(res.error.code)) return NextResponse.json({ devices: [] });
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }
  type Row = { id: string; endpoint: string; user_agent: string | null; created_at: string; last_used_at: string | null; show_preview?: boolean | null };
  // L'adresse d'abonnement (endpoint) n'est jamais renvoyée au navigateur.
  const devices = ((res.data || []) as Row[]).map((r) => ({
    id: r.id,
    label: deviceLabel(r.user_agent),
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
    showPreview: r.show_preview !== false,
    current: !!current && r.endpoint === current,
  }));
  return NextResponse.json({ devices });
}

export async function POST(req: NextRequest) {
  const user = await getMemberOrCoach(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  if (!isPushConfigured()) return NextResponse.json({ error: "Les notifications ne sont pas encore configurées sur le serveur." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const sub = parseSubscription(body.subscription);
  if (!sub) return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  const locale = body.locale === "en" ? "en" : "fr";

  const row: Record<string, unknown> = {
    user_id: user.id, ...sub, locale, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  };
  // Le simple rafraîchissement à l'ouverture ne touche pas à la préférence d'aperçu déjà choisie.
  if (typeof body.showPreview === "boolean") row.show_preview = body.showPreview;

  const db = getSupabaseAdmin();
  // Un même appareil (endpoint) n'existe qu'une fois : s'il change de compte, il suit le dernier connecté.
  let { error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error?.code === "42703" && "show_preview" in row) {
    delete row.show_preview; // migration 20261119 pas encore exécutée
    ({ error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" }));
  }
  if (error) {
    const missing = missingTable(error.code);
    return NextResponse.json({ error: missing ? "Exécutez d'abord supabase/migrations/20261002_push_notifications.sql." : "Enregistrement impossible." }, { status: missing ? 503 : 500 });
  }

  // Notification de bienvenue : confirme que tout fonctionne sur ce téléphone.
  if (body.test) {
    await sendPushToUsers(db, [user.id], (l) => ({
      title: "Garden of Alliance",
      body: l === "en" ? "Notifications are on. You'll be notified here, even when the site is closed." : "Les notifications sont activées. Vous serez prévenu(e) ici, même site fermé.",
      url: "/dashboard",
      tag: "welcome",
    }));
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const user = await getMemberOrCoach(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  const { endpoint, showPreview } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string" || !endpoint || typeof showPreview !== "boolean") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("push_subscriptions")
    .update({ show_preview: showPreview })
    .eq("endpoint", endpoint).eq("user_id", user.id)
    .select("id");
  if (error) {
    const pending = error.code === "42703";
    return NextResponse.json({ error: pending ? "Exécutez d'abord supabase/migrations/20261119_push_hardening.sql." : "Modification impossible." }, { status: pending ? 503 : 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "Appareil introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE : volontairement ouvert à tout jeton valide, même d'un compte désormais suspendu — il ne peut
// que retirer SES propres souscriptions (filtre user_id) ; lui interdire ce geste maintiendrait les notifications.
export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  const { endpoint, id } = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();
  if (typeof id === "string" && UUID.test(id)) {
    await db.from("push_subscriptions").delete().eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }
  if (typeof endpoint !== "string" || !endpoint) return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
