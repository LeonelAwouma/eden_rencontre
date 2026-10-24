import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Un appel à l'ouverture de l'espace membre. Une visite n'est pas un simple
// rafraîchissement du jeton Supabase ; l'information est mise à jour au maximum
// une fois par jour.
export async function POST(request: NextRequest) {
  const user = await getApprovedUser(request);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("profiles").select("last_member_visit_at").eq("id", user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Suivi indisponible" }, { status: 503 });
  const previous = data.last_member_visit_at ? Date.parse(data.last_member_visit_at) : 0;
  if (Date.now() - previous >= 24 * 60 * 60 * 1000) {
    const { error: updateError } = await db.from("profiles")
      .update({ last_member_visit_at: new Date().toISOString() }).eq("id", user.id);
    if (updateError) return NextResponse.json({ error: "Suivi indisponible" }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
