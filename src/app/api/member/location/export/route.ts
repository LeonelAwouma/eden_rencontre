import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exportMemberLocation } from "@/lib/geo/member-location-server";

/** GET /api/member/location/export — MES données de localisation, en fichier JSON. Identité = jeton. */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const res = await exportMemberLocation(getSupabaseAdmin(), user.id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(JSON.stringify(res.data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ma-localisation.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
