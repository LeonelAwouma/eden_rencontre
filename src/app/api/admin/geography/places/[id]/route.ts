import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { updatePlace } from "@/lib/geo/admin-server";

/** PATCH /api/admin/geography/places/:id — { action: validate | reject | reopen | attach(+arrondissementId) }. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }); }
  const res = await updatePlace(getSupabaseAdmin(), id, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  try {
    await logAdminAction(admin.adminId, admin.email, "geo_place_updated", "system", id, body as Record<string, unknown>);
  } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true, status: res.status }, { headers: { "Cache-Control": "no-store" } });
}
