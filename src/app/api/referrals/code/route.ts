// GET /api/referrals/code — code de parrainage du membre connecté (créé à la
// volée si absent, un seul par utilisateur). Réservé aux membres approuvés :
// le lien n'a de sens que pour un parrain déjà validé par l'admin.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { ensureReferralCode } from "@/lib/referrals";

export async function GET(request: NextRequest) {
  const user = await getApprovedUser(request);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const db = getSupabaseAdmin();
  const code = await ensureReferralCode(db, user.id);
  if (!code) return NextResponse.json({ error: "Code de parrainage indisponible." }, { status: 500 });

  const origin = request.nextUrl.origin;
  return NextResponse.json({ code, url: `${origin}/r/${code}` });
}
