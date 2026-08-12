import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET — Get single event
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const { data: event, error } = await db
      .from("meet_events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: "Événement introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin event detail API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// PUT — Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const body = await request.json();
    const {
      title,
      description,
      cover_image_url,
      meeting_link,
      location,
      event_date,
      participant_limit,
      is_public,
      status,
    } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
    if (location !== undefined) updateData.location = location;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (participant_limit !== undefined) updateData.participant_limit = participant_limit;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (status !== undefined) updateData.status = status;

    const { data: event, error } = await db
      .from("meet_events")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating event:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour." },
        { status: 500 }
      );
    }

    // Log the action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(
      admin.adminId,
      admin.email,
      "event_updated",
      "event",
      id,
      { updated_fields: Object.keys(updateData) },
      ip
    );

    // If event is (now) published and significant fields changed, notify all approved users
    const significantChange = title !== undefined || event_date !== undefined || status === "published";
    const isPublished = (status === "published") || (status === undefined && event.status === "published");

    if (isPublished && significantChange) {
      try {
        // Only notify if status just became published, or date/title changed on a published event
        const justPublished = status === "published" && event.status !== "published";
        const dateOrTitleChanged = (title !== undefined || event_date !== undefined) && event.status === "published";

        if (justPublished || dateOrTitleChanged) {
          const { data: approvedUsers } = await db
            .from("profiles")
            .select("id")
            .eq("status", "approved");

          if (approvedUsers && approvedUsers.length > 0) {
            const finalTitle = title || event.title;
            const finalDate = event_date || event.event_date;
            const formattedDate = new Date(finalDate).toLocaleDateString("fr-FR", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            });

            const notifTitle = justPublished ? "Nouvel événement" : "Événement mis à jour";
            const notifMessage = justPublished
              ? `Un nouvel événement est disponible : « ${finalTitle} » le ${formattedDate}.${event.meeting_link ? " Lien : " + event.meeting_link : ""}`
              : `L'événement « ${finalTitle} » a été modifié. Nouvelle date : ${formattedDate}.${event.meeting_link ? " Lien : " + event.meeting_link : ""}`;

            const notifRows = approvedUsers.map((u: { id: string }) => ({
              user_id: u.id,
              notification_type: "event_notification",
              title: notifTitle,
              message: notifMessage,
            }));

            for (let i = 0; i < notifRows.length; i += 500) {
              const chunk = notifRows.slice(i, i + 500);
              await db.from("meeting_notifications").insert(chunk);
            }

            console.log(`[Admin Events PUT] Sent ${notifRows.length} event notification(s)`);
          }
        }
      } catch (userNotifErr) {
        console.error("[Admin Events PUT] Failed to create user notifications:", userNotifErr);
      }
    }

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin update event API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// DELETE — Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    // Get event details before deletion for logging
    const { data: event } = await db
      .from("meet_events")
      .select("title")
      .eq("id", id)
      .single();

    const { error } = await db
      .from("meet_events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting event:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression." },
        { status: 500 }
      );
    }

    // Log the action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(
      admin.adminId,
      admin.email,
      "event_deleted",
      "event",
      id,
      { title: event?.title || "Unknown" },
      ip
    );

    return NextResponse.json({ ok: true, message: "Événement supprimé." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin delete event API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}