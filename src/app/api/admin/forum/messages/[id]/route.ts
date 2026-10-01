/**
 * PATCH  /api/admin/forum/messages/:id — { resolve_reports: true } : signalements traités, message conservé
 * DELETE /api/admin/forum/messages/:id — suppression (le contenu reste dans le journal d'audit)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forumError } from "@/lib/forum-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.resolve_reports) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { error } = await db.from("forum_reports").update({ resolved: true }).eq("message_id", id).eq("resolved", false);
  if (error) return forumError(error);
  try { await logAdminAction(admin.adminId, admin.email, "forum_reports_resolved", "system", id); } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const db = getSupabaseAdmin();

  const { data: msg } = await db.from("forum_messages").select("author_id, body, sticker, created_at").eq("id", id).maybeSingle();
  const { error } = await db.from("forum_messages").delete().eq("id", id);
  if (error) return forumError(error);

  try {
    await logAdminAction(admin.adminId, admin.email, "forum_message_deleted", "user", msg?.author_id, {
      message_id: id, body: msg?.body?.slice(0, 2000), sticker: msg?.sticker, created_at: msg?.created_at,
    });
  } catch { /* non bloquant */ }
  return NextResponse.json({ ok: true });
}
