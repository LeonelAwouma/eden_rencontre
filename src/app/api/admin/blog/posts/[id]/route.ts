import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { estimateReadingTime } from "@/lib/blog";
import { schedulePostNewsletter } from "@/lib/newsletter";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("blog_posts")
      .select("*, category:blog_categories(id,name,slug,color)").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    const { data: tl } = await db.from("blog_post_tags").select("tag_id").eq("post_id", id);
    let tags: any[] = [];
    if (tl && tl.length > 0) {
      const { data: td } = await db.from("blog_tags").select("*").in("id", tl.map((t: any) => t.tag_id));
      tags = td || [];
    }
    return NextResponse.json({ post: { ...data, tags } });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { data: current } = await db.from("blog_posts").select("status,title,slug,excerpt,cover_image_url").eq("id", id).single();
    if (!current) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

    const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of ["title","slug","excerpt","content","cover_image_url","category_id","author","status","featured"]) {
      if (body[f] !== undefined) upd[f] = body[f];
    }
    if (body.content) upd.reading_time_minutes = estimateReadingTime(body.content);
    const willPublish = body.status === "published" && current.status !== "published";
    if (willPublish) upd.published_at = new Date().toISOString();

    const { data, error } = await db.from("blog_posts").update(upd).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (Array.isArray(body.tags)) {
      await db.from("blog_post_tags").delete().eq("post_id", id);
      for (const tagName of body.tags) {
        const tagSlug = tagName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
        let { data: tag } = await db.from("blog_tags").select("id").eq("slug", tagSlug).single();
        if (!tag) { const { data: nt } = await db.from("blog_tags").insert({ name: tagName, slug: tagSlug }).select("id").single(); tag = nt; }
        if (tag) await db.from("blog_post_tags").insert({ post_id: id, tag_id: tag.id });
      }
    }

    if (willPublish) {
      try {
        const { data: users } = await db.from("profiles").select("id").eq("status", "approved");
        if (users && users.length > 0) {
          const title = (upd.title as string) || current.title;
          const slug = (upd.slug as string) || current.slug;
          const excerpt = (upd.excerpt as string) || body.excerpt || current.excerpt || "Découvrez notre dernier article.";
          const rows = users.map((u: { id: string }) => ({
            user_id: u.id, notification_type: "blog_post", blog_post_id: id,
            title: "Nouvel article publié",
            message: `« ${title} » — ${excerpt}`.slice(0, 500),
            thumbnail_url: (upd.cover_image_url as string) || current.cover_image_url || null,
            link: `/blog/${slug}`,
          }));
          for (let i = 0; i < rows.length; i += 500) await db.from("meeting_notifications").insert(rows.slice(i, i + 500));
        }
      } catch (e) { console.error("[Blog] Notif error:", e); }
      // E-mail aux abonnés (membres + inscrits du blog), une seule fois par article.
      schedulePostNewsletter(id);
    }
    return NextResponse.json({ ok: true, resource: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();
    const { error } = await db.from("blog_posts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

