import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runGeoDiscovery } from "@/lib/geo/discovery-server";

/**
 * Réponses PERSONNALISÉES : jamais mises en cache (ni navigateur, ni CDN, ni cache partagé). La désactivation
 * d'un consentement prend ainsi effet immédiatement : chaque appel relit la base.
 */
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization, Cookie" };

/**
 * GET /api/discover/geo?scope=region&includeUnlocated=1&offset=0
 *
 * Renvoie uniquement des identifiants de membres compatibles avec le périmètre demandé, avec une catégorie de
 * distance et la localisation que chaque membre accepte de montrer. Jamais de coordonnées, jamais de distance
 * exacte. L'identité du demandeur vient du jeton ; les profils eux-mêmes sont chargés ensuite par le navigateur
 * via les règles d'accès habituelles (RLS).
 */
export async function GET(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: HEADERS });

  const sp = req.nextUrl.searchParams;
  const res = await runGeoDiscovery(getSupabaseAdmin(), user.id, {
    scope: sp.get("scope"),
    includeUnlocated: sp.get("includeUnlocated") === "1",
    offset: Number(sp.get("offset") ?? "0"),
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: HEADERS });
  return NextResponse.json(
    { candidates: res.page.candidates, nextOffset: res.page.nextOffset, ...(res.reason ? { reason: res.reason } : {}) },
    { headers: HEADERS },
  );
}
