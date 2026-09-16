import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET — Get meetings for the authenticated user (participant only)
export async function GET(req: NextRequest) {
  try {
    // L'identité vient de la session, jamais d'un paramètre d'URL :
    // sinon n'importe qui lit les rendez-vous d'autrui (IDOR).
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("get_user_meetings", { p_user_id: authUser.id });

    if (error) throw error;

    return NextResponse.json({ meetings: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Meetings GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}