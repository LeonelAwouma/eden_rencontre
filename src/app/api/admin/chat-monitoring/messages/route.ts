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

  // Query the REAL messages table
  let query = supabase
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      image_url,
      created_at
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (since) {
    query = query.gt("created_at", since);
  }

  const { data: messages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get unique sender IDs and fetch their profiles
  const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
  const { data: senders } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .in("id", senderIds);

  const senderMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }> = {};
  for (const s of senders || []) {
    senderMap[s.id] = {
      id: s.id,
      name: s.name || "Utilisateur",
      email: s.email || "",
      avatar_url: s.avatar_url || null,
    };
  }

  // Enrich messages with sender info
  const enriched = (messages || []).map(msg => ({
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    content: msg.content || "",
    image_url: msg.image_url || null,
    message_type: msg.image_url ? "image" : "text",
    is_flagged: false,
    flag_reason: null,
    is_deleted: false,
    created_at: msg.created_at,
    sender: senderMap[msg.sender_id] || {
      id: msg.sender_id,
      name: "Utilisateur",
      email: "",
      avatar_url: null,
    },
  }));

  // Fetch conversation details (members)
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, last_read_at")
    .eq("conversation_id", conversationId);

  const memberIds = (members || []).map(m => m.user_id);
  const { data: memberProfiles } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url, status, subscription_plan")
    .in("id", memberIds);

  const conversation = {
    id: conversationId,
    user_a_id: memberIds[0] || null,
    user_b_id: memberIds[1] || null,
    status: "active",
    user_a: memberProfiles?.[0] ? {
      id: memberProfiles[0].id,
      name: memberProfiles[0].name || "Utilisateur",
      email: memberProfiles[0].email || "",
      avatar_url: memberProfiles[0].avatar_url || null,
      status: (memberProfiles[0] as Record<string, unknown>).status as string || "approved",
      subscription_plan: (memberProfiles[0] as Record<string, unknown>).subscription_plan as string || "free",
    } : { id: memberIds[0] || "", name: "Inconnu", email: "", avatar_url: null, status: "unknown", subscription_plan: "free" },
    user_b: memberProfiles?.[1] ? {
      id: memberProfiles[1].id,
      name: memberProfiles[1].name || "Utilisateur",
      email: memberProfiles[1].email || "",
      avatar_url: memberProfiles[1].avatar_url || null,
      status: (memberProfiles[1] as Record<string, unknown>).status as string || "approved",
      subscription_plan: (memberProfiles[1] as Record<string, unknown>).subscription_plan as string || "free",
    } : { id: memberIds[1] || "", name: "Inconnu", email: "", avatar_url: null, status: "unknown", subscription_plan: "free" },
  };

  return NextResponse.json({
    messages: enriched,
    conversation,
    total: enriched.length,
  });
}