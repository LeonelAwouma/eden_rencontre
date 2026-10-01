/**
 * POST   /api/admin/forum/mutes — { user_id, duration: "24h" | "7d" | "30d" | "forever", reason? }
 * DELETE /api/admin/forum/mutes?user_id=… — rendre la parole
 * Un membre en sourdine lit toujours le groupe mais ne peut plus y écrire.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forumError, MUTE_DURATIONS } from "@/lib/forum-admin";

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.user_id === "string" ? body.user_id : "";
  if (!userId || !(body.duration in MUTE_DURATIONS)) return NextResponse.json({ error: "Membre ou durée invalide." }, { status: 400 });

  const ms = MUTE_DURATIONS[body.duration];
  const until = ms === null ? null : new Date(Date.now() + ms).toISOString();
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) || null : null;

  const db = getSupabaseAdmin();
  const { error } = await db.from("forum_mutes").upsert({ user_id: userId, until, reason, created_at: new Date().toISOString() });
  if (error) return forumError(error);

  try { await logAdminAction(admin.adminId, admin.email, "forum_member_muted", "user", userId, { until, reason }); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true, until });
}

export async function DELETE(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "Membre manquant." }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db.from("forum_mutes").delete().eq("user_id", userId);
  if (error) return forumError(error);

  try { await logAdminAction(admin.adminId, admin.email, "forum_member_unmuted", "user", userId); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}
