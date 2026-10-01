import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// POST — Send an engagement request to the other member of a conversation
export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { conversationId, requesterId, recipientId } = await req.json();
    // Un « vrai match » naît de cette demande : on vérifie qui l'envoie
    // (sans cela, n'importe qui pouvait écrire au nom d'un autre membre).
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
    if (user.id !== requesterId) return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });

    if (!conversationId || !requesterId || !recipientId) {
      return NextResponse.json({ error: "conversationId, requesterId et recipientId requis" }, { status: 400 });
    }
    if (requesterId === recipientId) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    // Both must actually belong to this conversation
    const { data: members, error: membersError } = await db
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId);
    if (membersError) throw membersError;
    const memberIds = new Set((members || []).map((m) => m.user_id));
    if (!memberIds.has(requesterId) || !memberIds.has(recipientId)) {
      return NextResponse.json({ error: "Conversation invalide." }, { status: 403 });
    }

    const { data: inserted, error: insertError } = await db
      .from("engagement_requests")
      .insert({ conversation_id: conversationId, requester_id: requesterId, recipient_id: recipientId })
      .select("id")
      .single();

    if (insertError) {
      // Unique index violation → a request is already pending for this conversation
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Une demande d'engagement est déjà en attente pour cette conversation." }, { status: 409 });
      }
      throw insertError;
    }

    const { data: requester } = await db
      .from("profiles")
      .select("pseudo, name")
      .eq("id", requesterId)
      .maybeSingle();
    const requesterName = requester?.pseudo || requester?.name || "Un membre";

    try {
      await db.from("meeting_notifications").insert({
        user_id: recipientId,
        notification_type: "engagement_request",
        title: "💍 Demande d'engagement",
        message: `${requesterName} souhaite officialiser votre relation et s'engager avec vous. Ouvrez votre messagerie pour répondre.`,
      });
    } catch (notifErr) {
      console.error("[Engagement Request] Failed to create notification:", notifErr);
    }

    return NextResponse.json({ ok: true, requestId: inserted.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Engagement Request POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
