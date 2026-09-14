import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateBlogSlug, estimateReadingTime } from "@/lib/blog";

// Helper: send blog notifications to all approved users
async function sendBlogNotifications(db: any, post: any) {
  try {
    const { data: users } = await db.from("profiles").select("id").eq("status", "approved");
    if (!users || users.length === 0) return;
    const excerpt = post.excerpt || "Découvrez notre dernier article sur GARDEN OF ALLIANCE.";
    const rows = users.map((u: { id: string }) => ({
      user_id: u.id, notification_type: "blog_post", blog_post_id: post.id,
      title: "Nouvel article publié",
      message: `« ${post.title} » — ${excerpt}`.slice(0, 500),
      thumbnail_url: post.cover_image_url || null, link: `/blog/${post.slug}`,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await db.from("meeting_notifications").insert(rows.slice(i, i + 500));
    }
    console.log(`[Blog] Sent ${rows.length} notification(s) for "${post.title}"`);
  } catch (e) { console.error("[Blog] Failed to send notifications:", e); }
}

// GET — List all blog posts (admin)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const sp = new URL(request.url).searchParams;
    const status = sp.get("status"), category = sp.get("category"), search = sp.get("search");
    const page = parseInt(sp.get("page") || "1"), limit = parseInt(sp.get("limit") || "20");
    const offset = (page - 1) * limit;

    let q = db.from("blog_posts")
      .select("*, category:blog_categories(id,name,slug,color)", { count: "exact" })
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status && status !== "all") q = q.eq("status", status);
    if (category && category !== "all") q = q.eq("category_id", category);
    if (search) q = q.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,author.ilike.%${search}%`);

    const { data: posts, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (posts && posts.length > 0) {
      const ids = posts.map((p: any) => p.id);
      const { data: tl } = await db.from("blog_post_tags").select("post_id, tag:blog_tags(id,name,slug)").in("post_id", ids);
      const tm: Record<string, any[]> = {};
      if (tl) for (const l of tl as any[]) { if (!tm[l.post_id]) tm[l.post_id] = []; if (l.tag) tm[l.post_id].push(l.tag); }
      for (const p of posts as any[]) p.tags = tm[p.id] || [];
    }

    const stats: Record<string, number> = {};
    for (const s of ["published", "draft", "archived"]) {
      const { count: c } = await db.from("blog_posts").select("*", { count: "exact", head: true }).eq("status", s);
      stats[s] = c || 0;
    }
    const { count: total } = await db.from("blog_posts").select("*", { count: "exact", head: true });
    stats.total = total || 0;

    return NextResponse.json({ posts: posts || [], total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit), stats });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

// POST — Create a new blog post
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { title, slug, excerpt, content, cover_image_url, category_id, author, status, featured, tags } = body;

    if (!title) return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });

    const finalSlug = slug || generateBlogSlug(title) + "-" + Date.now().toString(36);
    const readingTime = estimateReadingTime(content || "");
    const isPublished = status === "published";

    const { data: post, error } = await db.from("blog_posts").insert({
      title, slug: finalSlug, excerpt: excerpt || null, content: content || null,
      cover_image_url: cover_image_url || null, category_id: category_id || null,
      author: author || "GARDEN OF ALLIANCE", reading_time_minutes: readingTime,
      status: status || "draft", featured: featured || false,
      published_at: isPublished ? new Date().toISOString() : null,
      created_by: admin.adminId === "env-admin" ? null : admin.adminId,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Handle tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
        let { data: tag } = await db.from("blog_tags").select("id").eq("slug", tagSlug).single();
        if (!tag) { const { data: nt } = await db.from("blog_tags").insert({ name: tagName, slug: tagSlug }).select("id").single(); tag = nt; }
        if (tag) await db.from("blog_post_tags").insert({ post_id: post.id, tag_id: tag.id });
      }
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(admin.adminId, admin.email, "blog_post_created", "event", post.id, { title, status: status || "draft" }, ip);

    try { await db.from("admin_notifications").insert({
      type: "system", title: "Nouvel article créé",
      message: `L'article "${title}" a été créé (${isPublished ? "publié" : "brouillon"}).`,
      link: `/admin/blog/${post.id}/edit`, metadata: { blog_post_id: post.id, title },
    }); } catch (e) { console.error("Admin notif error:", e); }

    if (isPublished) await sendBlogNotifications(db, post);

    return NextResponse.json({ ok: true, post });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    console.error("Admin blog POST error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
