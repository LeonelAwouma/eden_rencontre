/**
 * POST /api/announcements/event — { id, event: "view" | "click" | "dismiss" }
 *
 * Compteurs AGRÉGÉS et anonymes d'une annonce : un affichage, un clic sur
 * « Découvrir », une fermeture. Aucun identifiant de personne n'est enregistré, et
 * ces nombres sont des ÉVÉNEMENTS, pas des utilisateurs uniques (la même personne
 * peut être comptée plusieurs fois sur plusieurs sessions ou appareils).
 *
 * Protégée contre l'abus : l'annonce doit exister et être active ; plafond global
 * par IP, et plafond par IP × annonce × événement et par jour. Les plafonds
 * n'utilisent que le mécanisme de limitation existant (`checkRateLimit`).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientIp } from "@/lib/api-auth";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { getAnnouncement } from "@/lib/whats-new";
import { bumpStat } from "@/lib/whats-new-store";

type EventName = "view" | "click" | "dismiss";
const EVENTS: readonly EventName[] = ["view", "click", "dismiss"];

const MAX_EVENTS_PER_IP_PER_HOUR = 120;
/** Par IP, par annonce et par jour : large pour un usage réel, bloquant pour un script. */
const MAX_PER_ANNOUNCEMENT_PER_DAY: Record<EventName, number> = { view: 5, click: 10, dismiss: 5 };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const event = body.event as EventName;
  if (!EVENTS.includes(event)) return NextResponse.json({ error: "Événement invalide." }, { status: 400 });

  const announcement = getAnnouncement(id);
  if (!announcement) return NextResponse.json({ error: "Annonce inconnue." }, { status: 400 });
  // Une annonce désactivée ne compte rien : empêche de gonfler des chiffres hors période.
  if (!announcement.active) return NextResponse.json({ ok: true, counted: false });

  const ip = clientIp(request);
  const ipKey = `announce-event:${ip}`;
  const perAnnouncementKey = `announce-event:${ip}:${id}:${event}`;

  if (!(await checkRateLimit(ipKey, "announce_event", MAX_EVENTS_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }
  if (!(await checkRateLimit(perAnnouncementKey, "announce_event_item", MAX_PER_ANNOUNCEMENT_PER_DAY[event], 24 * 3600))) {
    // Silencieux : un client légitime ne doit pas voir d'erreur, il n'est simplement plus compté.
    return NextResponse.json({ ok: true, counted: false });
  }
  await recordRateLimit(ipKey, "announce_event");
  await recordRateLimit(perAnnouncementKey, "announce_event_item");

  const counted = await bumpStat(getSupabaseAdmin(), id, event);
  return NextResponse.json({ ok: true, counted });
}
