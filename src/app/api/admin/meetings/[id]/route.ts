import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { updateGoogleMeetEvent, deleteGoogleMeetEvent } from "@/lib/google-calendar";

// GET — Get a single meeting
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("meetings")
      .select(`
        *,
        user_one:profiles!meetings_user_one_id_fkey(id, name, email, avatar_url, city),
        user_two:profiles!meetings_user_two_id_fkey(id, name, email, avatar_url, city),
        admin:admin_users!meetings_admin_id_fkey(id, name, email)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });

    return NextResponse.json({ meeting: data });
  } catch (err: any) {
    console.error("[Admin Meeting GET]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH — Update/reschedule/cancel a meeting
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    // Fetch existing meeting
    const { data: existing, error: fetchError } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });
    }

    const { action, title, description, start_time, duration_minutes, cancellation_reason } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    let notificationType = "updated";
    let notificationTitle = "Rendez-vous mis à jour";
    let notificationMessage = "";

    if (action === "cancel") {
      updateData.status = "cancelled";
      updateData.cancellation_reason = cancellation_reason || "Annulé par l'administrateur";
      notificationType = "cancelled";
      notificationTitle = "Rendez-vous annulé";
      notificationMessage = `Le rendez-vous "${existing.title}" a été annulé.${cancellation_reason ? ` Raison: ${cancellation_reason}` : ""}`;

      // Cancel Google Calendar event
      if (existing.google_event_id) {
        await deleteGoogleMeetEvent(existing.google_event_id);
      }
    } else if (action === "reschedule" && start_time) {
      const newStart = new Date(start_time);
      const newDuration = duration_minutes || existing.duration_minutes;
      const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000);

      updateData.start_time = newStart.toISOString();
      updateData.end_time = newEnd.toISOString();
      updateData.duration_minutes = newDuration;
      updateData.status = "rescheduled";
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;

      notificationType = "rescheduled";
      notificationTitle = "Rendez-vous reprogrammé";
      notificationMessage = `Le rendez-vous "${existing.title}" a été reprogrammé au ${newStart.toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      })}`;

      // Update Google Calendar event
      if (existing.google_event_id) {
        await updateGoogleMeetEvent(existing.google_event_id, {
          title: title || existing.title,
          description: description || existing.description || "",
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        });
      }
    } else {
      // General update
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (start_time) {
        const newStart = new Date(start_time);
        const newDuration = duration_minutes || existing.duration_minutes;
        const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000);
        updateData.start_time = newStart.toISOString();
        updateData.end_time = newEnd.toISOString();
        updateData.duration_minutes = newDuration;
      }
      notificationMessage = `Le rendez-vous "${updateData.title || existing.title}" a été mis à jour.`;
    }

    const { data: updated, error: updateError } = await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create notifications for both participants
    if (notificationMessage) {
      await supabase.from("meeting_notifications").insert([
        {
          meeting_id: id,
          user_id: existing.user_one_id,
          notification_type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
        },
        {
          meeting_id: id,
          user_id: existing.user_two_id,
          notification_type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
        },
      ]);
    }

    return NextResponse.json({ meeting: updated });
  } catch (err: any) {
    console.error("[Admin Meeting PATCH]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}

// DELETE — Permanently delete a meeting
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Fetch meeting to get Google Event ID
    const { data: existing } = await supabase
      .from("meetings")
      .select("google_event_id")
      .eq("id", id)
      .maybeSingle();

    // Delete from Google Calendar
    if (existing?.google_event_id) {
      await deleteGoogleMeetEvent(existing.google_event_id);
    }

    // Delete notifications first
    await supabase.from("meeting_notifications").delete().eq("meeting_id", id);

    // Delete meeting
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Admin Meeting DELETE]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}