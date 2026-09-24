import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET — Get meeting notifications for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("meeting_notifications")
      .select("id, meeting_id, notification_type, title, message, link, is_read, created_at")
      .eq("user_id", authUser.id)
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
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { notification_ids, mark_all } = body;

    if (mark_all) {
      const { error } = await supabase
        .from("meeting_notifications")
        .update({ is_read: true })
        .eq("user_id", authUser.id)
        .eq("is_read", false);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      // Restreint à ses propres notifications : sans ce eq(user_id),
      // on pourrait marquer lues celles de n'importe qui.
      const { error } = await supabase
        .from("meeting_notifications")
        .update({ is_read: true })
        .eq("user_id", authUser.id)
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