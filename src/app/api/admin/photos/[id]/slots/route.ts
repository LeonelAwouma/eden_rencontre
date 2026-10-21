/**
 * POST /api/admin/photos/:id/slots — adresses d'envoi signées pour importer les
 * photos de profil d'un membre (Admin → Import de fichiers).
 *
 * Même mécanisme que l'inscription (/api/registration/media) : le navigateur de
 * l'admin dépose chaque photo, déjà réduite, directement dans le bucket privé
 * « registration-media » — jamais via une fonction Vercel (limite 4,5 Mo).
 * Seules les adresses des photos sont renvoyées : l'admin n'importe pas de selfie.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createUploadSlots } from "@/lib/registration-media";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;

  const db = getSupabaseAdmin();
  const { data: profile } = await db.from("profiles").select("id").eq("id", id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  try {
    const slots = await createUploadSlots(db);
    return NextResponse.json({ folder: slots.folder, photos: slots.photos, selfie: null, frames: [] });
  } catch (err) {
    console.error("[admin/photos/slots]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Envoi des photos indisponible. Réessayez." }, { status: 503 });
  }
}
