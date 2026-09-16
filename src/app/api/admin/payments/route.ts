import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin().catch(() => null))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("payments")
      .select(`
        *,
        user:profiles!user_id(id, name, email, avatar_url),
        plan:payment_plans!plan_id(id, name, price_cents, currency, interval)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) throw error;

    // Aggregate stats
    const allPayments = await supabase
      .from("payments")
      .select("amount_cents, status, created_at")
      .eq("status", "completed");

    const completedPayments = allPayments.data || [];
    const totalRevenue = completedPayments.reduce((s, p) => s + p.amount_cents, 0);
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = completedPayments
      .filter(p => new Date(p.created_at) >= monthStart)
      .reduce((s, p) => s + p.amount_cents, 0);

    // Subscriptions count
    const activeSubs = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    const failedPayments = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");

    const refundedPayments = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "refunded");

    return NextResponse.json({
      payments: data || [],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      stats: {
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions: activeSubs.count || 0,
        failedPayments: failedPayments.count || 0,
        refundedPayments: refundedPayments.count || 0,
      },
    });
  } catch (err) {
    console.error("Payments fetch error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}