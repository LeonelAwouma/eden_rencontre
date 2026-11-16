import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runZoneCounts } from "@/lib/geo/zone-counts-server";

/** Réponses personnalisées (dépendent des consentements) : jamais mises en cache. */
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization, Cookie" };

/**
 * GET /api/geo/zone-counts?level=1            → régions
 * GET /api/geo/zone-counts?level=2&parent=<id> → départements d'une région (3 : arrondissements)
 * Nombre de membres par zone, masqué sous 5 (avec suppression complémentaire). Jamais de coordonnées.
 */
export async function GET(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: HEADERS });
  const sp = req.nextUrl.searchParams;
  const res = await runZoneCounts(getSupabaseAdmin(), user.id, { level: sp.get("level"), parent: sp.get("parent") });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: HEADERS });
  return NextResponse.json(
    { counts: res.counts, mine: res.mine, ...(res.reason ? { reason: res.reason } : {}) },
    { headers: HEADERS },
  );
}
