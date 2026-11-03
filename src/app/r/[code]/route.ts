// GET /r/[code] — point d'entrée public d'un lien de parrainage.
// Pose un jeton d'intention à usage unique (referral_capture_intents) et le
// cookie `eden_ref` (le nonce, jamais le code brut), puis redirige vers la
// page de présentation. Code introuvable/inactif → redirection silencieuse,
// aucune erreur visible, inscription jamais bloquée.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isReferralCodeFormat, REFERRAL_COOKIE, REFERRAL_INTENT_MAX_AGE_SECONDS } from "@/lib/referrals";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = request.nextUrl.origin;
  const landing = new URL("/parrainage/invitation", origin);

  if (!isReferralCodeFormat(code)) {
    return NextResponse.redirect(landing);
  }

  try {
    const db = getSupabaseAdmin();
    const { data: referralCode } = await db
      .from("referral_codes")
      .select("code")
      .ilike("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (!referralCode) {
      return NextResponse.redirect(landing);
    }

    const { data: intent, error } = await db
      .from("referral_capture_intents")
      .insert({ code: referralCode.code })
      .select("nonce")
      .single();
    if (error || !intent) {
      console.error("[referrals] création de l'intention impossible:", error?.message);
      return NextResponse.redirect(landing);
    }

    landing.searchParams.set("via", "1");
    const response = NextResponse.redirect(landing);
    response.cookies.set(REFERRAL_COOKIE, intent.nonce, {
      httpOnly: false, // lu côté client pour être propagé dans redirectTo au flux Google (signInWithGoogle)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFERRAL_INTENT_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("[referrals] /r/[code] erreur:", err);
    return NextResponse.redirect(landing);
  }
}
