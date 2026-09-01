/**
 * GET /api/admin/messages/thread?conversation_id=...
 *
 * Full message history for one admin↔user conversation, and marks it read
 * for the admin side (updates conversation_members.last_read_at).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ensureAdminSystemUser } from "@/lib/admin-system-user";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversation_id");
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const adminId = await ensureAdminSystemUser(supabase);

    // Verify the admin account is actually a member of this conversation
    // before returning its content or marking it read.
    const { data: membership } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", adminId)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", adminId);

    return NextResponse.json({
      messages: (messages || []).map((m) => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        from_admin: m.sender_id === adminId,
      })),
    });
  } catch (err) {
    console.error("[Admin Messages Thread] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
