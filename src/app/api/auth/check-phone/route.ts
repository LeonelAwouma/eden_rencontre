/**
 * POST /api/auth/check-phone — { phone } → { available: boolean }
 *
 * Inscription : vérifie dès la saisie qu'aucun profil n'utilise déjà ce numéro
 * (un numéro = un profil, index profiles_phone_unique_idx). Alerte anticipée
 * seulement : la route d'inscription tranche (409). Limitée par IP, comme
 * check-email, pour ne pas servir à tester des listes de numéros.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/phone-identity";

const MAX_CHECKS_PER_IP_PER_HOUR = 30;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  }

  const ipKey = `check-phone:${clientIp(request)}`;
  if (!(await checkRateLimit(ipKey, "check_phone", MAX_CHECKS_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ error: "Trop de vérifications. Réessayez plus tard." }, { status: 429 });
  }
  await recordRateLimit(ipKey, "check_phone");

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles").select("id").eq("phone", phone).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ available: !data });
  } catch (err) {
    console.error("[check-phone]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Vérification indisponible." }, { status: 503 });
  }
}
