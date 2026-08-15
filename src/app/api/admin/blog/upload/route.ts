import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = getSupabaseAdmin();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Type non supporté (JPG, PNG, WebP, GIF)." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)." }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("blog-images").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("[Blog Upload] Error:", uploadError);
      return NextResponse.json({ error: "Erreur lors de l'upload." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(uploadData.path);
    return NextResponse.json({ url: urlData.publicUrl, path: uploadData.path });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
