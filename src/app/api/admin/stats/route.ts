import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Percentage change vs. 30 days ago. null when there's no prior baseline to compare against
// (so the UI can omit the badge instead of showing a misleading 0%/100%).
function growthPct(current: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((current - before) / before) * 100);
}

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const cutoff30d = new Date();
    cutoff30d.setDate(cutoff30d.getDate() - 30);
    const cutoff30dIso = cutoff30d.toISOString();

    // Get all stats in parallel
    const [
      { count: totalUsers },
      { count: pendingUsers },
      { count: approvedUsers },
      { count: rejectedUsers },
      { count: suspendedUsers },
      { count: totalEvents },
      { count: publishedEvents },
      { count: totalUsersBefore30d },
      { count: approvedUsersBefore30d },
      { count: suspendedUsersBefore30d },
      { data: recentUsers },
      { data: recentAudit },
      { data: signupsLast30d },
    ] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      db.from("meet_events").select("*", { count: "exact", head: true }),
      db.from("meet_events").select("*", { count: "exact", head: true }).eq("status", "published"),
      db.from("profiles").select("*", { count: "exact", head: true }).lt("created_at", cutoff30dIso),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved").lt("created_at", cutoff30dIso),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended").lt("created_at", cutoff30dIso),
      db.from("profiles").select("id, name, pseudo, email, status, created_at, updated_at, city, country, avatar_url").order("created_at", { ascending: false }).limit(6),
      db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(10),
      db.from("profiles").select("created_at").gte("created_at", cutoff30dIso),
    ]);

    // Bucket real signups into 30 daily counts (oldest → newest) for the chart —
    // previously this chart was Math.random() and never reflected the database.
    const dailyRegistrations: { date: string; count: number }[] = [];
    const dayBuckets = new Map<string, number>();
    for (const row of signupsLast30d || []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyRegistrations.push({
        date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        count: dayBuckets.get(key) || 0,
      });
    }

    // Journal d'activité : nom de l'utilisateur concerné, pour la timeline.
    const targetIds = [...new Set((recentAudit || [])
      .filter((a) => a.target_type === "user" && a.target_id).map((a) => a.target_id as string))];
    const targetNames = new Map<string, string>();
    if (targetIds.length) {
      const { data: targets } = await db.from("profiles").select("id, name, pseudo, email").in("id", targetIds);
      for (const t of targets || []) targetNames.set(t.id, t.pseudo || t.name || t.email || "Membre");
    }
    const auditWithTargets = (recentAudit || []).map((a) => ({
      ...a,
      target_label: a.target_type === "user" && a.target_id ? targetNames.get(a.target_id) ?? null : null,
    }));

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
      growth: {
        totalUsers: growthPct(totalUsers || 0, totalUsersBefore30d || 0),
        approvedUsers: growthPct(approvedUsers || 0, approvedUsersBefore30d || 0),
        suspendedUsers: growthPct(suspendedUsers || 0, suspendedUsersBefore30d || 0),
      },
      dailyRegistrations,
      recentUsers: recentUsers || [],
      recentAudit: auditWithTargets,
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