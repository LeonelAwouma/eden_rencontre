import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("matches")
    .select(`
      *,
      user_a:profiles!matches_user_a_id_fkey(id, name, email, gender, city, country, avatar_url, subscription_plan),
      user_b:profiles!matches_user_b_id_fkey(id, name, email, gender, city, country, avatar_url, subscription_plan),
      mentor:profiles!matches_mentor_id_fkey(id, name, email)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`user_a.name.ilike.%${search}%,user_b.name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get stats
  const { data: statsData } = await supabase.rpc("get_match_stats").maybeSingle();
  const stats = statsData || {
    total: 0, pending: 0, accepted: 0, declined: 0, expired: 0, blocked: 0,
  };

  return NextResponse.json({ matches: data || [], total: count || 0, stats, page, limit });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { id, status, admin_notes } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) update.status = status;
  if (admin_notes !== undefined) update.admin_notes = admin_notes;
  if (status === "accepted" || status === "declined") update.responded_at = new Date().toISOString();

  const supabase2 = getSupabaseAdmin();
  const { data, error } = await supabase2
    .from("matches")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ match: data });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { user_a_id, user_b_id, match_score, admin_notes } = body;
  if (!user_a_id || !user_b_id) {
    return NextResponse.json({ error: "Les deux utilisateurs sont requis" }, { status: 400 });
  }

  const supabase3 = getSupabaseAdmin();
  const { data, error } = await supabase3
    .from("matches")
    .insert({
      user_a_id,
      user_b_id,
      match_score: match_score || null,
      initiated_by: "admin",
      admin_notes: admin_notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ match: data }, { status: 201 });
}