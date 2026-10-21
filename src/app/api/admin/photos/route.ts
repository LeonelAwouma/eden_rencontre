/**
 * GET /api/admin/photos — membres dont le parcours d'inscription est incomplet.
 *
 * Rubrique Admin → Import de fichiers : procédure exceptionnelle pour les membres
 * qui n'ont pas réussi à terminer leur inscription (issue de secours « Je n'arrive
 * pas à importer mes photos », fiche d'inscription Word envoyée sur WhatsApp).
 * Elle ne remplace pas l'inscription normale. Ce qui manque se déduit du profil
 * (moins de 3 photos, genre, date de naissance, pays ou ville vides) : aucune
 * colonne dédiée.
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
    .select("id, name, pseudo, email, status, created_at, profile_photos, gender, birth_date, country, city")
    .neq("email", ADMIN_SYSTEM_EMAIL)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[admin/photos]", error.message);
    return NextResponse.json({ error: "Lecture des membres impossible." }, { status: 500 });
  }

  const members = (data || [])
    .map((p) => {
      const photoCount = Array.isArray(p.profile_photos) ? p.profile_photos.filter(Boolean).length : 0;
      const missing = [
        photoCount < MAX_PROFILE_PHOTOS && "photos",
        !p.gender && "genre",
        !p.birth_date && "date de naissance",
        !p.country && "pays",
        !p.city && "ville",
      ].filter((m): m is string => !!m);
      return {
        id: p.id as string,
        name: p.name as string | null,
        pseudo: p.pseudo as string | null,
        email: p.email as string | null,
        status: p.status as string | null,
        created_at: p.created_at as string | null,
        photoCount,
        missing,
      };
    })
    .filter((m) => m.missing.length > 0 && m.status !== "rejected");

  return NextResponse.json({ members });
}
