import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/geo/units?level=1                 → régions
 * GET /api/geo/units?parent=<id>             → enfants (départements / arrondissements)
 * GET /api/geo/units?parent=<id>&places=1    → localités d'un arrondissement
 * Données publiques du référentiel, sans géométrie. Cache CDN long (le référentiel change rarement).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parent = sp.get("parent");
  const db = getSupabaseAdmin();

  if (parent) {
    if (!UUID.test(parent)) return NextResponse.json({ error: "Paramètre invalide" }, { status: 400 });
    if (sp.get("places") === "1") {
      const { data, error } = await db
        .from("geo_places")
        .select("id, name, place_type")
        .eq("admin_unit_id", parent)
        .neq("verification_status", "rejected")
        .order("name")
        .limit(500);
      if (error) return NextResponse.json({ places: [], unavailable: true }, { headers: { "Cache-Control": "no-store" } });
      return NextResponse.json({ places: data ?? [] }, { headers: CACHE });
    }
    const { data, error } = await db
      .from("geo_admin_units")
      .select("id, code, level, name_fr, name_en")
      .eq("parent_id", parent)
      .order("name_fr");
    if (error) return NextResponse.json({ units: [], unavailable: true }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ units: data ?? [] }, { headers: CACHE });
  }

  const level = Number(sp.get("level") ?? "1");
  if (![1, 2, 3].includes(level)) return NextResponse.json({ error: "Paramètre invalide" }, { status: 400 });
  const { data, error } = await db
    .from("geo_admin_units")
    .select("id, code, level, name_fr, name_en")
    .eq("country_code", "CM")
    .eq("level", level)
    .order("name_fr")
    .limit(1000);
  if (error) return NextResponse.json({ units: [], unavailable: true }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ units: data ?? [] }, { headers: CACHE });
}
