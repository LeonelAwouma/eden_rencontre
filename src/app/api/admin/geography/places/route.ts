import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { arrondissementOptions, listPlaces } from "@/lib/geo/admin-server";

/** GET /api/admin/geography/places?status=unverified&q=&page=1[&options=1] — localités du référentiel (publiques). */
export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const sp = req.nextUrl.searchParams;
  const db = getSupabaseAdmin();
  const res = await listPlaces(db, { status: sp.get("status"), q: sp.get("q"), page: sp.get("page") });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 503 });
  const options = sp.get("options") === "1" ? await arrondissementOptions(db) : undefined;
  return NextResponse.json({ ...res, ...(options ? { options } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
