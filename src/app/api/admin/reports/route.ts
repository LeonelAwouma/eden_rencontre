import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const reportType = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("user_reports")
      .select(`
        *,
        reporter:profiles!reporter_id(id, name, pseudo, email, avatar_url),
        reported_user:profiles!reported_user_id(id, name, pseudo, email, avatar_url, status)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);
    if (reportType && reportType !== "all") query = query.eq("report_type", reportType);
    if (search) query = query.or(`description.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    // Get counts by status
    const [pending, resolved, critical] = await Promise.all([
      supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("priority", "critical"),
    ]);

    return NextResponse.json({
      reports: data || [],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        total: count || 0,
        pending: pending.count || 0,
        resolved: resolved.count || 0,
        critical: critical.count || 0,
      },
    });
  } catch (err) {
    console.error("Reports fetch error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}