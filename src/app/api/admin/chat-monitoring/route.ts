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
  const severity = searchParams.get("severity") || "all";
  const userId = searchParams.get("user_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const supabase = getSupabaseAdmin();

  if (tab === "alerts") {
    let query = supabase
      .from("chat_alerts")
      .select(`
        *,
        conversation:chat_conversations(id, user_a_id, user_b_id, status, last_message_at),
        reported_user:profiles!chat_alerts_reported_user_id_fkey(id, name, email, avatar_url, status)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") query = query.eq("status", status);
    if (severity !== "all") query = query.eq("severity", severity);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Stats
    const { count: openCount } = await supabase
      .from("chat_alerts").select("*", { count: "exact", head: true }).eq("status", "open");
    const { count: criticalCount } = await supabase
      .from("chat_alerts").select("*", { count: "exact", head: true }).eq("severity", "critical");

    return NextResponse.json({
      alerts: data || [],
      total: count || 0,
      stats: { open: openCount || 0, critical: criticalCount || 0 },
      page,
      limit,
    });
  }

  // Conversations tab
  let query = supabase
    .from("chat_conversations")
    .select(`
      *,
      user_a:profiles!chat_conversations_user_a_id_fkey(id, name, email, avatar_url, status, subscription_plan),
      user_b:profiles!chat_conversations_user_b_id_fkey(id, name, email, avatar_url, status, subscription_plan)
    `, { count: "exact" })
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status !== "all") query = query.eq("status", status);
  if (userId) query = query.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Stats
  const { count: activeCount } = await supabase
    .from("chat_conversations").select("*", { count: "exact", head: true }).eq("status", "active");
  const { count: restrictedCount } = await supabase
    .from("chat_conversations").select("*", { count: "exact", head: true }).in("status", ["restricted", "blocked"]);

  return NextResponse.json({
    conversations: data || [],
    total: count || 0,
    stats: { active: activeCount || 0, restricted: restrictedCount || 0 },
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
  const { type, id, status, admin_notes, restricted_reason } = body;
  if (!id || !type) return NextResponse.json({ error: "Type et ID requis" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  if (type === "conversation") {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) {
      update.status = status;
      if (status === "restricted" || status === "blocked") {
        update.restricted_reason = restricted_reason || null;
        update.restricted_at = new Date().toISOString();
      }
    }
    const { data, error } = await supabase
      .from("chat_conversations").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ conversation: data });
  }

  if (type === "alert") {
    const update: Record<string, unknown> = {};
    if (status) {
      update.status = status;
      if (status === "resolved") update.resolved_at = new Date().toISOString();
    }
    if (admin_notes !== undefined) update.admin_notes = admin_notes;
    const { data, error } = await supabase
      .from("chat_alerts").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ alert: data });
  }

  if (type === "message") {
    const update: Record<string, unknown> = {};
    if (status === "flagged") {
      update.is_flagged = true;
      update.flag_reason = admin_notes || "Flagged by admin";
    } else if (status === "unflagged") {
      update.is_flagged = false;
      update.flag_reason = null;
    } else if (status === "deleted") {
      update.is_deleted = true;
    }
    const { data, error } = await supabase
      .from("chat_messages").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
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
  const { action_type, target_user_id, conversation_id, reason, details, expires_at } = body;
  if (!action_type || !target_user_id || !reason) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("moderation_actions")
    .insert({
      admin_id: admin.adminId === "env-admin" ? null : admin.adminId,
      target_user_id,
      conversation_id: conversation_id || null,
      action_type,
      reason,
      details: details || null,
      expires_at: expires_at || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: data }, { status: 201 });
}