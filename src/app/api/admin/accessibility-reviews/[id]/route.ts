/**
 * PATCH  /api/admin/accessibility-reviews/:id — { flagged: boolean } : signaler / retirer le signalement
 * DELETE /api/admin/accessibility-reviews/:id — supprimer l'avis (le membre pourra en publier un nouveau)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.flagged !== "boolean") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const { data, error } = await getSupabaseAdmin().from("accessibility_reviews")
    .update({ flagged: body.flagged, flagged_at: body.flagged ? new Date().toISOString() : null })
    .eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });

  try { await logAdminAction(admin.adminId, admin.email, body.flagged ? "accessibility_review_flagged" : "accessibility_review_unflagged", "system", id); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: review } = await db.from("accessibility_reviews").select("user_id, rating, comment").eq("id", id).maybeSingle();
  if (!review) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  const { error } = await db.from("accessibility_reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });

  try { await logAdminAction(admin.adminId, admin.email, "accessibility_review_deleted", "system", id, review); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}
