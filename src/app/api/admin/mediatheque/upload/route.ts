import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"],
  document: ["application/pdf", "application/epub+zip"],
};

const MAX_SIZES: Record<string, number> = {
  image: 5 * 1024 * 1024,     // 5 MB
  video: 100 * 1024 * 1024,   // 100 MB
  audio: 50 * 1024 * 1024,    // 50 MB
  document: 20 * 1024 * 1024, // 20 MB
};

function getFileCategory(mimeType: string): string | null {
  for (const [cat, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimeType)) return cat;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = getSupabaseAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    const category = getFileCategory(file.type);
    if (!category) {
      return NextResponse.json({ error: `Type de fichier non supporté: ${file.type}` }, { status: 400 });
    }

    const maxSize = MAX_SIZES[category];
    if (file.size > maxSize) {
      return NextResponse.json({ error: `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)} Mo).` }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("mediatheque")
      .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("[Mediatheque Upload] Storage error:", uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("mediatheque").getPublicUrl(uploadData.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: uploadData.path,
      size: file.size,
      type: file.type,
      category,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    console.error("[Mediatheque Upload] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}