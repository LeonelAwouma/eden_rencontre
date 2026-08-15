import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("blog_categories").select("id,name,slug,color").eq("is_active", true).order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
