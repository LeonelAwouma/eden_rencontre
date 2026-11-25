import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseScope } from "@/lib/geo/admin-map";
import { getInternationalMap } from "@/lib/geo/admin-map-server";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/geography/international?scope=approved|all
 * Effectifs EXACTS des membres par pays (hors Cameroun), codes non reconnus à part, indicateurs.
 * Administration seulement ; uniquement des codes pays et des nombres.
 */
export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE }); }

  const scope = parseScope(req.nextUrl.searchParams.get("scope"));
  if (!scope) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400, headers: NO_STORE });

  const res = await getInternationalMap(getSupabaseAdmin(), scope);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: NO_STORE });
  return NextResponse.json(res.data, { headers: NO_STORE });
}
