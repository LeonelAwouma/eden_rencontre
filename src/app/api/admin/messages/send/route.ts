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

const ADMIN_SYSTEM_EMAIL = "admin-system@eden.local";
const ADMIN_SYSTEM_PASSWORD = "Eden-Admin-System-2024!SecureRandom";
const ADMIN_PROFILE_NAME = "Admin";

/** Ensures the admin system auth user exists in Supabase Auth. */
async function ensureAdminSystemUser(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = existingUsers?.users?.find((u) => u.email === ADMIN_SYSTEM_EMAIL);
  if (existing) return existing.id;

  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: ADMIN_SYSTEM_EMAIL,
    password: ADMIN_SYSTEM_PASSWORD,
    email_confirm: true,
    user_metadata: { name: ADMIN_PROFILE_NAME, is_system_admin: true },
  });
  if (error || !newUser?.user) throw new Error(`Failed to create admin system user: ${error?.message || "unknown"}`);
  return newUser.user.id;
}

/** Ensures the admin system user has a profile with name "Admin". */
async function ensureAdminProfile(supabase: ReturnType<typeof getSupabaseAdmin>, adminUserId: string): Promise<void> {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", adminUserId).single();
  if (existing) {
    await supabase.from("profiles").update({ name: ADMIN_PROFILE_NAME }).eq("id", adminUserId);
    return;
  }
  await supabase.from("profiles").insert({ id: adminUserId, email: ADMIN_SYSTEM_EMAIL, name: ADMIN_PROFILE_NAME, status: "approved" });
}


/** Finds or creates a direct conversation between the admin system user and the target user. */
async function getOrCreateAdminConversation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  adminUserId: string,
  targetUserId: string
): Promise<string> {
  const { data: adminMembers } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", adminUserId);
  const adminConvIds = (adminMembers || []).map((m) => m.conversation_id);

  if (adminConvIds.length > 0) {
    const { data: targetMember } = await supabase
      .from("conversation_members").select("conversation_id")
      .eq("user_id", targetUserId).in("conversation_id", adminConvIds).limit(1).single();
    if (targetMember) return targetMember.conversation_id;
  }

  const { data: newConv, error: convErr } = await supabase
    .from("conversations").insert({ is_direct: true }).select("id").single();
  if (convErr || !newConv) throw new Error(`Failed to create conversation: ${convErr?.message || "unknown"}`);

  const { error: memErr } = await supabase.from("conversation_members").insert([
    { conversation_id: newConv.id, user_id: adminUserId },
    { conversation_id: newConv.id, user_id: targetUserId },
  ]);
  if (memErr) throw new Error(`Failed to add members: ${memErr.message}`);

  return newConv.id;
}

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
