import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const plan = searchParams.get("plan");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = db
      .from("profiles")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (plan && plan !== "all") {
      query = query.eq("subscription_plan", plan);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des utilisateurs." },
        { status: 500 }
      );
    }

    // Fetch charter acceptances separately (no FK between profiles and charter_acceptances)
    if (users && users.length > 0) {
      const userIds = users.map((u: { id: string }) => u.id);
      const { data: acceptances } = await db
        .from("charter_acceptances")
        .select("user_id, authorize_verification, commit_respectful_conversations, accept_full_charter, all_accepted, accepted_at, charter_version")
        .in("user_id", userIds);

      const acceptanceMap = new Map(
        (acceptances || []).map((a: { user_id: string } & Record<string, unknown>) => [a.user_id, a])
      );
      users.forEach((user: Record<string, unknown> & { id: string }) => {
        const acceptance = acceptanceMap.get(user.id);
        user.charter_acceptances = acceptance ? [acceptance] : [];
      });
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin users API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}