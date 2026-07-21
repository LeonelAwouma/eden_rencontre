import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET — Get meeting notifications for a specific user
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("meeting_notifications")
      .select("id, meeting_id, notification_type, title, message, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ notifications: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Meeting Notifications GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — Mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { notification_ids, mark_all, user_id } = body;

    if (mark_all && user_id) {
      const { error } = await supabase
        .from("meeting_notifications")
        .update({ is_read: true })
        .eq("user_id", user_id)
        .eq("is_read", false);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      const { error } = await supabase
        .from("meeting_notifications")
        .update({ is_read: true })
        .in("id", notification_ids);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "notification_ids ou mark_all requis" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Meeting Notifications PATCH]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}