// ============================================================================
//  GARDEN OF ALLIANCE — Shared "Admin" system account
//  A real profiles/auth.users row that represents the platform's admin team
//  inside the normal conversations/messages tables, so support messages reuse
//  the existing chat infrastructure instead of a parallel one.
//  Used by: POST /api/admin/messages/send (admin → user) and
//  GET /api/support/admin-id (user → admin, see contactAdmin() in chat.ts).
// ============================================================================

import type { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_SYSTEM_EMAIL = "admin-system@eden.local";
const ADMIN_SYSTEM_PASSWORD = "Eden-Admin-System-2024!SecureRandom";
export const ADMIN_PROFILE_NAME = "Admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

/** Ensures the admin system auth user exists in Supabase Auth. Idempotent. */
export async function ensureAdminSystemUser(supabase: SupabaseAdminClient): Promise<string> {
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

/** Ensures the admin system user has a profile named "Admin". Idempotent. */
export async function ensureAdminProfile(supabase: SupabaseAdminClient, adminUserId: string): Promise<void> {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", adminUserId).single();
  if (existing) {
    await supabase.from("profiles").update({ name: ADMIN_PROFILE_NAME }).eq("id", adminUserId);
    return;
  }
  await supabase.from("profiles").insert({ id: adminUserId, email: ADMIN_SYSTEM_EMAIL, name: ADMIN_PROFILE_NAME, status: "approved" });
}

/** Finds or creates a direct conversation between the admin system user and a target user. */
export async function getOrCreateAdminConversation(
  supabase: SupabaseAdminClient,
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
