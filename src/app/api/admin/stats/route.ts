import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    // Get all stats in parallel
    const [
      { count: totalUsers },
      { count: pendingUsers },
      { count: approvedUsers },
      { count: rejectedUsers },
      { count: suspendedUsers },
      { count: totalEvents },
      { count: publishedEvents },
      { data: recentUsers },
      { data: recentAudit },
    ] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      db.from("meet_events").select("*", { count: "exact", head: true }),
      db.from("meet_events").select("*", { count: "exact", head: true }).eq("status", "published"),
      db.from("profiles").select("id, name, email, status, created_at, updated_at, city, country, avatar_url").order("created_at", { ascending: false }).limit(5),
      db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(10),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        pendingUsers: pendingUsers || 0,
        approvedUsers: approvedUsers || 0,
        rejectedUsers: rejectedUsers || 0,
        suspendedUsers: suspendedUsers || 0,
        totalEvents: totalEvents || 0,
        publishedEvents: publishedEvents || 0,
      },
      recentUsers: recentUsers || [],
      recentAudit: recentAudit || [],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin stats API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}