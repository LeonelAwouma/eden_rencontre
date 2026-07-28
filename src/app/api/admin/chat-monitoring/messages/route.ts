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
  const conversationId = searchParams.get("conversation_id");
  const since = searchParams.get("since"); // ISO timestamp for polling new messages
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id requis" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("chat_messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      message_type,
      is_flagged,
      flag_reason,
      is_deleted,
      created_at,
      sender:profiles!chat_messages_sender_id_fkey(id, name, email, avatar_url)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch conversation details for the header
  const { data: conversation, error: convError } = await supabase
    .from("chat_conversations")
    .select(`
      *,
      user_a:profiles!chat_conversations_user_a_id_fkey(id, name, email, avatar_url, status, subscription_plan),
      user_b:profiles!chat_conversations_user_b_id_fkey(id, name, email, avatar_url, status, subscription_plan)
    `)
    .eq("id", conversationId)
    .single();

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

  return NextResponse.json({
    messages: data || [],
    conversation,
    total: data?.length || 0,
  });
}