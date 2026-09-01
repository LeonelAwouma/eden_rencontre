/**
 * POST /api/admin/messages/send
 *
 * Allows an administrator to send a message to any user on the platform.
 * The message appears as coming from a system profile named "Admin".
 *
 * Body: { target_user_id: string, content: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureAdminSystemUser, ensureAdminProfile, getOrCreateAdminConversation,
  ADMIN_PROFILE_NAME,
} from "@/lib/admin-system-user";

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { target_user_id?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { target_user_id, content } = body;
  if (!target_user_id || !content?.trim()) {
    return NextResponse.json({ error: "target_user_id et content sont requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Verify the target user exists
  const { data: targetProfile, error: profileErr } = await supabase
    .from("profiles").select("id, name, email").eq("id", target_user_id).single();

  if (profileErr || !targetProfile) {
    return NextResponse.json({ error: "Utilisateur cible introuvable" }, { status: 404 });
  }

  try {
    const adminUserId = await ensureAdminSystemUser(supabase);
    await ensureAdminProfile(supabase, adminUserId);
    const conversationId = await getOrCreateAdminConversation(supabase, adminUserId, target_user_id);

    const { data: message, error: msgErr } = await supabase
      .from("messages").insert({ conversation_id: conversationId, sender_id: adminUserId, content: content.trim() })
      .select("id, conversation_id, sender_id, content, created_at").single();

    if (msgErr || !message) {
      return NextResponse.json({ error: `Échec de l'envoi: ${msgErr?.message || "erreur inconnue"}` }, { status: 500 });
    }

    // Log the admin action
    try {
      await logAdminAction(admin.adminId, admin.email, "send_message_to_user", "user", target_user_id, {
        conversation_id: conversationId,
        message_preview: content.trim().slice(0, 100),
      });
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      message: { id: message.id, conversation_id: message.conversation_id, content: message.content, created_at: message.created_at, sender_name: ADMIN_PROFILE_NAME },
      target_user: { id: targetProfile.id, name: targetProfile.name, email: targetProfile.email },
    });
  } catch (err) {
    console.error("[Admin Send Message] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
