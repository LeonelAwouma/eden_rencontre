/**
 * GET /api/admin/photos — membres à qui il manque des photos de profil.
 *
 * Rubrique Admin → Import de photos : procédure exceptionnelle pour les membres
 * qui n'ont pas réussi à importer leurs photos à l'inscription (issue de secours
 * « Je n'arrive pas à importer mes photos »). Elle ne remplace pas l'inscription
 * normale. « Photos à fournir » se déduit de profile_photos (moins de 3 photos) :
 * aucune colonne dédiée.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { MAX_PROFILE_PHOTOS } from "@/lib/registration-media";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, name, pseudo, email, status, created_at, profile_photos")
    .neq("email", ADMIN_SYSTEM_EMAIL)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[admin/photos]", error.message);
    return NextResponse.json({ error: "Lecture des membres impossible." }, { status: 500 });
  }

  const members = (data || [])
    .map((p) => ({
      id: p.id as string,
      name: p.name as string | null,
      pseudo: p.pseudo as string | null,
      email: p.email as string | null,
      status: p.status as string | null,
      created_at: p.created_at as string | null,
      photoCount: Array.isArray(p.profile_photos) ? p.profile_photos.filter(Boolean).length : 0,
    }))
    .filter((m) => m.photoCount < MAX_PROFILE_PHOTOS && m.status !== "rejected");

  return NextResponse.json({ members });
}
