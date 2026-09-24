/**
 * POST /api/admin/messages/upload   (multipart/form-data, champ « file »)
 *
 * Dépose une photo dans le bucket public « chat-images » pour la joindre à un
 * message admin, et renvoie son URL publique. Passe par le serveur (clé de
 * service) : l'admin n'a pas de session Supabase dans le navigateur.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Envoi invalide" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Aucune photo reçue" }, { status: 400 });

  const ext = EXTENSIONS[file.type];
  if (!ext) return NextResponse.json({ error: "Format non accepté (JPG, PNG, WebP ou GIF)." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo trop lourde (8 Mo maximum)." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const path = `admin/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: "3600", upsert: false });
  if (error) {
    console.error("[Admin Messages Upload] Error:", error.message);
    return NextResponse.json({ error: "Échec de l'envoi de la photo" }, { status: 500 });
  }

  const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
