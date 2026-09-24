import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getEventAudience } from "@/lib/event-audience";

// GET — List all events
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    // Onglets de l'écran admin :
    //   upcoming  à venir (brouillons et publiés), du plus proche au plus lointain
    //   draft     brouillons, quelle que soit la date
    //   past      passés (hors annulés), du plus récent au plus ancien
    //   cancelled annulés
    //   all       tout
    const tab = searchParams.get("tab") || searchParams.get("status") || "all";
    // Les caractères , ( ) % * \ ont un sens dans le filtre PostgREST : on les retire.
    const search = (searchParams.get("search") || "").replace(/[,()%*\\]/g, " ").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const now = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructeur de requête Supabase
    const applyTab = (q: any, t: string) => {
      if (t === "upcoming") return q.gte("event_date", now).in("status", ["draft", "published"]);
      if (t === "draft") return q.eq("status", "draft");
      if (t === "past") return q.lt("event_date", now).neq("status", "cancelled");
      if (t === "cancelled") return q.eq("status", "cancelled");
      if (t === "published") return q.eq("status", "published");
      return q;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applySearch = (q: any) =>
      search ? q.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`) : q;

    let query = applySearch(applyTab(
      db.from("meet_events")
        .select("*, event_participants(user_id, user:profiles!event_participants_user_id_fkey(id, name, pseudo, email, avatar_url))", { count: "exact" }),
      tab,
    ));
    // À venir : le plus proche d'abord. Sinon : le plus récent d'abord.
    query = query.order("event_date", { ascending: tab === "upcoming" }).range(offset, offset + limit - 1);

    // Compteurs des onglets (même recherche appliquée)
    const countFor = async (t: string) => {
      const { count } = await applySearch(applyTab(db.from("meet_events").select("id", { count: "exact", head: true }), t));
      return count || 0;
    };
    const [result, upcoming, draft, past, cancelled, all] = await Promise.all([
      query,
      countFor("upcoming"), countFor("draft"), countFor("past"), countFor("cancelled"), countFor("all"),
    ]);
    const { data: events, error, count } = result as { data: unknown[] | null; error: unknown; count: number | null };

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
      counts: { upcoming, draft, past, cancelled, all },
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
      participant_ids,
      participant_limit,
      is_public,
      status,
    } = body;

    if (!title || !event_date || Number.isNaN(Date.parse(event_date))) {
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
        // Nombre de places (facultatif) — distinct des membres invités.
        participant_limit: Number.isInteger(participant_limit) && participant_limit > 0 ? participant_limit : null,
        is_public: is_public !== false,
        status: status || "draft",
        created_by: admin.adminId === "env-admin" ? null : admin.adminId,
      })
      .select()
      .single();

    if (error) {
      console.error("[Admin Events POST] Supabase error creating event:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Erreur lors de la création de l'événement.", details: error.message },
        { status: 500 }
      );
    }

    // Insert selected participants
    if (Array.isArray(participant_ids) && participant_ids.length > 0) {
      const participantRows = participant_ids.map((userId: string) => ({
        event_id: event.id,
        user_id: userId,
      }));

      const { error: partError } = await db
        .from("event_participants")
        .insert(participantRows);

      if (partError) {
        console.error("[Admin Events POST] Failed to insert participants:", partError);
      }
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

    // Événement publié : notifier son public (tous les membres, ou seulement les invités)
    if ((status || "draft") === "published") {
      try {
        const audience = await getEventAudience(db, event);
        const approvedUsers = audience.map((id) => ({ id }));

        if (approvedUsers.length > 0) {
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