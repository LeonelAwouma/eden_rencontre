/**
 * GET /api/admin/messages/inbox
 *
 * Lists conversations where a user has messaged the Admin system account —
 * i.e. the actual "received" side of the admin messaging feature (the
 * existing /api/admin/messages/send only covers admin → user).
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ensureAdminSystemUser } from "@/lib/admin-system-user";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const adminId = await ensureAdminSystemUser(supabase);

    const { data: adminMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", adminId);

    const convIds = (adminMemberships || []).map((m) => m.conversation_id);
    if (convIds.length === 0) return NextResponse.json({ threads: [] });

    const lastReadByConv: Record<string, string> = {};
    (adminMemberships || []).forEach((m) => (lastReadByConv[m.conversation_id] = m.last_read_at || ""));

    const { data: others } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", adminId);

    const userIdByConv: Record<string, string> = {};
    (others || []).forEach((o) => (userIdByConv[o.conversation_id] = o.user_id));

    const userIds = Array.from(new Set(Object.values(userIdByConv)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileById: Record<string, { id: string; name: string; email: string; avatar_url: string | null }> = {};
    (profiles || []).forEach((p) => (profileById[p.id] = p));

    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const threads = convIds
      .map((convId) => {
        const userId = userIdByConv[convId];
        const profile = userId ? profileById[userId] : null;
        if (!profile) return null; // orphaned member row — skip

        const convMessages = (messages || []).filter((m) => m.conversation_id === convId);
        const lastMessage = convMessages[0] || null;
        const lastReadAt = lastReadByConv[convId];
        const unreadCount = convMessages.filter(
          (m) => m.sender_id !== adminId && (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt))
        ).length;

        return {
          conversation_id: convId,
          user: profile,
          last_message: lastMessage ? { content: lastMessage.content, created_at: lastMessage.created_at, from_admin: lastMessage.sender_id === adminId } : null,
          unread_count: unreadCount,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => {
        const at = a.last_message?.created_at || "";
        const bt = b.last_message?.created_at || "";
        return bt.localeCompare(at);
      });

    return NextResponse.json({ threads });
  } catch (err) {
    console.error("[Admin Messages Inbox] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
