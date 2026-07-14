import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createGoogleMeetEvent } from "@/lib/google-calendar";
import { requireAdmin } from "@/lib/admin-auth";

// GET — List all meetings with optional filters
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("meetings")
      .select(`
        *,
        user_one:profiles!meetings_user_one_id_fkey(id, name, email, avatar_url, city),
        user_two:profiles!meetings_user_two_id_fkey(id, name, email, avatar_url, city),
        admin:admin_users!meetings_admin_id_fkey(id, name, email)
      `)
      .order("start_time", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Also get stats
    const { data: stats } = await supabase.rpc("get_meeting_stats");

    return NextResponse.json({
      meetings: data || [],
      stats: stats?.[0] || {
        total_meetings: 0,
        scheduled_meetings: 0,
        completed_meetings: 0,
        cancelled_meetings: 0,
        upcoming_meetings: 0,
      },
    });
  } catch (err: any) {
    console.error("[Admin Meetings GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST — Create a new meeting
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const {
      title,
      description,
      user_one_id,
      user_two_id,
      admin_id,
      start_time,
      duration_minutes = 60,
    } = body;

    // Get current admin session
    const admin = await requireAdmin().catch(() => null);
    const effectiveAdminId = admin?.adminId === "env-admin" ? null : (admin_id || admin?.adminId || null);

    // Validate required fields
    if (!title || !user_one_id || !user_two_id || !start_time) {
      return NextResponse.json(
        { error: "Champs requis: title, user_one_id, user_two_id, start_time" },
        { status: 400 }
      );
    }

    // Calculate end_time
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

    // Fetch participant emails for Google Calendar
    const { data: userOne } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", user_one_id)
      .maybeSingle();

    const { data: userTwo } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", user_two_id)
      .maybeSingle();

    if (!userOne?.email || !userTwo?.email) {
      return NextResponse.json(
        { error: "Impossible de récupérer les emails des participants" },
        { status: 400 }
      );
    }

    // Create Google Calendar event with Meet link
    const googleResult = await createGoogleMeetEvent({
      title,
      description: description || "",
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      attendeeEmails: [userOne.email, userTwo.email],
      organizerEmail: "", // Will be fetched from settings
    });

    // Insert meeting into database
    const { data: meeting, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title,
        description: description || null,
        user_one_id,
        user_two_id,
        admin_id: effectiveAdminId,
        google_event_id: googleResult.eventId || null,
        google_meet_url: googleResult.meetUrl || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_minutes,
        status: "scheduled",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create notifications for both participants
    const notificationMessage = `Un rendez-vous vidéo "${title}" a été planifié le ${startDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    await supabase.from("meeting_notifications").insert([
      {
        meeting_id: meeting.id,
        user_id: user_one_id,
        notification_type: "created",
        title: "Nouveau rendez-vous vidéo",
        message: notificationMessage,
      },
      {
        meeting_id: meeting.id,
        user_id: user_two_id,
        notification_type: "created",
        title: "Nouveau rendez-vous vidéo",
        message: notificationMessage,
      },
    ]);

    return NextResponse.json({
      meeting,
      google_meet_url: googleResult.meetUrl || null,
      google_configured: googleResult.success,
      google_error: googleResult.success ? null : googleResult.error,
    });
  } catch (err: any) {
    console.error("[Admin Meetings POST]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}