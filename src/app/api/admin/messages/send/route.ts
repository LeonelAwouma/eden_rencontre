/**
 * POST /api/admin/messages/send
 *
 * L'admin écrit à n'importe quel membre, au nom du compte « Admin ».
 * Crée la conversation (et l'alliance qui permet au membre de répondre) si besoin.
 *
 * Body: { target_user_id: string, content?: string, image_url?: string }
 * Il faut un texte, une photo, ou les deux.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAccountId, getOrCreateAdminConversation, ADMIN_PROFILE_NAME } from "@/lib/admin-system-user";

const MAX_LENGTH = 4000;

/** Seules les photos déposées dans notre bucket « chat-images » sont acceptées. */
function isOwnChatImage(url: string): boolean {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return !!base && url.startsWith(`${base}/storage/v1/object/public/chat-images/`);
}

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { target_user_id?: string; content?: string; image_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const target_user_id = body.target_user_id;
  const content = (body.content || "").trim();
  const imageUrl = body.image_url?.trim() || null;

  if (!target_user_id || (!content && !imageUrl)) {
    return NextResponse.json({ error: "Écrivez un message ou joignez une photo." }, { status: 400 });
  }
  if (content.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Message trop long (${MAX_LENGTH} caractères maximum).` }, { status: 400 });
  }
  if (imageUrl && !isOwnChatImage(imageUrl)) {
    return NextResponse.json({ error: "Photo invalide." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: targetProfile, error: profileErr } = await supabase
    .from("profiles").select("id, name, email").eq("id", target_user_id).single();
  if (profileErr || !targetProfile) {
    return NextResponse.json({ error: "Utilisateur cible introuvable" }, { status: 404 });
  }

  try {
    const adminUserId = await getAdminAccountId(supabase);
    if (target_user_id === adminUserId) {
      return NextResponse.json({ error: "Destinataire invalide" }, { status: 400 });
    }
    const conversationId = await getOrCreateAdminConversation(supabase, adminUserId, target_user_id);

    const { data: message, error: msgErr } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: adminUserId, content, image_url: imageUrl })
      .select("id, conversation_id, content, image_url, created_at")
      .single();

    if (msgErr || !message) {
      return NextResponse.json({ error: `Échec de l'envoi: ${msgErr?.message || "erreur inconnue"}` }, { status: 500 });
    }

    // L'admin vient d'écrire : la conversation est lue de son côté.
    await supabase
      .from("conversation_members")
      .update({ last_read_at: message.created_at })
      .eq("conversation_id", conversationId)
      .eq("user_id", adminUserId);

    try {
      await logAdminAction(admin.adminId, admin.email, "send_message_to_user", "user", target_user_id, {
        conversation_id: conversationId,
        message_preview: content.slice(0, 100) || "(photo)",
      });
    } catch { /* non bloquant */ }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        conversation_id: message.conversation_id,
        content: message.content,
        image_url: message.image_url,
        created_at: message.created_at,
        from_admin: true,
        sender_name: ADMIN_PROFILE_NAME,
      },
      target_user: { id: targetProfile.id, name: targetProfile.name, email: targetProfile.email },
    });
  } catch (err) {
    console.error("[Admin Send Message] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
