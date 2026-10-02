import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// Notifications du membre connecté uniquement : l'identifiant vient de la
// session, plus d'un paramètre user_id (qui permettait de lire celles d'un autre).

// GET — Get blog notifications for the signed-in user
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const userId = user.id;

    const { data, error } = await supabase
      .from("meeting_notifications")
      .select("id, blog_post_id, notification_type, title, message, thumbnail_url, link, is_read, created_at")
      .eq("user_id", userId).eq("notification_type", "blog_post")
      .order("created_at", { ascending: false }).limit(50);

    if (error) throw error;
    return NextResponse.json({ notifications: data || [] });
  } catch (err: unknown) {
    console.error("[blog/notifications]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH — Mark blog notification(s) as read
export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { notification_ids, mark_all } = body;

    if (mark_all) {
      const { error } = await supabase.from("meeting_notifications")
        .update({ is_read: true }).eq("user_id", user.id).eq("notification_type", "blog_post").eq("is_read", false);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      const { error } = await supabase.from("meeting_notifications").update({ is_read: true })
        .in("id", notification_ids.filter((id: unknown) => typeof id === "string").slice(0, 200)).eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "notification_ids ou mark_all requis" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[blog/notifications]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
