import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncResourcePaths } from "@/lib/mediatheque/path-links";

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
    const sort = searchParams.get("sort");
    const [sortColumn, ascending] =
      sort === "views" ? ["view_count", false] :
      sort === "title" ? ["title", true] :
      sort === "updated" ? ["updated_at", false] :
      ["created_at", false];

    let query = db
      .from("mediatheque_resources")
      .select("*, category:mediatheque_categories(id,name,slug,icon,color)", { count: "exact" })
      .order(sortColumn as string, { ascending: ascending as boolean })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);
    if (type && type !== "all") query = query.eq("type", type);
    if (category && category !== "all") query = query.eq("category_id", category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,author.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Stats globales, indépendantes des filtres : elles alimentent les compteurs
    // des onglets de statut et des filtres de type.
    const countWhere = async (column: "type" | "status", value: string) => {
      const { count: c } = await db.from("mediatheque_resources").select("*", { count: "exact", head: true }).eq(column, value);
      return c || 0;
    };
    const types = ["video", "audio", "book", "pdf", "article", "guide", "testimony", "external"];
    const statuses = ["published", "draft", "archived"];
    const [typeCounts, statusCounts] = await Promise.all([
      Promise.all(types.map((t) => countWhere("type", t))),
      Promise.all(statuses.map((st) => countWhere("status", st))),
    ]);
    const stats: Record<string, number> = {};
    types.forEach((t, i) => { stats[t] = typeCounts[i]; });
    statuses.forEach((st, i) => { stats[st] = statusCounts[i]; });
    stats.all = statusCounts.reduce((a, b) => a + b, 0);

    const { data: lastUpdated } = await db.from("mediatheque_resources")
      .select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle();

    // Parcours auxquels appartiennent les ressources de la page, avec l'étape
    // (position dans le parcours, selon sort_order).
    const resources = data || [];
    const pathsByResource: Record<string, { id: string; title: string; step: number; total: number }[]> = {};
    if (resources.length > 0) {
      const { data: ownLinks } = await db.from("mediatheque_learning_path_resources")
        .select("learning_path_id").in("resource_id", resources.map((r) => r.id));
      const pathIds = [...new Set((ownLinks || []).map((l) => l.learning_path_id))];
      if (pathIds.length > 0) {
        const [{ data: allLinks }, { data: paths }] = await Promise.all([
          db.from("mediatheque_learning_path_resources").select("learning_path_id, resource_id, sort_order")
            .in("learning_path_id", pathIds).order("sort_order"),
          db.from("mediatheque_learning_paths").select("id, title").in("id", pathIds),
        ]);
        const titles = new Map((paths || []).map((p) => [p.id, p.title]));
        for (const pathId of pathIds) {
          const steps = (allLinks || []).filter((l) => l.learning_path_id === pathId);
          steps.forEach((l, i) => {
            (pathsByResource[l.resource_id] ||= []).push({
              id: pathId, title: titles.get(pathId) || "Parcours", step: i + 1, total: steps.length,
            });
          });
        }
      }
    }

    return NextResponse.json({
      resources: resources.map((r) => ({ ...r, learning_paths: pathsByResource[r.id] || [] })),
      total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit),
      stats, last_updated_at: lastUpdated?.updated_at || null,
    });
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

    if (Array.isArray(body.learning_paths)) {
      try { await syncResourcePaths(db, resource.id, body.learning_paths); }
      catch (e) { return NextResponse.json({ ok: true, resource, warning: `Ressource créée, mais les parcours n'ont pas pu être mis à jour : ${(e as Error).message}` }); }
    }

    return NextResponse.json({ ok: true, resource });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}