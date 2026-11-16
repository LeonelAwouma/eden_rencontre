import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getGeoOverview } from "@/lib/geo/admin-server";

/**
 * GET /api/admin/geography — état du référentiel, derniers imports, incohérences, TOTAUX de membres localisés.
 * Aucune coordonnée, aucune localisation individuelle ; comptes par région masqués sous 5.
 */
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const res = await getGeoOverview(getSupabaseAdmin());
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
