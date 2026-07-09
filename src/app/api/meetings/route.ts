import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET — Get meetings for a specific user (participant only)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("get_user_meetings", { p_user_id: userId });

    if (error) throw error;

    return NextResponse.json({ meetings: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Meetings GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}