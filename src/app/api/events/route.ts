import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Public API — Published events only (for main platform)
export async function GET(request: NextRequest) {
  try {
    const db = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    const { data: events, error, count } = await db
      .from("meet_events")
      .select("id, title, description, cover_image_url, meeting_link, location, event_date, participant_limit, is_public, status, created_at", { count: "exact" })
      .eq("status", "published")
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