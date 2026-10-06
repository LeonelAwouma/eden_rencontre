/**
 * Avis d'accessibilité de la plateforme — côté membre (compte approuvé).
 * GET    /api/accessibility-reviews — { summary, mine }
 * PUT    /api/accessibility-reviews — { rating: 1-5, comment? } : publie ou modifie MON avis (un seul par membre)
 * DELETE /api/accessibility-reviews — supprime mon avis
 * L'identité vient du jeton, jamais du corps de la requête.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { REVIEWS_MIGRATION_MISSING, REVIEW_COMMENT_MAX, isReviewsMissing, summarize } from "@/lib/accessibility-reviews";

const fail = (error: { code?: string; message?: string }) =>
  isReviewsMissing(error)
    ? NextResponse.json({ error: REVIEWS_MIGRATION_MISSING }, { status: 409 })
    : NextResponse.json({ error: "Erreur serveur" }, { status: 500 });

async function readSummary() {
  const { data, error } = await getSupabaseAdmin().from("accessibility_reviews").select("rating").limit(100000);
  if (error) return { error };
  return { summary: summarize((data || []).map((r) => r.rating)) };
}

export async function GET(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const s = await readSummary();
  if (s.error) return fail(s.error);
  const { data: mine, error } = await getSupabaseAdmin().from("accessibility_reviews")
    .select("rating, comment, created_at, updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return fail(error);
  return NextResponse.json({ summary: s.summary, mine: mine ?? null });
}

export async function PUT(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choisissez une note de 1 à 5 étoiles." }, { status: 400 });
  }
  if (comment.length > REVIEW_COMMENT_MAX) {
    return NextResponse.json({ error: `Le commentaire ne peut pas dépasser ${REVIEW_COMMENT_MAX} caractères.` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: readError } = await db.from("accessibility_reviews").select("id, comment").eq("user_id", user.id).maybeSingle();
  if (readError) return fail(readError);

  // Un commentaire modifié lève le signalement : l'admin le réexaminera s'il y a lieu.
  const commentChanged = !!existing && existing.comment !== comment;
  const { data, error } = existing
    ? await db.from("accessibility_reviews")
        .update({ rating, comment, updated_at: new Date().toISOString(), ...(commentChanged ? { flagged: false, flagged_at: null } : {}) })
        .eq("user_id", user.id).select("rating, comment, created_at, updated_at").single()
    : await db.from("accessibility_reviews")
        .insert({ user_id: user.id, rating, comment }).select("rating, comment, created_at, updated_at").single();
  if (error) return fail(error);

  const s = await readSummary();
  if (s.error) return fail(s.error);
  return NextResponse.json({ review: data, created: !existing, summary: s.summary });
}

export async function DELETE(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { error } = await getSupabaseAdmin().from("accessibility_reviews").delete().eq("user_id", user.id);
  if (error) return fail(error);
  const s = await readSummary();
  if (s.error) return fail(s.error);
  return NextResponse.json({ summary: s.summary });
}
