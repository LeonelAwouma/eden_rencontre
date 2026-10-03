// ============================================================================
//  Garden of Alliance — Shared "Admin" system account
//  A real profiles/auth.users row that represents the platform's admin team
//  inside the normal conversations/messages tables, so support messages reuse
//  the existing chat infrastructure instead of a parallel one.
//  Used by: POST /api/admin/messages/send (admin → user) and
//  GET /api/support/admin-id (user → admin, see contactAdmin() in chat.ts).
// ============================================================================

import crypto from "crypto";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
export const ADMIN_PROFILE_NAME = "Admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

// L'id ne change jamais : on le garde en mémoire (la messagerie admin interroge
// le serveur toutes les quelques secondes).
let cachedAdminId: string | null = null;

/** Ensures the admin system auth user exists in Supabase Auth. Idempotent. */
export async function ensureAdminSystemUser(supabase: SupabaseAdminClient): Promise<string> {
  if (cachedAdminId) return cachedAdminId;

  // Chemin rapide : le profil (créé automatiquement avec le compte) porte l'email.
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", ADMIN_SYSTEM_EMAIL).maybeSingle();
  if (profile?.id) return (cachedAdminId = profile.id);

  const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = existingUsers?.users?.find((u) => u.email === ADMIN_SYSTEM_EMAIL);
  if (existing) return (cachedAdminId = existing.id);

  // Personne ne se connecte à ce compte : il n'agit que via la clé de service.
  // Mot de passe aléatoire jamais conservé (l'ancien, écrit en dur dans le dépôt,
  // est remplacé par supabase/migrations/20261003_security_hardening.sql).
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: ADMIN_SYSTEM_EMAIL,
    password: crypto.randomBytes(48).toString("base64url"),
    email_confirm: true,
    user_metadata: { name: ADMIN_PROFILE_NAME, is_system_admin: true },
  });
  if (error || !newUser?.user) throw new Error(`Failed to create admin system user: ${error?.message || "unknown"}`);
  return (cachedAdminId = newUser.user.id);
}

/**
 * Ensures the admin system user has an approved profile named "Admin". Idempotent.
 * Le statut « approved » est indispensable : la RLS (20260924_member_approval_rls.sql)
 * interdit d'écrire à un compte non approuvé, et le profil créé automatiquement à
 * l'inscription démarre en « pending ».
 */
export async function ensureAdminProfile(supabase: SupabaseAdminClient, adminUserId: string): Promise<void> {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", adminUserId).single();
  if (existing) {
    await supabase.from("profiles").update({ name: ADMIN_PROFILE_NAME, status: "approved" }).eq("id", adminUserId);
    return;
  }
  await supabase.from("profiles").insert({ id: adminUserId, email: ADMIN_SYSTEM_EMAIL, name: ADMIN_PROFILE_NAME, status: "approved" });
}

/**
 * Alliance acceptée admin ↔ membre. La RLS n'autorise un membre à écrire dans
 * une conversation qu'avec un ami (are_friends) : sans cette ligne, un membre
 * contacté en premier par l'admin ne pourrait pas lui répondre.
 */
async function ensureAdminFriendship(supabase: SupabaseAdminClient, adminUserId: string, targetUserId: string) {
  const { data: rows } = await supabase
    .from("friendships")
    .select("id, status")
    .or(`and(requester_id.eq.${adminUserId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${adminUserId})`);
  if ((rows || []).some((r) => r.status === "accepted")) return;
  if (rows && rows.length) {
    await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).in("id", rows.map((r) => r.id));
    return;
  }
  await supabase.from("friendships").insert({ requester_id: adminUserId, addressee_id: targetUserId, status: "accepted" });
}

/** Conversation existante entre l'admin et un membre, ou null. */
export async function findAdminConversation(
  supabase: SupabaseAdminClient,
  adminUserId: string,
  targetUserId: string
): Promise<string | null> {
  const { data: adminMembers } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", adminUserId);
  const adminConvIds = (adminMembers || []).map((m) => m.conversation_id);
  if (adminConvIds.length === 0) return null;
  const { data: targetMember } = await supabase
    .from("conversation_members").select("conversation_id")
    .eq("user_id", targetUserId).in("conversation_id", adminConvIds).limit(1).maybeSingle();
  return targetMember?.conversation_id ?? null;
}

/** Finds or creates a direct conversation between the admin system user and a target user. */
export async function getOrCreateAdminConversation(
  supabase: SupabaseAdminClient,
  adminUserId: string,
  targetUserId: string
): Promise<string> {
  await ensureAdminFriendship(supabase, adminUserId, targetUserId);
  const existing = await findAdminConversation(supabase, adminUserId, targetUserId);
  if (existing) return existing;

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

let profileEnsured = false;

/**
 * Point d'entrée des routes de messagerie : id du compte « Admin », avec un
 * profil garanti approuvé (vérifié une fois par démarrage du serveur).
 */
export async function getAdminAccountId(supabase: SupabaseAdminClient): Promise<string> {
  const adminId = await ensureAdminSystemUser(supabase);
  if (!profileEnsured) {
    await ensureAdminProfile(supabase, adminId);
    profileEnsured = true;
  }
  return adminId;
}
