import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("member_reactivation_preferences").select("email_opt_in").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Préférence indisponible" }, { status: 503 });
  return NextResponse.json({ enabled: data?.email_opt_in === true }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("member_reactivation_preferences").upsert({
    user_id: user.id, email_opt_in: body.enabled, updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 503 });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
