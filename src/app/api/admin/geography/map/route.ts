import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseAdminMapQuery } from "@/lib/geo/admin-map";
import { getCameroonMap } from "@/lib/geo/admin-map-server";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/geography/map?level=1|2|3&parent=<uuid>&scope=approved|all
 * Effectifs EXACTS des membres par région / département / arrondissement du Cameroun, + non rattachés au niveau
 * consulté, + indicateurs généraux. Administration seulement ; uniquement des identifiants de zones et des nombres.
 */
export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE }); }

  const sp = req.nextUrl.searchParams;
  const q = parseAdminMapQuery(sp.get("level"), sp.get("parent"), sp.get("scope"));
  if (!q) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400, headers: NO_STORE });

  const res = await getCameroonMap(getSupabaseAdmin(), q);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: NO_STORE });
  return NextResponse.json(res.data, { headers: NO_STORE });
}
