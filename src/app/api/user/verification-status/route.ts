import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET — Get user's verification status
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("verification_status, verification_rejection_reason")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      verification_status: data.verification_status || "none",
      verification_rejection_reason: data.verification_rejection_reason || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[Verification Status GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}