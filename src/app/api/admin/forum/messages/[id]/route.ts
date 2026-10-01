/**
 * PATCH  /api/admin/forum/messages/:id — { resolve_reports: true } : signalements traités, message conservé
 *                                        { body } : corriger un message de l'équipe (5 minutes après l'envoi)
 * DELETE /api/admin/forum/messages/:id — suppression (le contenu reste dans le journal d'audit)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forumError } from "@/lib/forum-admin";
import { FORUM_EDIT_WINDOW_MS, FORUM_LIMITS, isMissingColumn } from "@/lib/forum-shared";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  // Correction d'un message de l'équipe : même règle que pour les membres
  // (5 minutes après l'envoi). Le trigger de la base pose edited_at.
  if (typeof body.body === "string") {
    const text = body.body.trim();
    if (!text || text.length > FORUM_LIMITS.bodyMax) {
      return NextResponse.json({ error: "Le message doit contenir entre 1 et 2 000 caractères." }, { status: 400 });
    }
    const { data: msg } = await db.from("forum_messages").select("is_staff, body, created_at").eq("id", id).maybeSingle();
    if (!msg) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
    if (!msg.is_staff) return NextResponse.json({ error: "Seuls les messages de l'équipe peuvent être modifiés ici." }, { status: 403 });
    if (Date.now() - new Date(msg.created_at).getTime() >= FORUM_EDIT_WINDOW_MS) {
      return NextResponse.json({ error: "Délai dépassé : un message peut être modifié pendant 5 minutes après son envoi." }, { status: 409 });
    }
    const { error } = await db.from("forum_messages").update({ body: text }).eq("id", id);
    if (error) {
      if (isMissingColumn(error) || /edited/i.test(error.message || "")) {
        return NextResponse.json({ error: "Exécutez d'abord supabase/migrations/20261002_forum_edit.sql dans Supabase." }, { status: 409 });
      }
      return forumError(error);
    }
    try { await logAdminAction(admin.adminId, admin.email, "forum_message_edited", "system", id, { before: msg.body?.slice(0, 500), after: text.slice(0, 500) }); } catch { /* non bloquant */ }
    return NextResponse.json({ ok: true });
  }

  if (!body.resolve_reports) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });

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
