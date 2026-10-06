/**
 * GET /api/admin/stats/registrations?range=7|30|90|365
 * Inscriptions sur la période (par jour, par mois pour 1 an), total et
 * variation par rapport à la période précédente de même durée.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RANGES = [7, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const asked = Number(new URL(req.url).searchParams.get("range"));
  const range: Range = (RANGES as readonly number[]).includes(asked) ? (asked as Range) : 30;
  const monthly = range === 365;

  const now = new Date();
  const since = new Date(now);
  if (monthly) {
    // 12 mois pleins, mois en cours compris.
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCMonth(since.getUTCMonth() - 11);
  } else {
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (range - 1));
  }
  const prevSince = new Date(since);
  if (monthly) prevSince.setUTCMonth(prevSince.getUTCMonth() - 12);
  else prevSince.setUTCDate(prevSince.getUTCDate() - range);

  const db = getSupabaseAdmin();
  const [rowsRes, prevRes] = await Promise.all([
    db.from("profiles").select("created_at").gte("created_at", since.toISOString()).limit(100000),
    db.from("profiles").select("id", { count: "exact", head: true })
      .gte("created_at", prevSince.toISOString()).lt("created_at", since.toISOString()),
  ]);
  if (rowsRes.error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });

  const keyOf = (d: Date) => d.toISOString().slice(0, monthly ? 7 : 10);
  const buckets = new Map<string, number>();
  for (const row of rowsRes.data || []) {
    const k = keyOf(new Date(row.created_at));
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }

  const points: { date: string; label: string; count: number }[] = [];
  const cursor = new Date(since);
  const steps = monthly ? 12 : range;
  for (let i = 0; i < steps; i++) {
    const k = keyOf(cursor);
    points.push({
      date: k,
      label: monthly
        ? cursor.toLocaleDateString("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" })
        : cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }),
      count: buckets.get(k) || 0,
    });
    if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const total = (rowsRes.data || []).length;
  const previousTotal = prevRes.count ?? 0;
  const changePct = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null;

  return NextResponse.json({ range, points, total, previousTotal, changePct });
}
