import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseMapQuery } from "@/lib/geo/zone-counts";

/**
 * GET /api/geo/geojson?level=1 | ?level=2&parent=<id> | ?level=3&parent=<id>
 * LIMITES administratives simplifiées (données publiques du référentiel). Ne contient AUCUNE donnée de membre ni
 * aucun compte : les comptes passent par /api/geo/zone-counts (authentifié, non mis en cache).
 */
const CACHE = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = parseMapQuery(sp.get("level"), sp.get("parent"));
  if (!q) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin().rpc("geo_units_geojson", { p_level: q.level, p_parent: q.parent });
  if (error || !data) {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(data, { headers: { ...CACHE, "Content-Type": "application/geo+json" } });
}
