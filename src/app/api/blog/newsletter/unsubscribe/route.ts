import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeEmail, verifyUnsubscribeToken } from "@/lib/newsletter";

// POST — Désabonnement. Appelé par la page /newsletter/desabonnement et par les
// messageries (désabonnement en un clic, RFC 8058 : POST sur l'URL de l'en-tête
// List-Unsubscribe, paramètres dans la query). Vaut aussi pour les membres.
export async function POST(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    let e = sp.get("e"), t = sp.get("t");
    if (!e || !t) {
      const body = await request.json().catch(() => ({}));
      e = body.email; t = body.token;
    }
    const email = normalizeEmail(e);
    if (!email || !t || !verifyUnsubscribeToken(email, t)) {
      return NextResponse.json({ error: "invalid_link" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { data: existing } = await db.from("newsletter_subscribers").select("id").eq("email", email).maybeSingle();
    const { error } = existing
      ? await db.from("newsletter_subscribers").update({ status: "unsubscribed", unsubscribed_at: now }).eq("id", existing.id)
      : await db.from("newsletter_subscribers").insert({ email, status: "unsubscribed", source: "member", unsubscribed_at: now });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Newsletter] Désabonnement impossible :", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
