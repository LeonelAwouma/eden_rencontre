import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET — List all events
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = db
      .from("meet_events")
      .select("*", { count: "exact" })
      .order("event_date", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Error fetching events:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des événements." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin events API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// POST — Create a new event
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getSupabaseAdmin();

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

    if (!title || !event_date) {
      return NextResponse.json(
        { error: "Le titre et la date sont obligatoires." },
        { status: 400 }
      );
    }

    const { data: event, error } = await db
      .from("meet_events")
      .insert({
        title,
        description: description || null,
        cover_image_url: cover_image_url || null,
        meeting_link: meeting_link || null,
        location: location || null,
        event_date,
        participant_limit: participant_limit || null,
        is_public: is_public !== false,
        status: status || "draft",
        created_by: admin.adminId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'événement." },
        { status: 500 }
      );
    }

    // Log the action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logAdminAction(
      admin.adminId,
      admin.email,
      "event_created",
      "event",
      event.id,
      { title, event_date, status: status || "draft" },
      ip
    );

    // Create admin notification for the new event
    try {
      await db.from("admin_notifications").insert({
        type: "event",
        title: "Nouvel événement créé",
        message: `L'événement "${title}" a été créé pour le ${new Date(event_date).toLocaleDateString("fr-FR")}.`,
        link: `/admin/events/${event.id}/edit`,
        metadata: { event_id: event.id, event_title: title, event_date, status: status || "draft" },
      });
    } catch (notifErr) {
      console.error("Failed to create event notification:", notifErr);
    }

    // If event is published, notify all approved users
    if ((status || "draft") === "published") {
      try {
        const { data: approvedUsers } = await db
          .from("profiles")
          .select("id")
          .eq("status", "approved");

        if (approvedUsers && approvedUsers.length > 0) {
          const formattedDate = new Date(event_date).toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });

          const notifRows = approvedUsers.map((u: { id: string }) => ({
            user_id: u.id,
            notification_type: "event_notification",
            title: "Nouvel événement",
            message: `Un nouvel événement est disponible : « ${title} » le ${formattedDate}.${meeting_link ? " Lien : " + meeting_link : ""}`,
          }));

          // Batch insert (chunks of 500 to avoid payload limits)
          for (let i = 0; i < notifRows.length; i += 500) {
            const chunk = notifRows.slice(i, i + 500);
            await db.from("meeting_notifications").insert(chunk);
          }

          console.log(`[Admin Events POST] Sent ${notifRows.length} event notification(s)`);
        }
      } catch (userNotifErr) {
        console.error("[Admin Events POST] Failed to create user notifications:", userNotifErr);
      }
    }

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin create event API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}