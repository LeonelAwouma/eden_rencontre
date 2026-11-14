/**
 * GET /api/admin/meets/[id]/salle
 *
 * Ouvre la salle Jitsi d'une réunion pour l'équipe admin, en tant que
 * modératrice (exclure, couper un micro, activer la salle d'attente…).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildJoinInfo, isJitsiConfigured, roomOf } from "@/lib/jitsi";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { data: meet } = await getSupabaseAdmin()
    .from("meets")
    .select("*")
    .eq("id", id)
    .single();

  if (!meet) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });
  if (meet.meet_type === "external" && meet.external_url) {
    return NextResponse.json({
      kind: "external",
      externalUrl: meet.external_url,
      meet: { id: meet.id, title: meet.title, start_time: meet.start_time, duration: meet.duration, status: meet.status },
    });
  }
  const room = roomOf(meet);
  if (!room) return NextResponse.json({ error: "Cette réunion utilise l'ancien lien Google Meet." }, { status: 409 });
  if (!isJitsiConfigured()) return NextResponse.json({ error: "La visioconférence n'est pas configurée." }, { status: 503 });

  const join = buildJoinInfo(room, {
    id: `admin-${admin.adminId}`,
    name: "Équipe Garden of Alliance",
    email: admin.email,
  }, true);

  return NextResponse.json({ meet: { id: meet.id, title: meet.title, start_time: meet.start_time, duration: meet.duration, status: meet.status }, ...join });
}
