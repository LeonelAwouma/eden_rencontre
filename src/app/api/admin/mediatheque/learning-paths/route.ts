import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("mediatheque_learning_paths").select("*").order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count resources per path
    const paths = data || [];
    for (const path of paths) {
      const { count } = await db.from("mediatheque_learning_path_resources").select("*", { count: "exact", head: true }).eq("learning_path_id", path.id);
      (path as any).resource_count = count || 0;
    }

    return NextResponse.json({ learning_paths: paths });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { title, slug, description, objective, cover_url, level, estimated_duration, sort_order, status } = body;
    if (!title || !slug) return NextResponse.json({ error: "Titre et slug requis." }, { status: 400 });

    const { data, error } = await db.from("mediatheque_learning_paths").insert({
      title, slug, description: description || "", objective: objective || null,
      cover_url: cover_url || null, level: level || "beginner",
      estimated_duration: estimated_duration || null, sort_order: sort_order || 0,
      status: status || "draft",
      published_at: status === "published" ? new Date().toISOString() : null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, learning_path: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}