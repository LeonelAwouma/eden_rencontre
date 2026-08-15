import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getSupabaseAdmin();

    const { data: resource, error } = await db
      .from("mediatheque_resources")
      .select("*, category:mediatheque_categories(id,name,slug,icon,color)")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !resource) {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }

    // Fetch tags
    const { data: tagLinks } = await db
      .from("mediatheque_resource_tags")
      .select("tag:mediatheque_tags(id,name,slug)")
      .eq("resource_id", resource.id);
    (resource as any).tags = (tagLinks || []).map((l: any) => l.tag).filter(Boolean);

    // Fetch related resources (same category)
    let related: any[] = [];
    if (resource.category_id) {
      const { data: rel } = await db
        .from("mediatheque_resources")
        .select("id,title,slug,thumbnail_url,type,level,duration")
        .eq("category_id", resource.category_id)
        .eq("status", "published")
        .neq("id", resource.id)
        .limit(4);
      related = rel || [];
    }

    // Increment view count (fire and forget)
    db.from("mediatheque_resources")
      .update({ view_count: (resource.view_count || 0) + 1 })
      .eq("id", resource.id)
      .then(() => {});

    return NextResponse.json({ resource, related });
  } catch (err) {
    console.error("[Mediatheque Detail API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
