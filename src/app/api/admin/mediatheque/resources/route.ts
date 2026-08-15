import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = db
      .from("mediatheque_resources")
      .select("*, category:mediatheque_categories(id,name,slug,icon,color)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);
    if (type && type !== "all") query = query.eq("type", type);
    if (category && category !== "all") query = query.eq("category_id", category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,author.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Stats
    const stats: Record<string, number> = {};
    for (const t of ["video", "audio", "book", "pdf", "article"]) {
      const { count: c } = await db.from("mediatheque_resources").select("*", { count: "exact", head: true }).eq("type", t);
      stats[t] = c || 0;
    }
    const { count: publishedCount } = await db.from("mediatheque_resources").select("*", { count: "exact", head: true }).eq("status", "published");
    const { count: draftCount } = await db.from("mediatheque_resources").select("*", { count: "exact", head: true }).eq("status", "draft");
    stats.published = publishedCount || 0;
    stats.draft = draftCount || 0;

    return NextResponse.json({ resources: data || [], total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit), stats });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const body = await request.json();

    const { title, slug, description, content, type, category_id, author, source,
      file_url, external_url, thumbnail_url, cover_url, duration, page_count,
      language, level, target_audience, status, featured, recommended,
      display_order, tags } = body;

    if (!title || !type) return NextResponse.json({ error: "Titre et type requis." }, { status: 400 });

    const finalSlug = slug || title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100) + "-" + Date.now().toString(36);

    const { data: resource, error } = await db.from("mediatheque_resources").insert({
      title, slug: finalSlug, description: description || "", content: content || null,
      type, category_id: category_id || null, author: author || null, source: source || null,
      file_url: file_url || null, external_url: external_url || null,
      thumbnail_url: thumbnail_url || null, cover_url: cover_url || null,
      duration: duration || null, page_count: page_count || null,
      language: language || "fr", level: level || "beginner",
      target_audience: target_audience || null, status: status || "draft",
      featured: featured || false, recommended: recommended || false,
      display_order: display_order || 0,
      published_at: status === "published" ? new Date().toISOString() : null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Handle tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
        let { data: tag } = await db.from("mediatheque_tags").select("id").eq("slug", tagSlug).single();
        if (!tag) {
          const { data: newTag } = await db.from("mediatheque_tags").insert({ name: tagName, slug: tagSlug }).select("id").single();
          tag = newTag;
        }
        if (tag) await db.from("mediatheque_resource_tags").insert({ resource_id: resource.id, tag_id: tag.id }).select().maybeSingle();
      }
    }

    return NextResponse.json({ ok: true, resource });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}