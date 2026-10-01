import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { sendAccountSuspendedEmail } from "@/lib/email";
import { getAdminAccountId, getOrCreateAdminConversation } from "@/lib/admin-system-user";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "conversations";
  const status = searchParams.get("status") || "all";
  const userId = searchParams.get("user_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();

  if (tab === "alerts") {
    // Alerts from the chat_alerts table if it exists
    let query = supabase
      .from("chat_alerts")
      .select(``, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      // Table might not exist yet, return empty
      return NextResponse.json({
        alerts: [],
        total: 0,
        stats: { open: 0, critical: 0 },
        page,
        limit,
      });
    }

    return NextResponse.json({
      alerts: data || [],
      total: count || 0,
      stats: { open: 0, critical: 0 },
      page,
      limit,
    });
  }

  // ── Conversations tab: query the REAL tables ──
  // Step 1: Get all conversations with their members
  const buildConvQuery = (withModeration: boolean) =>
    supabase
      .from("conversations")
      .select(
        withModeration
          ? "id, is_direct, created_at, status, restricted_reason, restricted_at, conversation_members(user_id, last_read_at)"
          : "id, is_direct, created_at, conversation_members(user_id, last_read_at)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

  let userConvIds: string[] | null = null;

  // If filtering by user, get only their conversation IDs first
  if (userId) {
    const { data: userMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

    userConvIds = userMemberships?.map(m => m.conversation_id) || [];
    if (userConvIds.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        stats: { active: 0, restricted: 0 },
        page,
        limit,
      });
    }
  }

  // Sans la migration 20261001_chat_moderation.sql, les colonnes de statut
  // n'existent pas encore : on lit alors les conversations sans elles.
  type ConvRow = {
    id: string; created_at: string;
    status?: string; restricted_reason?: string | null; restricted_at?: string | null;
    conversation_members: { user_id: string; last_read_at: string }[] | null;
  };
  let convResult = await (userConvIds ? buildConvQuery(true).in("id", userConvIds) : buildConvQuery(true));
  if (convResult.error && isMissingColumn(convResult.error)) {
    convResult = await (userConvIds ? buildConvQuery(false).in("id", userConvIds) : buildConvQuery(false));
  }
  const { error: convError } = convResult;
  const allConvs = convResult.data as unknown as ConvRow[] | null;
  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

  if (!allConvs || allConvs.length === 0) {
    return NextResponse.json({
      conversations: [],
      total: 0,
      stats: { active: 0, restricted: 0 },
      page,
      limit,
    });
  }

  // Step 2: For each conversation, get last message and message count
  const convIds = allConvs.map(c => c.id);

  // Get message counts per conversation
  const { data: messageCounts } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", convIds);

  const countMap: Record<string, number> = {};
  const convLastMsgMap: Record<string, string | null> = {};

  // Get last message per conversation
  for (const convId of convIds) {
    const convMsgs = messageCounts?.filter(m => m.conversation_id === convId) || [];
    countMap[convId] = convMsgs.length;
  }

  // Get last messages efficiently
  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  for (const msg of lastMessages || []) {
    if (!convLastMsgMap[msg.conversation_id]) {
      convLastMsgMap[msg.conversation_id] = msg.created_at;
    }
  }

  // Step 3: Get all unique user IDs from members
  const allUserIds = new Set<string>();
  for (const conv of allConvs) {
    for (const member of (conv.conversation_members as { user_id: string }[]) || []) {
      allUserIds.add(member.user_id);
    }
  }

  // Fetch user profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, pseudo, email, avatar_url, status")
    .in("id", Array.from(allUserIds));

  const profileMap: Record<string, {
    id: string; name: string; pseudo: string | null; email: string;
    avatar_url: string | null; status: string;
    subscription_plan: string;
  }> = {};
  for (const p of profiles || []) {
    profileMap[p.id] = {
      id: p.id,
      name: p.name || "Utilisateur",
      pseudo: p.pseudo || null,
      email: p.email || "",
      avatar_url: p.avatar_url || null,
      status: p.status || "approved",
      subscription_plan: "free",
    };
  }

  // Step 4: Build enriched conversation objects
  const enriched = allConvs.map(conv => {
    const members = conv.conversation_members || [];
    const userA = members[0] ? profileMap[members[0].user_id] || null : null;
    const userB = members[1] ? profileMap[members[1].user_id] || null : null;
    const lastMsg = convLastMsgMap[conv.id] || null;
    const msgCount = countMap[conv.id] || 0;

    return {
      id: conv.id,
      user_a_id: members[0]?.user_id || null,
      user_b_id: members[1]?.user_id || null,
      match_id: null,
      status: conv.status || "active",
      restricted_reason: conv.restricted_reason ?? null,
      restricted_at: conv.restricted_at ?? null,
      last_message_at: lastMsg,
      message_count: msgCount,
      created_at: conv.created_at,
      user_a: userA || { id: members[0]?.user_id || "", name: "Inconnu", email: "", avatar_url: null, status: "unknown", subscription_plan: "free" },
      user_b: userB || { id: members[1]?.user_id || "", name: "Inconnu", email: "", avatar_url: null, status: "unknown", subscription_plan: "free" },
    };
  });

  const filtered = status === "all" ? enriched : enriched.filter(c => c.status === status);
  const stats = {
    active: enriched.filter(c => c.status === "active").length,
    restricted: enriched.filter(c => c.status === "restricted" || c.status === "blocked").length,
  };

  // Sort by last message time (most recent first)
  filtered.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  // Paginate
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    conversations: paginated,
    total: filtered.length,
    stats,
    page,
    limit,
  });
}

const MIGRATION_MISSING =
  "La base n'est pas à jour : exécutez supabase/migrations/20261001_chat_moderation.sql dans Supabase (SQL Editor).";

/** Colonne ou table absente : la migration de modération n'a pas été exécutée. */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || error.code === "PGRST204" || error.code === "42P01" ||
    /column .* does not exist|could not find the .* column/i.test(error.message || "");
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
type Admin = Awaited<ReturnType<typeof requireAdmin>>;

/** Journal de modération (non bloquant : l'action elle-même a déjà réussi). */
async function logModeration(
  supabase: SupabaseAdmin,
  admin: Admin,
  rows: { target_user_id: string; conversation_id?: string | null; action_type: string; reason: string; details?: Record<string, unknown> }[]
) {
  if (rows.length === 0) return;
  const adminId = admin.adminId === "env-admin" ? null : admin.adminId;
  const { error } = await supabase.from("moderation_actions").insert(
    rows.map((r) => ({ ...r, admin_id: adminId, admin_email: admin.email, conversation_id: r.conversation_id ?? null, details: r.details ?? null }))
  );
  if (error) console.warn("[Chat moderation] journal non enregistré:", error.message);
}

async function conversationMemberIds(supabase: SupabaseAdmin, conversationId: string): Promise<string[]> {
  const { data } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId);
  return (data || []).map((m) => m.user_id);
}

/** Restreindre (lecture seule), bloquer, ou réactiver une conversation. */
async function setConversationStatus(
  supabase: SupabaseAdmin,
  conversationId: string,
  status: "active" | "restricted" | "blocked",
  reason?: string | null
) {
  return supabase
    .from("conversations")
    .update({
      status,
      restricted_reason: status === "active" ? null : reason || null,
      restricted_at: status === "active" ? null : new Date().toISOString(),
    })
    .eq("id", conversationId)
    .select("id, status, restricted_reason, restricted_at")
    .single();
}

export async function PATCH(req: NextRequest) {
  let admin: Admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { type, id, status: newStatus, admin_notes, restricted_reason } = body;
  if (!id || !type) return NextResponse.json({ error: "Type et ID requis" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  if (type === "message") {
    const { data: original } = await supabase
      .from("messages").select("id, conversation_id, sender_id, content, image_url").eq("id", id).maybeSingle();
    if (!original) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (newStatus === "flagged") {
      update.is_flagged = true;
      update.flag_reason = admin_notes || "Signalé par un administrateur";
    } else if (newStatus === "unflagged") {
      update.is_flagged = false;
      update.flag_reason = null;
    } else if (newStatus === "deleted") {
      // Le contenu est effacé pour les membres ; l'original reste dans le journal.
      update.is_deleted = true;
      update.content = "";
      update.image_url = null;
    } else {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("messages").update(update).eq("id", id).select().single();
    if (error) {
      if (isMissingColumn(error)) return NextResponse.json({ error: MIGRATION_MISSING }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await logModeration(supabase, admin, [{
      target_user_id: original.sender_id,
      conversation_id: original.conversation_id,
      action_type: newStatus === "flagged" ? "message_flag" : newStatus === "unflagged" ? "message_unflag" : "message_delete",
      reason: admin_notes || (newStatus === "deleted" ? "Message supprimé par un administrateur" : "Signalement admin"),
      details: newStatus === "deleted" ? { message_id: id, content: original.content, image_url: original.image_url } : { message_id: id },
    }]);
    return NextResponse.json({ message: data });
  }

  if (type === "conversation") {
    if (!["active", "restricted", "blocked"].includes(newStatus)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const { data, error } = await setConversationStatus(supabase, id, newStatus, restricted_reason);
    if (error) {
      if (isMissingColumn(error)) return NextResponse.json({ error: MIGRATION_MISSING }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const members = await conversationMemberIds(supabase, id);
    const actionType = newStatus === "restricted" ? "restrict" : newStatus === "blocked" ? "block" : "reactivate";
    const reason = restricted_reason || (newStatus === "restricted"
      ? "Conversation restreinte (lecture seule)"
      : newStatus === "blocked" ? "Conversation bloquée" : "Conversation réactivée");
    await logModeration(supabase, admin, members.map((uid) => ({
      target_user_id: uid, conversation_id: id, action_type: actionType, reason,
    })));
    try {
      await logAdminAction(admin.adminId, admin.email, `conversation_${actionType}`, "system", id, { reason, members });
    } catch { /* non bloquant */ }
    return NextResponse.json({ conversation: data });
  }

  if (type === "alert") {
    const { data, error } = await supabase
      .from("chat_alerts")
      .update({
        status: newStatus,
        admin_notes: admin_notes ?? null,
        resolved_at: newStatus === "resolved" || newStatus === "dismissed" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ alert: data });
  }

  return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}

/**
 * Bouton « Modérer » : applique une sanction à l'un des deux membres.
 *  - warning            → message de l'équipe envoyé au membre (compte « Admin »)
 *  - restrict / block   → la conversation passe en lecture seule / est fermée
 *  - account_suspension → compte suspendu + email (comme Admin → Utilisateurs)
 *  - note               → simple note interne
 * Chaque action est journalisée dans moderation_actions.
 */
export async function POST(req: NextRequest) {
  let admin: Admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { action_type, target_user_id, conversation_id } = body;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!action_type || !target_user_id || !reason) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: target } = await supabase
    .from("profiles").select("id, name, email, status").eq("id", target_user_id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  let message = "";

  switch (action_type) {
    case "warning": {
      try {
        const adminUserId = await getAdminAccountId(supabase);
        const convId = await getOrCreateAdminConversation(supabase, adminUserId, target_user_id);
        const { error } = await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: adminUserId,
          content: `⚠️ Avertissement de l'équipe Garden of Alliance\n\n${reason}\n\nMerci de veiller à garder des échanges respectueux. En cas de récidive, votre compte pourra être suspendu.`,
        });
        if (error) throw new Error(error.message);
      } catch (err) {
        console.error("[Chat moderation] avertissement non envoyé:", err);
        return NextResponse.json({ error: "L'avertissement n'a pas pu être envoyé." }, { status: 500 });
      }
      message = `Avertissement envoyé à ${target.name || "ce membre"} dans sa messagerie.`;
      break;
    }
    case "restrict":
    case "block": {
      if (!conversation_id) return NextResponse.json({ error: "Conversation requise" }, { status: 400 });
      const { error } = await setConversationStatus(supabase, conversation_id, action_type === "restrict" ? "restricted" : "blocked", reason);
      if (error) {
        if (isMissingColumn(error)) return NextResponse.json({ error: MIGRATION_MISSING }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      message = action_type === "restrict"
        ? "Conversation restreinte : plus aucun message ne peut y être envoyé."
        : "Conversation bloquée.";
      break;
    }
    case "account_suspension": {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "suspended",
          reviewed_by: admin.adminId === "env-admin" ? null : admin.adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", target_user_id);
      if (error) return NextResponse.json({ error: "Erreur lors de la suspension." }, { status: 500 });
      const emailSent = target.email ? await sendAccountSuspendedEmail(target.email, target.name || "Membre", reason) : false;
      try {
        await logAdminAction(admin.adminId, admin.email, "user_suspended", "user", target_user_id, {
          user_email: target.email, user_name: target.name, reason, source: "chat_monitoring", conversation_id,
        });
      } catch { /* non bloquant */ }
      message = `Compte de ${target.name || "ce membre"} suspendu${emailSent ? " (email envoyé)" : ""}.`;
      break;
    }
    case "note":
      message = "Note enregistrée.";
      break;
    default:
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  await logModeration(supabase, admin, [{ target_user_id, conversation_id, action_type, reason }]);

  return NextResponse.json({ success: true, message }, { status: 201 });
}