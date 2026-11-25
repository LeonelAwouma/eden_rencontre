/**
 * PATCH /api/forum/messages/:id — { body }
 *
 * Modification du texte de son propre message du forum, avec la même modération que l'envoi
 * (sinon un numéro pourrait être glissé après coup). Règles reprises de la RLS
 * forum_messages_update (20261002_forum_edit.sql) : auteur seulement, compte approuvé,
 * groupe ouvert et pas en sourdine, 5 minutes au plus après l'envoi.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { FORUM_EDIT_WINDOW_MS, forumMessageColumns } from "@/lib/forum-shared";
import { moderateForumText, FORUM_BODY_MAX, FORUM_CANNOT_POST, FORUM_CONTACT_BLOCKED, isUuid } from "@/lib/forum-server";

/** Reconnu par src/lib/forum.ts (FORUM_EDIT_EXPIRED). */
const FORUM_EDIT_EXPIRED = "forum_edit_expired";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Message invalide." }, { status: 400 });

  const input = await req.json().catch(() => ({}));
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (body.length > FORUM_BODY_MAX) return NextResponse.json({ error: `Message trop long (${FORUM_BODY_MAX} caractères au plus).` }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: current } = await db.from("forum_messages").select("author_id, created_at").eq("id", id).maybeSingle();
  if (!current || current.author_id !== user.id) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
  if (Date.now() - new Date(current.created_at as string).getTime() > FORUM_EDIT_WINDOW_MS) {
    return NextResponse.json({ error: FORUM_EDIT_EXPIRED }, { status: 403 });
  }

  const { data: canPost } = await db.rpc("forum_can_post", { u: user.id });
  if (canPost !== true) return NextResponse.json({ error: FORUM_CANNOT_POST }, { status: 403 });

  const blocked = await moderateForumText(user.id, body);
  if (blocked) return NextResponse.json({ error: FORUM_CONTACT_BLOCKED, reason: blocked }, { status: 422 });

  // edited_at est posé par le trigger forum_messages_mark_edited.
  const { data, error } = await db.from("forum_messages").update({ body }).eq("id", id).eq("author_id", user.id)
    .select(forumMessageColumns()).single();
  if (error || !data) {
    console.error("[forum/messages] modification impossible:", error?.message);
    return NextResponse.json({ error: "Modification non enregistrée. Réessayez." }, { status: 500 });
  }
  return NextResponse.json({ message: data });
}
