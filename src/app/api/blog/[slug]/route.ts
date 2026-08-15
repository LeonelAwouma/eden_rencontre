import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const db = getSupabaseAdmin();
    const { data: post, error } = await db.from("blog_posts")
      .select("*, category:blog_categories(id,name,slug,color)")
      .eq("slug", slug).eq("status", "published").single();
    if (error || !post) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

    await db.from("blog_posts").update({ view_count: (post.view_count || 0) + 1 }).eq("id", post.id);

    const { data: tl } = await db.from("blog_post_tags").select("tag:blog_tags(id,name,slug)").eq("post_id", post.id);
    const tags = tl ? tl.map((l: any) => l.tag).filter(Boolean) : [];

    let related: any[] = [];
    if (post.category_id) {
      const { data: rp } = await db.from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,published_at,reading_time_minutes")
        .eq("status", "published").eq("category_id", post.category_id).neq("id", post.id)
        .order("published_at", { ascending: false }).limit(3);
      related = rp || [];
    }
    if (related.length < 3) {
      const excludeIds = [post.id, ...related.map((r: any) => r.id)];
      const { data: rp2 } = await db.from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,published_at,reading_time_minutes")
        .eq("status", "published");
      const filtered = (rp2 || []).filter((r: any) => !excludeIds.includes(r.id)).slice(0, 3 - related.length);
      related = [...related, ...filtered];
    }

    return NextResponse.json({ post: { ...post, tags }, related });
  } catch (err) {
    console.error("[Blog Slug API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

