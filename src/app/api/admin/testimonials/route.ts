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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("testimonials")
    .select(`
      *,
      user:profiles!testimonials_user_id_fkey(id, name, email, avatar_url, city, country, subscription_plan),
      reviewer:admin_users!testimonials_reviewed_by_fkey(id, name, email)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats
  const { count: totalCount } = await supabase
    .from("testimonials").select("*", { count: "exact", head: true });
  const { count: pendingCount } = await supabase
    .from("testimonials").select("*", { count: "exact", head: true }).eq("status", "pending_review");
  const { count: approvedCount } = await supabase
    .from("testimonials").select("*", { count: "exact", head: true }).eq("status", "approved");
  const { count: rejectedCount } = await supabase
    .from("testimonials").select("*", { count: "exact", head: true }).eq("status", "rejected");

  return NextResponse.json({
    testimonials: data || [],
    total: count || 0,
    stats: {
      total: totalCount || 0,
      pending: pendingCount || 0,
      approved: approvedCount || 0,
      rejected: rejectedCount || 0,
    },
    page,
    limit,
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { id, status, admin_feedback, is_featured } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) {
    update.status = status;
    update.reviewed_at = new Date().toISOString();
    if (status === "approved") update.published_at = new Date().toISOString();
  }
  if (admin_feedback !== undefined) update.admin_feedback = admin_feedback;
  if (is_featured !== undefined) update.is_featured = is_featured;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("testimonials")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testimonial: data });
}