/**
 * POST /api/forum/messages — { body?, sticker?, replyTo? }
 *
 * Seul chemin d'envoi d'un message du forum (groupe de tous les membres). Avant, le navigateur
 * insérait lui-même dans forum_messages : aucune modération, un numéro de téléphone pouvait
 * être publié devant tout le groupe. Ici le texte passe par le moteur de modération (toute
 * coordonnée est bloquée, sans exception de confiance), puis le message est inséré avec la clé
 * de service. Les règles de la RLS forum_messages_insert sont reproduites : compte approuvé
 * (getApprovedUser), groupe ouvert et membre pas en sourdine (forum_can_post).
 * L'insertion directe est retirée par supabase/migrations/20261125_forum_moderation.sql.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { findSticker, forumMessageColumns } from "@/lib/forum-shared";
import { moderateForumText, FORUM_BODY_MAX, FORUM_CANNOT_POST, FORUM_CONTACT_BLOCKED, isUuid } from "@/lib/forum-server";

export async function POST(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const input = await req.json().catch(() => ({}));
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const sticker = typeof input.sticker === "string" && input.sticker ? input.sticker : null;
  const replyTo = typeof input.replyTo === "string" && input.replyTo ? input.replyTo : null;

  if (sticker && !findSticker(sticker)) return NextResponse.json({ error: "Sticker inconnu." }, { status: 400 });
  if (!body && !sticker) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (body.length > FORUM_BODY_MAX) return NextResponse.json({ error: `Message trop long (${FORUM_BODY_MAX} caractères au plus).` }, { status: 400 });
  if (replyTo && !isUuid(replyTo)) return NextResponse.json({ error: "Message cité invalide." }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: canPost } = await db.rpc("forum_can_post", { u: user.id });
  if (canPost !== true) return NextResponse.json({ error: FORUM_CANNOT_POST }, { status: 403 });

  if (body) {
    const blocked = await moderateForumText(user.id, body);
    if (blocked) return NextResponse.json({ error: FORUM_CONTACT_BLOCKED, reason: blocked }, { status: 422 });
  }

  const row = { author_id: user.id, body, sticker, reply_to_id: replyTo };
  const insert = (withEdited: boolean) =>
    db.from("forum_messages").insert(row).select(forumMessageColumns(undefined, withEdited)).single();
  let { data, error } = await insert(true);
  // Colonne edited_at absente (migration 20261002 non exécutée) : on relit sans elle.
  if (error && /edited_at/.test(error.message || "")) ({ data, error } = await insert(false));
  if (error || !data) {
    console.error("[forum/messages] insertion impossible:", error?.message);
    return NextResponse.json({ error: "Message non envoyé. Réessayez." }, { status: 500 });
  }
  return NextResponse.json({ message: data });
}
