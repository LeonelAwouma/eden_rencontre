import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { EDITABLE_SETTINGS, invalidatePlatformSettingsCache } from "@/lib/platform-settings";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin().catch(() => null))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let query = supabase.from("platform_settings").select("*").order("category");
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    // Seuls les réglages modifiables partent vers le navigateur (jamais les
    // identifiants stockés dans la même table, ex. google_calendar_credentials).
    const rows = (data || []).filter((s) => EDITABLE_SETTINGS[`${s.category}.${s.key}`]);
    const grouped: Record<string, Record<string, unknown>> = {};
    rows.forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
    });

    return NextResponse.json({ settings: grouped });
  } catch (err) {
    console.error("Settings fetch error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin().catch(() => null))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { category, key } = body;
    let { value } = body;

    if (!category || !key) {
      return NextResponse.json({ error: "category et key requis" }, { status: 400 });
    }
    // Seuls les réglages réellement utilisés par le site sont modifiables.
    const validate = EDITABLE_SETTINGS[`${category}.${key}`];
    if (!validate) {
      return NextResponse.json({ error: "Ce paramètre n'est pas modifiable." }, { status: 400 });
    }
    if (typeof value === "string") value = value.trim();
    const invalid = validate(value);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
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
    invalidatePlatformSettingsCache();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}