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
      participant_ids,
      admin_id,
      start_time,
      duration_minutes = 60,
    } = body;

    // Get current admin session
    const admin = await requireAdmin().catch(() => null);
    const effectiveAdminId = admin?.adminId === "env-admin" ? null : (admin_id || admin?.adminId || null);

    // Support legacy 2-participant mode OR new multi-participant mode
    const primaryUserId = user_one_id;
    const secondaryUserId = user_two_id;

    // Build unique participant list (at minimum 2 required from user_one_id + user_two_id)
    const extraParticipantIds: string[] = Array.isArray(participant_ids)
      ? participant_ids.filter((id: string) => id && id !== primaryUserId && id !== secondaryUserId)
      : [];

    const allParticipantIds = [primaryUserId, secondaryUserId, ...extraParticipantIds];

    // Validate required fields
    if (!title || !primaryUserId || !secondaryUserId || !start_time) {
      return NextResponse.json(
        { error: "Champs requis: title, user_one_id, user_two_id, start_time" },
        { status: 400 }
      );
    }

    // Calculate end_time
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

    // Fetch all participant profiles for emails
    const { data: allProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", allParticipantIds);

    if (profilesError || !allProfiles || allProfiles.length < 2) {
      return NextResponse.json(
        { error: "Impossible de récupérer les emails des participants" },
        { status: 400 }
      );
    }

    const profileMap = new Map(allProfiles.map((p: { id: string; email: string; name: string }) => [p.id, p]));
    const participantEmails = allParticipantIds
      .map((id) => profileMap.get(id)?.email)
      .filter(Boolean) as string[];

    // Create Google Calendar event with Meet link
    const googleResult = await createGoogleMeetEvent({
      title,
      description: description || "",
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      attendeeEmails: participantEmails,
      organizerEmail: "", // Will be fetched from settings
    });

    // Insert meeting into database
    const { data: meeting, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title,
        description: description || null,
        user_one_id: primaryUserId,
        user_two_id: secondaryUserId,
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

    // Insert extra participants into meeting_participants junction table
    if (extraParticipantIds.length > 0) {
      const participantRows = extraParticipantIds.map((uid) => ({
        meeting_id: meeting.id,
        user_id: uid,
      }));
      const { error: partError } = await supabase
        .from("meeting_participants")
        .insert(participantRows);
      if (partError) {
        console.error("[Admin Meetings POST] Failed to insert extra participants:", partError);
      }
    }

    // Create notifications for ALL participants
    const notificationMessage = `Vous êtes invité(e) au rendez-vous vidéo "${title}" le ${startDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const notificationRows = allParticipantIds.map((uid) => ({
      meeting_id: meeting.id,
      user_id: uid,
      notification_type: "created",
      title: "Invitation à un rendez-vous vidéo",
      message: notificationMessage,
    }));

    const { error: notifError } = await supabase
      .from("meeting_notifications")
      .insert(notificationRows);

    if (notifError) {
      console.error("[Admin Meetings POST] Failed to create notifications:", notifError);
    }

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