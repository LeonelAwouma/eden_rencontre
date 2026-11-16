import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteMemberLocation, saveMemberConsent, saveMemberLocation } from "@/lib/geo/member-location-server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/member/location — MA localisation et MES réglages (jamais celle d'un autre membre ;
 * l'identité vient uniquement du jeton). Aucune coordonnée n'est renvoyée.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("member_locations")
    .select(
      "country_code, region_id, department_id, arrondissement_id, place_id, free_text_city, verification_status, nearby_search_enabled, location_discoverable, display_level, location_consent_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ location: null, unavailable: true }, { headers: NO_STORE });
  return NextResponse.json({ location: data ?? null }, { headers: NO_STORE });
}

/**
 * PUT /api/member/location — met à jour MA localisation. Seul chemin d'écriture de la localisation
 * depuis l'interface membre (profiles.city/country ne sont plus modifiés directement).
 */
export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400, headers: NO_STORE });
  }
  const res = await saveMemberLocation(getSupabaseAdmin(), user.id, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: NO_STORE });
  return NextResponse.json(
    { ok: true, publicCity: res.publicCity, verification: res.verification },
    { headers: NO_STORE },
  );
}

/**
 * PATCH /api/member/location — MES réglages de confidentialité : utiliser ma localisation pour chercher,
 * être inclus dans les recherches des autres, niveau d'affichage. Trois réglages indépendants.
 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400, headers: NO_STORE });
  }
  const res = await saveMemberConsent(getSupabaseAdmin(), user.id, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: NO_STORE });
  return NextResponse.json({ ok: true, publicCity: res.publicCity }, { headers: NO_STORE });
}

/** DELETE /api/member/location — supprime MA localisation et son historique (effet immédiat sur les recherches). */
export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  const res = await deleteMemberLocation(getSupabaseAdmin(), user.id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: NO_STORE });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
