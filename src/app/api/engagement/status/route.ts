import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET — Latest engagement request status for a conversation
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    const { data, error } = await db
      .from("engagement_requests")
      .select("id, requester_id, recipient_id, status")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json({
      status: data.status,
      requestId: data.id,
      requesterId: data.requester_id,
      recipientId: data.recipient_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Engagement Status GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
