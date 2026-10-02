import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/registration-media";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const { data: user, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    // Selfie et photos d'inscription : chemins du stockage privé → liens signés (1 h) pour l'affichage.
    const [selfieUrl, profilePhotos] = await Promise.all([
      resolveMediaUrl(db, user.selfie_url),
      resolveMediaUrls(db, user.profile_photos),
    ]);
    return NextResponse.json({ user: { ...user, selfie_url: selfieUrl, profile_photos: profilePhotos } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin user detail API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}