/**
 * POST /api/admin/users/:id/reverify-selfie
 *
 * Repasse le selfie d'un membre aux règles actuelles (src/lib/face-rules.ts) :
 * chaque photo de profil doit correspondre au selfie. Sert surtout aux membres
 * inscrits avant le renforcement, quand une seule photo sur trois suffisait.
 * La preuve de présence ne peut pas être refaite (la rafale n'est pas
 * conservée) : on garde le résultat enregistré à l'inscription, s'il existe.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifySelfieServer } from "@/lib/face-verification-server";
import { decide, type LivenessCheck } from "@/lib/face-rules";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/registration-media";

export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: profile, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  if (!profile.selfie_url) return NextResponse.json({ error: "Aucun selfie enregistré pour ce membre." }, { status: 400 });

  // Fichiers du stockage privé : liens signés de courte durée pour l'analyse.
  const selfieSrc = await resolveMediaUrl(db, profile.selfie_url, 300);
  if (!selfieSrc) return NextResponse.json({ error: "Selfie introuvable dans le stockage." }, { status: 404 });
  const photos = await resolveMediaUrls(db, profile.profile_photos, 300);
  const result = await verifySelfieServer(selfieSrc, photos, null);

  const previous = (profile.selfie_verification_details || null) as { liveness?: LivenessCheck | null } | null;
  const liveness = previous?.liveness ?? null;
  const verdict = decide(result.photos, liveness);
  // Erreur d'analyse (selfie illisible…) : decide n'a pas de photos, on garde la raison du moteur.
  const reason = result.photos.length ? verdict.reason : result.reason;
  const details = { photos: result.photos, liveness, reason, checked_at: new Date().toISOString(), rechecked_by_admin: true };

  const update: Record<string, unknown> = {
    selfie_verified: result.photos.length ? verdict.verified : false,
    selfie_verification_score: result.photos.length ? verdict.score : 0,
  };
  const { error: saveError } = await db.from("profiles").update({ ...update, selfie_verification_details: details }).eq("id", id);
  if (saveError) {
    // Colonne de détail absente (migration non exécutée) : on enregistre au moins le verdict.
    await db.from("profiles").update(update).eq("id", id);
  }

  try {
    await logAdminAction(admin.adminId, admin.email, "selfie_reverified", "user", id, {
      before: { verified: profile.selfie_verified, score: profile.selfie_verification_score },
      after: update,
    });
  } catch { /* non bloquant */ }

  return NextResponse.json({ ...update, details, detailsSaved: !saveError });
}
