// POST /api/formation/progress — { completed: string[] }
//
// Wrappe l'écriture aujourd'hui cliente de la progression de formation
// (src/lib/formation/progress.ts, pushCompleted) derrière une route
// authentifiée — même schéma Authorization: Bearer que /api/profile/photos.
// Ne bloque jamais la progression des piliers déjà gratuits (pilier 1) ;
// seul l'accès au contenu protégé lui-même (texte/images/audio/PDF des
// piliers 2+) est réellement réservé, via /api/formation/lesson/[slug].

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const user = await getApprovedUser(request);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const completed = Array.isArray(body.completed) ? body.completed.filter((s: unknown) => typeof s === "string") : null;
  if (!completed) return NextResponse.json({ error: "Liste de leçons invalide." }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db.from("profiles").update({ formation_completed: completed }).eq("id", user.id);
  if (error) {
    console.error("[formation/progress] enregistrement impossible:", error.message);
    return NextResponse.json({ error: "Progression non enregistrée." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
