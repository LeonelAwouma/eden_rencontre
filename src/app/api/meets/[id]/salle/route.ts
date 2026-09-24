/**
 * GET /api/meets/[id]/salle
 *
 * Ouvre la salle Jitsi d'une réunion pour un membre. Conditions :
 *  - être connecté (jeton Supabase envoyé en « Authorization: Bearer ») ;
 *  - figurer parmi les invités de la réunion ;
 *  - réunion active, et dans le créneau : de 30 min avant le début
 *    jusqu'à 1 h après la fin prévue.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildJoinInfo, isJitsiConfigured, roomOf } from "@/lib/jitsi";

const OPENS_BEFORE_MIN = 30;
const CLOSES_AFTER_MIN = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour rejoindre la réunion.", code: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: meet } = await db
    .from("meets")
    .select("id, title, description, start_time, duration, status, space_name")
    .eq("id", id)
    .single();

  if (!meet) return NextResponse.json({ error: "Réunion introuvable.", code: "not_found" }, { status: 404 });

  const { data: invitation } = await db
    .from("meet_invitations")
    .select("id")
    .eq("meet_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!invitation) return NextResponse.json({ error: "Cette réunion est réservée aux personnes invitées.", code: "not_invited" }, { status: 403 });

  const info = { id: meet.id, title: meet.title, description: meet.description, start_time: meet.start_time, duration: meet.duration };

  if (meet.status !== "active") {
    return NextResponse.json({ error: "Cette réunion a été annulée ou est terminée.", code: "closed", meet: info }, { status: 410 });
  }

  const start = new Date(meet.start_time).getTime();
  const now = Date.now();
  if (now < start - OPENS_BEFORE_MIN * 60_000) {
    return NextResponse.json({ error: `La salle ouvrira ${OPENS_BEFORE_MIN} minutes avant le début.`, code: "too_early", meet: info }, { status: 425 });
  }
  if (now > start + ((meet.duration || 60) + CLOSES_AFTER_MIN) * 60_000) {
    return NextResponse.json({ error: "Cette réunion est terminée.", code: "closed", meet: info }, { status: 410 });
  }

  const room = roomOf(meet);
  if (!room) return NextResponse.json({ error: "Cette réunion utilise un ancien lien externe.", code: "legacy", meet: info }, { status: 409 });
  if (!isJitsiConfigured()) return NextResponse.json({ error: "La visioconférence n'est pas disponible pour le moment.", code: "not_configured", meet: info }, { status: 503 });

  const { data: profile } = await db.from("profiles").select("name, avatar_url").eq("id", user.id).maybeSingle();

  // Le membre participe sans droits de modération ; son jeton ne vaut que pour cette salle.
  const join = buildJoinInfo(room, {
    id: user.id,
    name: profile?.name || user.email.split("@")[0],
    email: user.email,
    avatar: profile?.avatar_url?.startsWith("http") ? profile.avatar_url : null,
  }, false, ((meet.duration || 60) + CLOSES_AFTER_MIN + OPENS_BEFORE_MIN) * 60);

  return NextResponse.json({ meet: info, ...join });
}
