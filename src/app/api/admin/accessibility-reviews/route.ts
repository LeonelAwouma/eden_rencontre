/**
 * Avis d'accessibilité — administration.
 * GET /api/admin/accessibility-reviews?sort=recent|rating_desc|rating_asc|relevance&flagged=1&rating=1-5
 *     → { summary, flaggedCount, reviews: [{ id, rating, comment, flagged, created_at, updated_at, author }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { REVIEWS_MIGRATION_MISSING, isReviewsMissing, parseSort, sortReviews, summarize } from "@/lib/accessibility-reviews";

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const sort = parseSort(searchParams.get("sort"));
  const flaggedOnly = searchParams.get("flagged") === "1";
  const ratingFilter = Number(searchParams.get("rating"));

  const { data, error } = await getSupabaseAdmin().from("accessibility_reviews")
    .select("id, rating, comment, flagged, flagged_at, created_at, updated_at, author:profiles!accessibility_reviews_user_id_fkey(id, pseudo, name, email, avatar_url)")
    .order("created_at", { ascending: false }).limit(5000);
  if (error) {
    return isReviewsMissing(error)
      ? NextResponse.json({ error: REVIEWS_MIGRATION_MISSING }, { status: 409 })
      : NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }

  const all = data || [];
  let list = all;
  if (flaggedOnly) list = list.filter((r) => r.flagged);
  if (ratingFilter >= 1 && ratingFilter <= 5) list = list.filter((r) => r.rating === ratingFilter);

  return NextResponse.json({
    summary: summarize(all.map((r) => r.rating)),
    flaggedCount: all.filter((r) => r.flagged).length,
    reviews: sortReviews(list, sort),
  });
}
