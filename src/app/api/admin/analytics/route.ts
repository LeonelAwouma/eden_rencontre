import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { genderKey } from "@/lib/verses";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin().catch(() => null))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles").select("id", { count: "exact", head: true });

    // New registrations in period
    const { count: newRegistrations } = await supabase
      .from("profiles").select("id", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    // Status breakdown
    const [approved, pending, rejected, suspended] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    ]);

    const approvedCount = approved.count || 0;
    const totalDecided = approvedCount + (rejected.count || 0);
    const approvalRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 0;
    const conversionRate = (totalUsers || 0) > 0 ? Math.round((approvedCount / (totalUsers || 1)) * 100) : 0;

    // Meet events (table may not exist yet)
    let totalMeetsCount = 0, publishedMeetsCount = 0, completedMeetsCount = 0;
    try {
      const [totalMeets, publishedMeets, completedMeets] = await Promise.all([
        supabase.from("meet_events").select("id", { count: "exact", head: true }),
        supabase.from("meet_events").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("meet_events").select("id", { count: "exact", head: true })
          .eq("status", "published").lt("event_date", new Date().toISOString()),
      ]);
      totalMeetsCount = totalMeets.count || 0;
      publishedMeetsCount = publishedMeets.count || 0;
      completedMeetsCount = completedMeets.count || 0;
    } catch {
      console.warn("meet_events table not found, skipping meet stats");
    }

    // Daily registrations for chart
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("created_at, status, city, country")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Build daily registration counts
    const dailyData: Record<string, { date: string; total: number; approved: number; pending: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { date: key, total: 0, approved: 0, pending: 0 };
    }

    (allProfiles || []).forEach((p) => {
      const key = p.created_at.split("T")[0];
      if (dailyData[key]) {
        dailyData[key].total++;
        if (p.status === "approved") dailyData[key].approved++;
        if (p.status === "pending") dailyData[key].pending++;
      }
    });

    // Gender distribution — sur tous les membres (pas seulement les inscrits de
    // la période), hors compte système « Admin ». Les valeurs stockées varient
    // (« homme »/« femme » à l'inscription, « Male »/« Female » via l'ancien
    // formulaire de profil…) : on les ramène à deux catégories.
    const { data: genderRows } = await supabase
      .from("profiles")
      .select("gender")
      .neq("email", ADMIN_SYSTEM_EMAIL);
    const genderCounts = { male: 0, female: 0, unknown: 0 };
    (genderRows || []).forEach((p) => {
      const key = genderKey(p.gender);
      genderCounts[key ?? "unknown"]++;
    });
    const genderDistribution = [
      { name: "Hommes", value: genderCounts.male, color: "#486B46" },
      { name: "Femmes", value: genderCounts.female, color: "#8FB08A" },
      { name: "Non renseigné", value: genderCounts.unknown, color: "#D1D5DB" },
    ].filter((g) => g.value > 0);

    // Top cities
    const cityCounts: Record<string, number> = {};
    (allProfiles || []).forEach((p) => {
      if (p.city) {
        cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
      }
    });
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    // Country distribution
    const countryCounts: Record<string, number> = {};
    (allProfiles || []).forEach((p) => {
      if (p.country) {
        countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
      }
    });
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        newRegistrations: newRegistrations || 0,
        activeUsers: approvedCount,
        conversionRate,
        approvalRate,
        totalMeets: totalMeetsCount,
        publishedMeets: publishedMeetsCount,
        completedMeets: completedMeetsCount,
      },
      dailyRegistrations: Object.values(dailyData),
      genderDistribution,
      topCities,
      topCountries,
    });
  } catch (err) {
    console.error("Analytics fetch error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}