import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/geo/places?q=yaou&country=CM — autocomplétion de localités.
 * Données PUBLIQUES du référentiel (noms + contexte administratif) : aucun point, aucune donnée de membre.
 * Accessible avant l'inscription (le formulaire est public). Réponse partageable (cache CDN court).
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const country = (req.nextUrl.searchParams.get("country") ?? "CM").toUpperCase();
  if (q.length < 2 || !/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ places: [] }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("geo_search_places", { p_query: q, p_country: country, p_limit: 10 });
  if (error) {
    // Référentiel pas encore installé : l'interface retombe sur la saisie manuelle.
    return NextResponse.json({ places: [], unavailable: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const places = (data ?? []).map((r: Record<string, string | null>) => ({
    id: r.place_id,
    name: r.name,
    type: r.place_type,
    verified: r.verification_status === "verified",
    arrondissement: r.arrondissement_id ? { id: r.arrondissement_id, name: r.arrondissement_fr } : null,
    department: r.department_id ? { id: r.department_id, name: r.department_fr } : null,
    region: r.region_id ? { id: r.region_id, name: r.region_fr } : null,
  }));
  return NextResponse.json({ places }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
