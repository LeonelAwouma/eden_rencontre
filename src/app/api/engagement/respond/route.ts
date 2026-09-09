import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// POST — Accept or decline a pending engagement request
export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { requestId, responderId, accept } = await req.json();

    if (!requestId || !responderId || typeof accept !== "boolean") {
      return NextResponse.json({ error: "requestId, responderId et accept requis" }, { status: 400 });
    }

    const { data: request, error: fetchError } = await db
      .from("engagement_requests")
      .select("id, requester_id, recipient_id, status")
      .eq("id", requestId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!request) {
      return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    }
    if (request.recipient_id !== responderId) {
      return NextResponse.json({ error: "Vous n'êtes pas destinataire de cette demande." }, { status: 403 });
    }
    if (request.status !== "pending") {
      return NextResponse.json({ error: "Cette demande a déjà reçu une réponse." }, { status: 409 });
    }

    const newStatus = accept ? "accepted" : "declined";
    const { error: updateError } = await db
      .from("engagement_requests")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", requestId);
    if (updateError) throw updateError;

    const { data: responder } = await db
      .from("profiles")
      .select("pseudo, name")
      .eq("id", responderId)
      .maybeSingle();
    const responderName = responder?.pseudo || responder?.name || "Votre correspondant(e)";

    try {
      await db.from("meeting_notifications").insert(
        accept
          ? {
              user_id: request.requester_id,
              notification_type: "engagement_accepted",
              title: "💍 Engagement accepté",
              message: `${responderName} a accepté de s'engager avec vous ! Le paiement pour finaliser votre engagement sera bientôt disponible.`,
            }
          : {
              user_id: request.requester_id,
              notification_type: "engagement_declined",
              title: "Demande d'engagement refusée",
              message: `${responderName} a décliné votre demande d'engagement.`,
            }
      );
    } catch (notifErr) {
      console.error("[Engagement Respond] Failed to create notification:", notifErr);
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Engagement Respond POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
