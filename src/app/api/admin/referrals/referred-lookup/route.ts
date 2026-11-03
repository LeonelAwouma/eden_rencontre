// GET /api/admin/referrals/referred-lookup?query= — recherche inversée
// filleul → parrain (nom/pseudo/email du filleul). Une relation de
// parrainage est ainsi consultable dans les deux sens depuis le même écran.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const query = (new URL(request.url).searchParams.get("query") || "").trim();
    if (!query) return NextResponse.json({ results: [] });

    const { data: matches } = await db
      .from("profiles")
      .select("id, name, pseudo, email")
      .or(`name.ilike.%${query}%,pseudo.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    const ids = (matches || []).map((m) => m.id as string);
    if (!ids.length) return NextResponse.json({ results: [] });

    const { data: referrals } = await db.from("referrals").select("referred_user_id, referrer_id, status").in("referred_user_id", ids);
    const referralByReferred = new Map((referrals || []).map((r) => [r.referred_user_id as string, r]));

    const referrerIds = [...new Set((referrals || []).map((r) => r.referrer_id as string))];
    const { data: referrerProfiles } = referrerIds.length
      ? await db.from("profiles").select("id, name, pseudo, avatar_url").in("id", referrerIds)
      : { data: [] as any[] };
    const referrerById = new Map((referrerProfiles || []).map((p) => [p.id as string, p]));

    const results = (matches || [])
      .map((m) => {
        const referral = referralByReferred.get(m.id as string);
        if (!referral) return null;
        const referrer = referrerById.get(referral.referrer_id as string);
        return {
          referredUserId: m.id,
          referredName: m.name,
          referredPseudo: m.pseudo,
          referralStatus: referral.status,
          referrerId: referral.referrer_id,
          referrerName: referrer?.name || null,
          referrerPseudo: referrer?.pseudo || null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referred-lookup error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
