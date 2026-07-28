import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminSession } from "@/lib/admin-auth";

async function verifyAdmin() {
  const session = await getAdminSession();
  return session;
}

// GET — Fetch notifications (with optional unread filter)
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = parseInt(searchParams.get("limit") || "20");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("admin_notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  return NextResponse.json({
    notifications: data || [],
    total: count || 0,
    unread_count: unreadCount || 0,
  });
}

// PATCH — Mark notifications as read
export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { id, mark_all_read } = body;

  const supabase = getSupabaseAdmin();

  if (mark_all_read) {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all as read:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Toutes marquées comme lues" });
  }

  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error marking as read:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification: data });
}