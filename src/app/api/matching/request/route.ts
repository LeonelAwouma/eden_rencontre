/**
 * POST /api/matching/request — { addresseeId, message? }
 *
 * Seul chemin d'envoi d'une demande de mise en relation. Avant, le
 * navigateur écrivait directement dans `friendships` via la clé anonyme
 * (src/lib/social.ts, sendFriendRequest) — aucun contrôle serveur possible,
 * notamment aucune vérification de quota gratuit / abonnement GOLD effectif.
 *
 * La RLS de friendships interdit désormais l'insertion directe depuis le
 * navigateur (supabase/migrations/20261104_friendships_server_only.sql) :
 * les règles de l'ancienne politique (auth.uid() = requester_id) sont
 * reproduites ici, à l'identique, avant l'upsert fait avec la clé de service.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { hasFeatureAccess } from "@/lib/subscription/effective";

/** Quota gratuit — voir le même raisonnement que /api/chat/send. */
const FREE_DAILY_REQUEST_LIMIT = 20;
const MATCHING_QUOTA_REACHED = "matching_quota_reached";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const addresseeId = typeof body.addresseeId === "string" ? body.addresseeId : "";
  const message = typeof body.message === "string" ? body.message : null;
  if (!UUID.test(addresseeId)) return NextResponse.json({ error: "Destinataire invalide." }, { status: 400 });
  if (addresseeId === user.id) return NextResponse.json({ error: "Action impossible." }, { status: 400 });

  const db = getSupabaseAdmin();

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const { count: todayCount } = await db
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("requester_id", user.id)
    .gte("created_at", todayStart.toISOString());
  if ((todayCount || 0) >= FREE_DAILY_REQUEST_LIMIT) {
    const unlimited = await hasFeatureAccess(db, user.id, "unlimited_matching");
    if (!unlimited) return NextResponse.json({ error: MATCHING_QUOTA_REACHED }, { status: 429 });
  }

  const { error } = await db
    .from("friendships")
    .upsert(
      { requester_id: user.id, addressee_id: addresseeId, status: "pending", message, updated_at: new Date().toISOString() },
      { onConflict: "requester_id,addressee_id" }
    );
  if (error) {
    console.error("[matching/request] demande impossible:", error.message);
    return NextResponse.json({ error: "Demande non envoyée. Réessayez." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
