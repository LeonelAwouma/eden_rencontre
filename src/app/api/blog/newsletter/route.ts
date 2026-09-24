import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { sendNewsletterWelcomeEmail } from "@/lib/email";
import { normalizeEmail, isValidEmail, isMissingSchema, unsubscribeUrl } from "@/lib/newsletter";

// POST — Inscription publique à la newsletter du blog (aucun compte requis).
// La réponse est la même que l'adresse soit nouvelle, déjà inscrite ou celle
// d'un membre : on ne révèle pas qui possède un compte sur la plateforme.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Champ piège invisible : rempli uniquement par les robots.
    if (body.website) return NextResponse.json({ ok: true });

    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    if (!(await checkRateLimit(ip, "newsletter_subscribe", 5, 3600))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    await recordRateLimit(ip, "newsletter_subscribe");

    const db = getSupabaseAdmin();
    const { data: existing, error: readError } = await db.from("newsletter_subscribers")
      .select("id, status, source").eq("email", email).maybeSingle();
    if (readError) {
      if (isMissingSchema(readError)) {
        console.error("[Newsletter] Table newsletter_subscribers absente : appliquer supabase/migrations/20260924_blog_newsletter.sql");
        return NextResponse.json({ error: "unavailable" }, { status: 503 });
      }
      throw readError;
    }
    if (existing?.status === "active") return NextResponse.json({ ok: true });

    // Un membre approuvé jamais désabonné reçoit déjà la newsletter.
    const { data: member } = await db.from("profiles").select("id").eq("email", email).eq("status", "approved").maybeSingle();
    if (member && !existing) return NextResponse.json({ ok: true });

    const now = new Date().toISOString();
    const { error } = existing
      ? await db.from("newsletter_subscribers").update({ status: "active", subscribed_at: now, unsubscribed_at: null }).eq("id", existing.id)
      : await db.from("newsletter_subscribers").insert({ email, status: "active", source: "blog", subscribed_at: now });
    if (error) throw error;

    await sendNewsletterWelcomeEmail(email, unsubscribeUrl(email));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Newsletter] Inscription impossible :", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
