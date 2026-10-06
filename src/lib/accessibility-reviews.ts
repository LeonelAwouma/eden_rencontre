// Avis d'accessibilité de la plateforme — types et calculs communs (client + serveur).

export const REVIEW_COMMENT_MAX = 1000;

export type ReviewSort = "recent" | "rating_desc" | "rating_asc" | "relevance";

export interface ReviewSummary {
  average: number; // 0 s'il n'y a aucun avis
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface MyReview {
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export const REVIEWS_MIGRATION_MISSING =
  "Les avis d'accessibilité ne sont pas encore installés : exécutez supabase/migrations/20261004_accessibility_reviews.sql dans Supabase (SQL Editor).";

export function isReviewsMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return error.code === "42P01" || error.code === "PGRST205" || (/accessibility_reviews/.test(msg) && /does not exist|schema cache/i.test(msg));
}

export function summarize(ratings: number[]): ReviewSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary["distribution"];
  let sum = 0;
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5]++;
      sum += r;
    }
  }
  const count = ratings.length;
  return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
}

/** Niveau d'accessibilité communautaire d'après la moyenne. */
export function accessibilityLevel(average: number, count: number): { label: string; tone: "none" | "low" | "mid" | "high" } {
  if (!count) return { label: "Pas encore évaluée", tone: "none" };
  if (average >= 4.2) return { label: "Très accessible", tone: "high" };
  if (average >= 3.4) return { label: "Plutôt accessible", tone: "high" };
  if (average >= 2.5) return { label: "Accessibilité moyenne", tone: "mid" };
  return { label: "À améliorer", tone: "low" };
}

/**
 * Pertinence : un avis détaillé en dit plus qu'une simple note. Les avis non
 * signalés passent d'abord, puis ceux qui ont un commentaire long, puis les récents.
 */
export function relevanceScore(r: { comment: string; flagged: boolean; created_at: string }): number {
  const detail = Math.min(r.comment.trim().length, 500);
  const recency = new Date(r.created_at).getTime() / 1e13; // < 1 : simple départage
  return (r.flagged ? -10000 : 0) + (r.comment.trim() ? 1000 : 0) + detail + recency;
}

export function sortReviews<T extends { rating: number; comment: string; flagged: boolean; created_at: string }>(list: T[], sort: ReviewSort): T[] {
  const byDate = (a: T, b: T) => b.created_at.localeCompare(a.created_at);
  const copy = [...list];
  switch (sort) {
    case "rating_desc": return copy.sort((a, b) => b.rating - a.rating || byDate(a, b));
    case "rating_asc": return copy.sort((a, b) => a.rating - b.rating || byDate(a, b));
    case "relevance": return copy.sort((a, b) => relevanceScore(b) - relevanceScore(a));
    default: return copy.sort(byDate);
  }
}

export function parseSort(value: string | null): ReviewSort {
  return value === "rating_desc" || value === "rating_asc" || value === "relevance" ? value : "recent";
}
