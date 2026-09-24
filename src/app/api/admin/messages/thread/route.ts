/**
 * GET /api/admin/messages/thread
 *   ?conversation_id=…   conversation existante
 *   ?user_id=…           conversation avec ce membre (vide s'il n'y en a pas encore)
 *   &after=<ISO>         optionnel : seulement les messages plus récents (rafraîchissement)
 *
 * Renvoie les messages de la conversation admin ↔ membre et la marque comme lue
 * côté admin (conversation_members.last_read_at).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAccountId, findAdminConversation } from "@/lib/admin-system-user";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  let conversationId = params.get("conversation_id");
  const userId = params.get("user_id");
  const after = params.get("after");

  if ((conversationId && !UUID.test(conversationId)) || (userId && !UUID.test(userId)) || (!conversationId && !userId)) {
    return NextResponse.json({ error: "conversation_id ou user_id requis" }, { status: 400 });
  }
  if (after && Number.isNaN(Date.parse(after))) {
    return NextResponse.json({ error: "Paramètre after invalide" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const adminId = await getAdminAccountId(supabase);

    if (!conversationId && userId) {
      conversationId = await findAdminConversation(supabase, adminId, userId);
      if (!conversationId) return NextResponse.json({ conversation_id: null, messages: [] });
    }

    // Le compte admin doit être membre de la conversation avant d'en lire le contenu.
    const { data: membership } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", conversationId!)
      .eq("user_id", adminId)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    let query = supabase
      .from("messages")
      .select("id, sender_id, content, image_url, created_at")
      .eq("conversation_id", conversationId!)
      .order("created_at", { ascending: true });
    if (after) query = query.gt("created_at", after);
    const { data: messages, error } = await query;
    if (error) throw error;

    // Accusé de lecture de l'autre membre : dernière lecture côté membre.
    const { data: otherMember } = await supabase
      .from("conversation_members")
      .select("last_read_at")
      .eq("conversation_id", conversationId!)
      .neq("user_id", adminId)
      .maybeSingle();

    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId!)
      .eq("user_id", adminId);

    return NextResponse.json({
      conversation_id: conversationId,
      member_last_read_at: otherMember?.last_read_at || null,
      messages: (messages || []).map((m) => ({
        id: m.id,
        content: m.content,
        image_url: m.image_url,
        created_at: m.created_at,
        from_admin: m.sender_id === adminId,
      })),
    });
  } catch (err) {
    console.error("[Admin Messages Thread] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
