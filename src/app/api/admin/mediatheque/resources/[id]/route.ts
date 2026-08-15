import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("mediatheque_resources")
      .select("*, category:mediatheque_categories(id,name,slug,icon,color)")
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });

    // Fetch tags
    const { data: tagLinks } = await db.from("mediatheque_resource_tags").select("tag_id").eq("resource_id", id);
    let tags: any[] = [];
    if (tagLinks && tagLinks.length > 0) {
      const { data: tagData } = await db.from("mediatheque_tags").select("*").in("id", tagLinks.map((t: any) => t.tag_id));
      tags = tagData || [];
    }

    return NextResponse.json({ resource: { ...data, tags } });
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

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = ["title", "slug", "description", "content", "type", "category_id", "author", "source",
      "file_url", "external_url", "thumbnail_url", "cover_url", "duration", "page_count",
      "language", "level", "target_audience", "status", "featured", "recommended", "display_order"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (body.status === "published" && !body.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await db.from("mediatheque_resources").update(updateData).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update tags
    if (Array.isArray(body.tags)) {
      await db.from("mediatheque_resource_tags").delete().eq("resource_id", id);
      for (const tagName of body.tags) {
        const tagSlug = tagName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
        let { data: tag } = await db.from("mediatheque_tags").select("id").eq("slug", tagSlug).single();
        if (!tag) {
          const { data: newTag } = await db.from("mediatheque_tags").insert({ name: tagName, slug: tagSlug }).select("id").single();
          tag = newTag;
        }
        if (tag) await db.from("mediatheque_resource_tags").insert({ resource_id: id, tag_id: tag.id }).select().maybeSingle();
      }
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

    const { error } = await db.from("mediatheque_resources").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}