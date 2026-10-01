/**
 * PATCH  /api/admin/forum/replies/:replyId — { status?: "visible" | "hidden", resolve_reports? }
 * DELETE /api/admin/forum/replies/:replyId
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forumError } from "@/lib/forum-admin";

type Ctx = { params: Promise<{ replyId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { replyId } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  if (body.status === "visible" || body.status === "hidden") {
    const { error } = await db.from("forum_replies").update({ status: body.status }).eq("id", replyId);
    if (error) return forumError(error);
  }
  if (body.resolve_reports || body.status === "hidden") {
    const { error } = await db.from("forum_reports").update({ resolved: true }).eq("reply_id", replyId).eq("resolved", false);
    if (error) return forumError(error);
  }
  try { await logAdminAction(admin.adminId, admin.email, "forum_reply_updated", "system", replyId, { status: body.status, resolve_reports: !!body.resolve_reports }); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { replyId } = await params;
  const db = getSupabaseAdmin();
  const { data: reply } = await db.from("forum_replies").select("topic_id, author_id, body").eq("id", replyId).maybeSingle();
  const { error } = await db.from("forum_replies").delete().eq("id", replyId);
  if (error) return forumError(error);
  try {
    await logAdminAction(admin.adminId, admin.email, "forum_reply_deleted", "system", replyId, {
      topic_id: reply?.topic_id, author_id: reply?.author_id, body: reply?.body?.slice(0, 500),
    });
  } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}
