import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("mediatheque_categories").select("*").order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Nombre de ressources par catégorie, affiché sur l'écran de gestion.
    const { data: links } = await db.from("mediatheque_resources").select("category_id");
    const counts: Record<string, number> = {};
    for (const l of links || []) if (l.category_id) counts[l.category_id] = (counts[l.category_id] || 0) + 1;
    return NextResponse.json({ categories: (data || []).map((c) => ({ ...c, resource_count: counts[c.id] || 0 })) });
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
    const { name, slug, description, icon, color, parent_id, sort_order } = body;
    if (!name || !slug) return NextResponse.json({ error: "Nom et slug requis." }, { status: 400 });

    const { data, error } = await db.from("mediatheque_categories").insert({
      name, slug, description: description || null, icon: icon || null,
      color: color || "#486B46", parent_id: parent_id || null, sort_order: sort_order || 0,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, category: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}