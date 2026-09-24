/**
 * GET /api/admin/messages/inbox
 *
 * Toutes les conversations du compte « Admin » (reçues ou démarrées par
 * l'admin), avec le membre, le dernier message et le nombre de non-lus.
 * Interrogée régulièrement par la messagerie admin (pas de temps réel côté admin).
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminAccountId } from "@/lib/admin-system-user";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const adminId = await getAdminAccountId(supabase);

    const { data: adminMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", adminId);

    const convIds = (adminMemberships || []).map((m) => m.conversation_id);
    if (convIds.length === 0) return NextResponse.json({ threads: [], admin_id: adminId });

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
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, name, pseudo, email, avatar_url, status").in("id", userIds)
      : { data: [] as { id: string; name: string | null; pseudo: string | null; email: string | null; avatar_url: string | null; status: string | null }[] };
    const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const { data: messages } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, content, image_url, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const threads = convIds
      .map((convId) => {
        const userId = userIdByConv[convId];
        const profile = userId ? profileById[userId] : null;
        if (!profile) return null; // membre supprimé — on ignore

        const convMessages = (messages || []).filter((m) => m.conversation_id === convId);
        const lastMessage = convMessages[0] || null;
        const lastReadAt = lastReadByConv[convId];
        const unreadCount = convMessages.filter(
          (m) => m.sender_id !== adminId && (!lastReadAt || new Date(m.created_at) > new Date(lastReadAt))
        ).length;

        return {
          conversation_id: convId,
          user: {
            id: profile.id,
            name: profile.name || profile.pseudo || "Membre",
            pseudo: profile.pseudo,
            email: profile.email,
            avatar_url: profile.avatar_url,
            status: profile.status,
          },
          last_message: lastMessage
            ? {
                content: lastMessage.content,
                has_image: !!lastMessage.image_url,
                created_at: lastMessage.created_at,
                from_admin: lastMessage.sender_id === adminId,
              }
            : null,
          unread_count: unreadCount,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => (b.last_message?.created_at || "").localeCompare(a.last_message?.created_at || ""));

    return NextResponse.json({ threads, admin_id: adminId });
  } catch (err) {
    console.error("[Admin Messages Inbox] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
