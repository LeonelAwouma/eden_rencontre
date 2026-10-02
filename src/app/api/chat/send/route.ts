/**
 * POST /api/chat/send — { conversationId, content, imageUrl? }
 *
 * Seul chemin d'envoi d'un message de discussion. Avant, le navigateur appelait
 * la modération puis insérait lui-même le message : un membre malveillant
 * pouvait sauter la modération, et la route de modération (ouverte, avec un
 * senderId au choix) permettait d'accumuler de fausses infractions au nom d'un
 * autre membre. Ici, l'expéditeur est celui de la session, la modération est
 * appliquée côté serveur, puis le message est inséré avec la clé de service.
 *
 * La RLS de messages interdit désormais l'insertion directe depuis le
 * navigateur (supabase/migrations/20261002_chat_send_server_only.sql) : les
 * règles de la politique messages_insert sont donc reproduites ici, à
 * l'identique (compte approuvé, membre de la conversation, conversation
 * ouverte, amitié acceptée avec l'autre membre).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { validateMessage } from "@/lib/moderation";

const MAX_LENGTH = 5000;
/** Erreurs reconnues par le tableau de bord (notifySendError). */
const CONVERSATION_CLOSED = "conversation_closed";
const NOT_FRIENDS = "not_friends";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Seules les photos déposées dans le bucket public des discussions sont acceptées. */
function isChatImageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!base && url.startsWith(`${base}/storage/v1/object/public/chat-images/`) && url.length < 1000;
}

export async function POST(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;

  if (!UUID.test(conversationId)) return NextResponse.json({ error: "Conversation invalide." }, { status: 400 });
  if (!content && !imageUrl) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (content.length > MAX_LENGTH) return NextResponse.json({ error: `Message trop long (${MAX_LENGTH} caractères au plus).` }, { status: 400 });
  if (imageUrl && !isChatImageUrl(imageUrl)) return NextResponse.json({ error: "Photo invalide." }, { status: 400 });

  const db = getSupabaseAdmin();

  // Membre de la conversation, et autres participants.
  const { data: members } = await db.from("conversation_members").select("user_id").eq("conversation_id", conversationId);
  const memberIds = (members || []).map((m) => m.user_id as string);
  if (!memberIds.includes(user.id)) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  const others = memberIds.filter((id) => id !== user.id);

  // Conversation restreinte ou bloquée par l'admin (sans la colonne status, elle est considérée ouverte).
  const { data: conv, error: convErr } = await db.from("conversations").select("status").eq("id", conversationId).maybeSingle();
  if (!convErr && conv?.status && conv.status !== "active") {
    return NextResponse.json({ error: CONVERSATION_CLOSED }, { status: 403 });
  }

  // « Amis seulement » : au moins un autre membre avec une amitié acceptée.
  let friends = false;
  for (const other of others) {
    const { data } = await db.rpc("are_friends", { a: user.id, b: other });
    if (data === true) { friends = true; break; }
  }
  if (!friends) return NextResponse.json({ error: NOT_FRIENDS }, { status: 403 });

  // Modération du texte (les photos seules ne passent pas par le pipeline texte).
  if (content) {
    try {
      const mod = await validateMessage({
        senderId: user.id,
        receiverId: others[0] || "",
        conversationId,
        content,
      });
      if (!mod.allowed) {
        return NextResponse.json(
          { error: mod.blockReason || mod.warnings?.[0] || "Message bloqué par le système de modération.", moderationError: mod.warnings?.[0] },
          { status: 422 }
        );
      }
    } catch (err) {
      // Panne du moteur de modération : le message part (comme avant), l'incident est journalisé.
      console.error("[chat/send] modération indisponible, message autorisé:", err);
    }
  }

  const { data: message, error } = await db
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content, image_url: imageUrl })
    .select("id, sender_id, content, image_url, created_at")
    .single();
  if (error || !message) {
    console.error("[chat/send] insertion impossible:", error?.message);
    return NextResponse.json({ error: "Message non envoyé. Réessayez." }, { status: 500 });
  }
  return NextResponse.json({ message });
}
