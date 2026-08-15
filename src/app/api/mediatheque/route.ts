import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const level = searchParams.get("level");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "newest";
    const featured = searchParams.get("featured");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const offset = (page - 1) * limit;

    let query = db
      .from("mediatheque_resources")
      .select("*, category:mediatheque_categories(id,name,slug,icon,color)", { count: "exact" })
      .eq("status", "published");

    if (type && type !== "all") query = query.eq("type", type);
    if (category && category !== "all") query = query.eq("category_id", category);
    if (level && level !== "all") query = query.eq("level", level);
    if (featured === "true") query = query.eq("featured", true);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,author.ilike.%${search}%`);

    switch (sort) {
      case "popular": query = query.order("view_count", { ascending: false }); break;
      case "recommended": query = query.order("recommended", { ascending: false }).order("created_at", { ascending: false }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch tags for each resource
    const resources = data || [];
    if (resources.length > 0) {
      const ids = resources.map((r: any) => r.id);
      const { data: tagLinks } = await db.from("mediatheque_resource_tags").select("resource_id, tag:mediatheque_tags(id,name,slug)").in("resource_id", ids);
      const tagsMap: Record<string, any[]> = {};
      if (tagLinks) {
        for (const link of tagLinks as any[]) {
          if (!tagsMap[link.resource_id]) tagsMap[link.resource_id] = [];
          if (link.tag) tagsMap[link.resource_id].push(link.tag);
        }
      }
      for (const r of resources as any[]) {
        r.tags = tagsMap[r.id] || [];
      }
    }

    // Categories for filter
    const { data: categories } = await db.from("mediatheque_categories").select("id,name,slug,icon").eq("is_active", true).order("sort_order");

    return NextResponse.json({
      resources, total: count || 0, page, limit,
      totalPages: Math.ceil((count || 0) / limit),
      categories: categories || [],
    });
  } catch (err) {
    console.error("[Public Mediatheque API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}