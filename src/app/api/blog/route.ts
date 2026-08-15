import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const sp = new URL(request.url).searchParams;
    const category = sp.get("category");
    const search = sp.get("search");
    const sort = sp.get("sort") || "newest";
    const page = parseInt(sp.get("page") || "1");
    const limit = parseInt(sp.get("limit") || "12");
    const offset = (page - 1) * limit;

    let q = db.from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,author,reading_time_minutes,published_at,featured,view_count,category:blog_categories(id,name,slug,color)", { count: "exact" })
      .eq("status", "published");

    if (category && category !== "all") q = q.eq("category_id", category);
    if (search) q = q.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);

    if (sort === "popular") q = q.order("view_count", { ascending: false });
    else q = q.order("published_at", { ascending: false });

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch tags
    const posts = data || [];
    if (posts.length > 0) {
      const ids = posts.map((p: any) => p.id);
      const { data: tl } = await db.from("blog_post_tags").select("post_id, tag:blog_tags(id,name,slug)").in("post_id", ids);
      const tm: Record<string, any[]> = {};
      if (tl) for (const l of tl as any[]) { if (!tm[l.post_id]) tm[l.post_id] = []; if (l.tag) tm[l.post_id].push(l.tag); }
      for (const p of posts as any[]) p.tags = tm[p.id] || [];
    }

    const { data: categories } = await db.from("blog_categories").select("id,name,slug,color").eq("is_active", true).order("sort_order");

    return NextResponse.json({ posts, total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit), categories: categories || [] });
  } catch (err) {
    console.error("[Public Blog API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
