import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function extractUser(request: NextRequest): { token: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return { token: authHeader.substring(7) };
}

export async function GET(request: NextRequest) {
  try {
    const auth = extractUser(request);
    if (!auth) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const db = getSupabaseAdmin();
    const { data: { user } } = await db.auth.getUser(auth.token);
    if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { data } = await db.from("mediatheque_user_favorites")
      .select("id,resource_id,created_at, resource:mediatheque_resources(id,title,slug,description,thumbnail_url,type,level,author)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    return NextResponse.json({ favorites: data || [] });
  } catch (err) {
    console.error("[Favorites API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = extractUser(request);
    if (!auth) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const db = getSupabaseAdmin();
    const { data: { user } } = await db.auth.getUser(auth.token);
    if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { resource_id } = await request.json();
    if (!resource_id) return NextResponse.json({ error: "resource_id requis." }, { status: 400 });

    const { data: existing } = await db.from("mediatheque_user_favorites")
      .select("id").eq("user_id", user.id).eq("resource_id", resource_id).maybeSingle();

    if (existing) {
      await db.from("mediatheque_user_favorites").delete().eq("id", existing.id);
      return NextResponse.json({ favorited: false });
    }

    const { data, error } = await db.from("mediatheque_user_favorites")
      .insert({ user_id: user.id, resource_id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ favorited: true, favorite: data });
  } catch (err) {
    console.error("[Favorites API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
