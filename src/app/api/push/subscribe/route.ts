/**
 * POST   /api/push/subscribe — { subscription: PushSubscriptionJSON, locale, test? } : activer sur ce téléphone
 * DELETE /api/push/subscribe — { endpoint } : désactiver sur ce téléphone
 * Le membre est identifié par son jeton de session (Authorization: Bearer).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { isPushConfigured, sendPushToUsers } from "@/lib/push-server";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  if (!isPushConfigured()) return NextResponse.json({ error: "Les notifications ne sont pas encore configurées sur le serveur." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const sub = body.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint.startsWith("https://") || endpoint.length > 1000 || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  }
  const locale = body.locale === "en" ? "en" : "fr";

  const db = getSupabaseAdmin();
  const { error } = await db.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, p256dh, auth, locale, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null },
    { onConflict: "endpoint" }
  );
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    return NextResponse.json({ error: missing ? "Exécutez d'abord supabase/migrations/20261002_push_notifications.sql." : error.message }, { status: missing ? 503 : 500 });
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

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string") return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  const db = getSupabaseAdmin();
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
