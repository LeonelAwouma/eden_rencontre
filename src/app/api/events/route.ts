import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/events — événements à venir, pour l'espace membre.
 * Header : Authorization: Bearer <jeton Supabase du membre>
 *
 * Réservé aux membres approuvés (les événements portent le lien de la réunion).
 * Un membre voit les événements publics, et ceux « sur invitation » auxquels il
 * est invité — jamais les autres.
 */
export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();

    // Membres approuvés uniquement (account_type = 'member' vérifié côté serveur : un coach n'est pas un membre).
    const member = await requireApprovedMember(request);
    if (!member) return NextResponse.json({ error: "Accès réservé aux membres approuvés." }, { status: 403 });
    const userId = member.id;

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 50);
    const offset = (page - 1) * limit;

    const { data: invitations } = await db.from("event_participants").select("event_id").eq("user_id", userId);
    const invitedIds = (invitations || []).map((r) => r.event_id).filter(Boolean);
    const visibility = invitedIds.length ? `is_public.eq.true,id.in.(${invitedIds.join(",")})` : "is_public.eq.true";

    const { data: events, error, count } = await db
      .from("meet_events")
      .select("id, title, description, cover_image_url, meeting_link, location, event_date, participant_limit, is_public, status, created_at, event_participants(count)", { count: "exact" })
      .eq("status", "published")
      .gte("event_date", new Date().toISOString())
      .or(visibility)
      .order("event_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching public events:", error);
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
    console.error("Public events API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
