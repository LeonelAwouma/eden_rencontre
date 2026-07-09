import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let query = supabase.from("platform_settings").select("*").order("category");
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    // Transform to grouped object
    const grouped: Record<string, Record<string, unknown>> = {};
    (data || []).forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
    });

    return NextResponse.json({ settings: grouped, raw: data || [] });
  } catch (err) {
    console.error("Settings fetch error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { category, key, value } = body;

    if (!category || !key) {
      return NextResponse.json({ error: "category et key requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("platform_settings")
      .upsert(
        { category, key, value, updated_at: new Date().toISOString() },
        { onConflict: "category,key" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}