import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("blog_categories").select("*").order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data || [] });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { name, description, color } = await request.json();
    if (!name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const { data, error } = await db.from("blog_categories").insert({ name, slug, description: description || null, color: color || "#486B46" }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, category: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
