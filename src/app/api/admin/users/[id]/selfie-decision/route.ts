/**
 * POST /api/admin/users/:id/selfie-decision — { match: boolean }
 *
 * L'admin compare lui-même le selfie pris à l'inscription aux photos de profil
 * (Admin → fiche membre, panneau « Vérification du selfie ») et enregistre son
 * verdict : il n'y a plus de comparaison automatique des visages.
 *   match = true  → selfie_verified = true  (« le selfie correspond »)
 *   match = false → selfie_verified = false (« ne correspond pas »)
 * Qui a décidé et quand est gardé dans selfie_verification_details.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  if (typeof body.match !== "boolean") {
    return NextResponse.json({ error: "Décision manquante." }, { status: 400 });
  }
  const match: boolean = body.match;

  const db = getSupabaseAdmin();
  const { data: profile, error } = await db.from("profiles").select("id, selfie_url, selfie_verified").eq("id", id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  if (!profile.selfie_url) return NextResponse.json({ error: "Aucun selfie enregistré pour ce membre." }, { status: 400 });

  const update = { selfie_verified: match, selfie_verification_score: 0 };
  const details = {
    method: "admin" as const,
    decision: match ? ("match" as const) : ("mismatch" as const),
    reviewed_by: admin.email,
    reviewed_at: new Date().toISOString(),
  };
  const { error: saveError } = await db.from("profiles").update({ ...update, selfie_verification_details: details }).eq("id", id);
  if (saveError) {
    // Colonne de détail absente (migration 20261002_selfie_verification.sql non exécutée) : le verdict seul.
    const { error: verdictError } = await db.from("profiles").update(update).eq("id", id);
    if (verdictError) return NextResponse.json({ error: "Décision non enregistrée. Réessayez." }, { status: 500 });
  }

  try {
    await logAdminAction(admin.adminId, admin.email, "selfie_reviewed", "user", id, {
      before: { verified: profile.selfie_verified },
      after: { verified: match },
    });
  } catch { /* non bloquant */ }

  return NextResponse.json({ ...update, details, detailsSaved: !saveError });
}
