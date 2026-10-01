/**
 * GET    /api/admin/forum/:id — sujet, toutes ses réponses (masquées comprises) et signalements
 * PATCH  /api/admin/forum/:id — { is_pinned?, is_locked?, status?, resolve_reports? }
 * DELETE /api/admin/forum/:id — suppression définitive (réponses comprises)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_AUTHOR, forumError, openReportCounts } from "@/lib/forum-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const db = getSupabaseAdmin();

  const [topicRes, repliesRes, reportsRes] = await Promise.all([
    db.from("forum_topics").select("*, " + ADMIN_AUTHOR.replace("%s", "forum_topics")).eq("id", id).maybeSingle(),
    db.from("forum_replies").select("*, " + ADMIN_AUTHOR.replace("%s", "forum_replies")).eq("topic_id", id).order("created_at", { ascending: true }),
    db.from("forum_reports")
      .select("id, reply_id, reason, resolved, created_at, reporter:profiles!forum_reports_reporter_id_fkey(id, pseudo, name)")
      .eq("topic_id", id).order("created_at", { ascending: false }),
  ]);
  if (topicRes.error) return forumError(topicRes.error);
  if (!topicRes.data) return NextResponse.json({ error: "Sujet introuvable" }, { status: 404 });
  if (repliesRes.error) return forumError(repliesRes.error);

  const counts = await openReportCounts(db, [id]);
  const replies = (repliesRes.data || []).map((r) => ({ ...(r as unknown as Record<string, unknown>), open_reports: counts.byReply[(r as unknown as { id: string }).id] || 0 }));

  return NextResponse.json({ topic: topicRes.data, replies, reports: reportsRes.data || [] });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  const update: Record<string, unknown> = {};
  if (typeof body.is_pinned === "boolean") update.is_pinned = body.is_pinned;
  if (typeof body.is_locked === "boolean") update.is_locked = body.is_locked;
  if (body.status === "visible" || body.status === "hidden") update.status = body.status;

  if (Object.keys(update).length > 0) {
    const { error } = await db.from("forum_topics").update(update).eq("id", id);
    if (error) return forumError(error);
  }
  // Masquer un sujet, ou décider explicitement, traite ses signalements.
  if (body.resolve_reports || update.status === "hidden") {
    const { error } = await db.from("forum_reports").update({ resolved: true }).eq("topic_id", id).eq("resolved", false);
    if (error) return forumError(error);
  }

  try { await logAdminAction(admin.adminId, admin.email, "forum_topic_updated", "system", id, { ...update, resolve_reports: !!body.resolve_reports }); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const db = getSupabaseAdmin();
  const { data: topic } = await db.from("forum_topics").select("title, author_id").eq("id", id).maybeSingle();
  const { error } = await db.from("forum_topics").delete().eq("id", id);
  if (error) return forumError(error);
  try { await logAdminAction(admin.adminId, admin.email, "forum_topic_deleted", "system", id, { title: topic?.title, author_id: topic?.author_id }); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}
