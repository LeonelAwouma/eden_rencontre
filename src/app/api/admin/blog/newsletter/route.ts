import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getNewsletterAudience, isMissingSchema, schedulePostNewsletter } from "@/lib/newsletter";

const unauthorized = (err: unknown) => err instanceof Error && err.message === "UNAUTHORIZED";

// GET — Audience de la newsletter et liste des inscrits publics / désabonnés.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const sp = new URL(request.url).searchParams;
    const status = sp.get("status"), search = sp.get("search")?.trim();
    const page = Math.max(1, parseInt(sp.get("page") || "1")), limit = 25;

    const audience = await getNewsletterAudience(db);
    const stats = { audience: audience.emails.length, members: audience.members, subscribers: audience.subscribers, unsubscribed: audience.unsubscribed };

    let q = db.from("newsletter_subscribers")
      .select("id, email, status, source, subscribed_at, unsubscribed_at", { count: "exact" })
      .order("subscribed_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
    if (status === "active" || status === "unsubscribed") q = q.eq("status", status);
    if (search) q = q.ilike("email", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
    const { data, error, count } = await q;
    if (error) {
      if (isMissingSchema(error)) return NextResponse.json({ stats, subscribers: [], total: 0, totalPages: 1, migrationMissing: true });
      throw error;
    }
    return NextResponse.json({ stats, subscribers: data || [], total: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / limit)) });
  } catch (err) {
    if (unauthorized(err)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    console.error("Admin newsletter GET error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

// POST — Envoyer (ou renvoyer) un article publié aux abonnés. { post_id, resend? }
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { post_id, resend } = await request.json().catch(() => ({}));
    if (!post_id) return NextResponse.json({ error: "Article manquant." }, { status: 400 });

    const { data: post } = await db.from("blog_posts").select("*").eq("id", post_id).maybeSingle();
    if (!post) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    if (post.status !== "published") return NextResponse.json({ error: "Seul un article publié peut être envoyé aux abonnés." }, { status: 400 });
    if (post.newsletter_sent_at && !resend) return NextResponse.json({ error: "Cet article a déjà été envoyé aux abonnés." }, { status: 409 });

    schedulePostNewsletter(post_id, { force: !!resend });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "blog_newsletter_sent", "event", post_id, { title: post.title, resend: !!resend }, ip);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (unauthorized(err)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    console.error("Admin newsletter POST error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

// DELETE — Retirer une adresse de la liste (?id=). Un membre supprimé ici redevient abonné d'office.
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    const { error } = await getSupabaseAdmin().from("newsletter_subscribers").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (unauthorized(err)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    console.error("Admin newsletter DELETE error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
