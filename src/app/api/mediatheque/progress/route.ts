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

    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resource_id");

    if (resourceId) {
      const { data } = await db.from("mediatheque_user_progress").select("*").eq("user_id", user.id).eq("resource_id", resourceId).single();
      return NextResponse.json({ progress: data || null });
    }

    const { data } = await db.from("mediatheque_user_progress")
      .select("*, resource:mediatheque_resources(id,title,slug,thumbnail_url,type)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    return NextResponse.json({ progress: data || [] });
  } catch (err) {
    console.error("[Progress API] Error:", err);
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

    const body = await request.json();
    const { resource_id, status, progress_percent, last_position } = body;
    if (!resource_id) return NextResponse.json({ error: "resource_id requis." }, { status: 400 });

    const upsertData: any = {
      user_id: user.id,
      resource_id,
      status: status || "started",
      progress_percent: progress_percent ?? 0,
      last_position: last_position || null,
      updated_at: new Date().toISOString(),
    };
    if (status === "completed") upsertData.completed_at = new Date().toISOString();

    const { data, error } = await db.from("mediatheque_user_progress")
      .upsert(upsertData, { onConflict: "user_id,resource_id" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ progress: data });
  } catch (err) {
    console.error("[Progress API] Error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
