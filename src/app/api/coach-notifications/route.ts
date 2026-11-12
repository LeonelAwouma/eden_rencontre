import { NextRequest, NextResponse } from "next/server";
import { getMemberOrCoach } from "@/lib/api-auth";
import { isUuid } from "@/lib/coach/assignment-errors";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Notifications de l'espace Coach (table coach_notifications, distincte de meeting_notifications).
 * Chaque appel est filtré sur recipient_id = identité de la session (membre approuvé OU coach actif) :
 * un identifiant de notification ne suffit jamais à lire ou modifier celle d'un autre compte.
 */

/** GET — les 30 dernières notifications du compte connecté + le nombre TOTAL de non lues (comptage exact, au-delà des 30). */
export async function GET(req: NextRequest) {
  const user = await getMemberOrCoach(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });

  const db = getSupabaseAdmin();
  const [list, unreadCount] = await Promise.all([
    db.from("coach_notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(30),
    db.from("coach_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id).is("read_at", null),
  ]);
  if (list.error) return NextResponse.json({ error: "Notifications indisponibles." }, { status: 500, headers: NO_STORE });

  const notifications = list.data || [];
  // Repli sur les 30 lignes chargées seulement si le comptage exact échoue.
  const unread = !unreadCount.error && typeof unreadCount.count === "number"
    ? unreadCount.count
    : notifications.filter((n) => !n.read_at).length;
  return NextResponse.json({ notifications, unread }, { headers: NO_STORE });
}

/** PATCH — marque comme lue : { id } ou { all: true }. Ne touche que les lignes du destinataire connecté. */
export async function PATCH(req: NextRequest) {
  const user = await getMemberOrCoach(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });

  const body = await req.json().catch(() => null);
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (body?.all === true) {
    const { error } = await db.from("coach_notifications").update({ read_at: now })
      .eq("recipient_id", user.id).is("read_at", null);
    if (error) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500, headers: NO_STORE });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (!isUuid(body?.id)) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400, headers: NO_STORE });
  const { data, error } = await db.from("coach_notifications").update({ read_at: now })
    .eq("id", body.id).eq("recipient_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500, headers: NO_STORE });
  if (!data) return NextResponse.json({ error: "Notification introuvable." }, { status: 404, headers: NO_STORE }); // autre destinataire ou inexistante
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
