import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validReactivationToken } from "@/lib/member-reactivation";

export async function GET(req: NextRequest) {
  // Une requête GET ne modifie rien : les scanners de liens e-mail les visitent.
  const { searchParams } = new URL(req.url);
  const u = searchParams.get("u") || "", t = searchParams.get("t") || "";
  if (!validReactivationToken(u,t)) return new NextResponse("Lien invalide.", { status: 400 });
  return new NextResponse(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rappels Garden of Alliance</title><body style="font-family:system-ui;max-width:540px;margin:12vh auto;padding:20px"><h1>Rappels d'inactivité</h1><p>Vous pouvez arrêter les rappels par e-mail sans fermer votre compte.</p><form method="post"><input type="hidden" name="u" value="${u}"><input type="hidden" name="t" value="${t}"><button style="background:#486B46;color:white;padding:12px;border:0;border-radius:8px" type="submit">Désactiver les rappels</button></form></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let u=searchParams.get("u") || "", t=searchParams.get("t") || "";
  if (!u || !t) {
    const body = await req.formData().catch(() => null);
    u = String(body?.get("u") || ""); t = String(body?.get("t") || "");
  }
  if (!validReactivationToken(u,t)) return new NextResponse("Lien invalide.", { status: 400 });
  const { error } = await getSupabaseAdmin().from("member_reactivation_preferences").upsert({
    user_id:u,email_opt_in:false,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if (error) return new NextResponse("Impossible de modifier les préférences.", { status: 503 });
  return new NextResponse("Les rappels d'inactivité sont désactivés pour ce compte.", { headers: { "content-type":"text/plain; charset=utf-8" } });
}
