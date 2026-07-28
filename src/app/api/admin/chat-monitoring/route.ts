import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

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
  let convQuery = supabase
    .from("conversations")
    .select(`
      id,
      is_direct,
      created_at,
      conversation_members(user_id, last_read_at)
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  // If filtering by user, get only their conversation IDs first
  if (userId) {
    const { data: userMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

    const userConvIds = userMemberships?.map(m => m.conversation_id) || [];
    if (userConvIds.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        stats: { active: 0, restricted: 0 },
        page,
        limit,
      });
    }
    convQuery = convQuery.in("id", userConvIds);
  }

  const { data: allConvs, error: convError, count: totalConvs } = await convQuery;
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
    .select("id, name, email, avatar_url, status")
    .in("id", Array.from(allUserIds));

  const profileMap: Record<string, {
    id: string; name: string; email: string;
    avatar_url: string | null; status: string;
    subscription_plan: string;
  }> = {};
  for (const p of profiles || []) {
    profileMap[p.id] = {
      id: p.id,
      name: p.name || "Utilisateur",
      email: p.email || "",
      avatar_url: p.avatar_url || null,
      status: p.status || "approved",
      subscription_plan: "free",
    };
  }

  // Step 4: Build enriched conversation objects
  const enriched = allConvs.map(conv => {
    const members = (conv.conversation_members as { user_id: string; last_read_at: string }[]) || [];
    const userA = members[0] ? profileMap[members[0].user_id] || null : null;
    const userB = members[1] ? profileMap[members[1].user_id] || null : null;
    const lastMsg = convLastMsgMap[conv.id] || null;
    const msgCount = countMap[conv.id] || 0;

    return {
      id: conv.id,
      user_a_id: members[0]?.user_id || null,
      user_b_id: members[1]?.user_id || null,
      match_id: null,
      status: "active",
      restricted_reason: null,
      restricted_at: null,
      last_message_at: lastMsg,
      message_count: msgCount,
      created_at: conv.created_at,
      user_a: userA || { id: members[0]?.user_id || "", name: "Inconnu", email: "", avatar_url: null, status: "unknown", subscription_plan: "free" },
      user_b: userB || { id: members[1]?.user_id || "", name: "Inconnu", email: "", avatar_url: null, status: "unknown", subscription_plan: "free" },
    };
  });

  // Filter by status if needed (since we derive status as "active")
  const filtered = status === "all" || status === "active"
    ? enriched
    : status === "restricted" || status === "blocked" || status === "archived"
    ? [] // No restricted/blocked conversations in current schema
    : enriched;

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
    stats: { active: filtered.length, restricted: 0 },
    page,
    limit,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { type, id, status: newStatus, admin_notes } = body;
  if (!id || !type) return NextResponse.json({ error: "Type et ID requis" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Try to handle chat_messages if that table exists (for flagging)
  if (type === "message") {
    const update: Record<string, unknown> = {};
    if (newStatus === "flagged") {
      update.is_flagged = true;
      update.flag_reason = admin_notes || "Flagged by admin";
    } else if (newStatus === "unflagged") {
      update.is_flagged = false;
      update.flag_reason = null;
    } else if (newStatus === "deleted") {
      update.is_deleted = true;
    }
    const { data, error } = await supabase
      .from("messages").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  }

  if (type === "conversation") {
    return NextResponse.json({ conversation: { id, status: newStatus } });
  }

  if (type === "alert") {
    return NextResponse.json({ alert: { id, status: newStatus } });
  }

  return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { action_type, target_user_id, conversation_id, reason } = body;
  if (!action_type || !target_user_id || !reason) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  // Try to insert moderation action if table exists
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("moderation_actions").insert({
      admin_id: admin.adminId === "env-admin" ? null : admin.adminId,
      target_user_id,
      conversation_id: conversation_id || null,
      action_type,
      reason,
    });
  } catch {
    // Table might not exist
  }

  return NextResponse.json({ success: true }, { status: 201 });
}