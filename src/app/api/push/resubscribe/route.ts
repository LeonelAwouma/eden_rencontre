/**
 * POST /api/push/resubscribe — { oldEndpoint, subscription }
 *
 * Appelé par le service worker (public/sw.js) sur « pushsubscriptionchange », quand le navigateur renouvelle
 * l'abonnement push en arrière-plan. Il n'y a alors aucun jeton de session : la preuve de propriété est la
 * connaissance de l'ANCIEN endpoint (adresse secrète et impossible à deviner, jamais renvoyée au navigateur
 * par nos API). La route ne fait que remplacer une ligne existante : elle ne crée jamais d'abonnement et
 * ne change jamais son propriétaire.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseSubscription } from "@/lib/push-devices";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const oldEndpoint = typeof body.oldEndpoint === "string" ? body.oldEndpoint : "";
  const sub = parseSubscription(body.subscription);
  if (!oldEndpoint.startsWith("https://") || oldEndpoint.length > 1000 || !sub) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  if (oldEndpoint === sub.endpoint) return NextResponse.json({ ok: true });

  const db = getSupabaseAdmin();
  const { data: existing } = await db.from("push_subscriptions").select("id").eq("endpoint", oldEndpoint).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Abonnement inconnu" }, { status: 404 });

  const { error } = await db.from("push_subscriptions")
    .update({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth })
    .eq("id", existing.id);
  if (error?.code === "23505") {
    // Le nouvel endpoint est déjà enregistré (la page l'a renvoyé entre-temps) : l'ancien est simplement retiré.
    await db.from("push_subscriptions").delete().eq("id", existing.id);
    return NextResponse.json({ ok: true });
  }
  if (error) return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
