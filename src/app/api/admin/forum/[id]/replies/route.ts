/** POST /api/admin/forum/:id/replies — réponse publiée au nom de l'équipe. */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAccountId } from "@/lib/admin-system-user";
import { FORUM_LIMITS } from "@/lib/forum-shared";
import { forumError } from "@/lib/forum-admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > FORUM_LIMITS.replyMax) {
    return NextResponse.json({ error: "Écrivez une réponse (5 000 caractères maximum)." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let authorId: string;
  try { authorId = await getAdminAccountId(db); } catch (e) {
    console.error("[Admin forum] compte équipe indisponible:", e);
    return NextResponse.json({ error: "Le compte de l'équipe n'a pas pu être préparé." }, { status: 500 });
  }

  const { data, error } = await db.from("forum_replies")
    .insert({ topic_id: id, author_id: authorId, body: text, is_staff: true })
    .select("id").single();
  if (error) return forumError(error);

  try { await logAdminAction(admin.adminId, admin.email, "forum_reply_created", "system", id, { reply_id: data.id }); } catch { /* non bloquant */ }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
