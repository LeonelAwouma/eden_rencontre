/**
 * POST /api/auth/check-email — { email } → { available: boolean }
 *
 * Inscription : vérifie dès l'étape « identité » qu'aucun compte n'utilise
 * déjà cette adresse. Avant, le doublon n'était détecté qu'à l'envoi final,
 * après les photos et le selfie. La route d'inscription garde sa propre
 * vérification (409) : celle-ci n'est qu'une alerte anticipée.
 *
 * Cherche dans profiles ET dans les comptes de connexion (un compte Google
 * peut exister sans fiche). Limitée par IP : elle ne doit pas servir à tester
 * des listes d'adresses.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit, findAuthUserByEmail } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";

const MAX_CHECKS_PER_IP_PER_HOUR = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  const ipKey = `check-email:${clientIp(request)}`;
  if (!(await checkRateLimit(ipKey, "check_email", MAX_CHECKS_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ error: "Trop de vérifications. Réessayez plus tard." }, { status: 429 });
  }
  await recordRateLimit(ipKey, "check_email");

  try {
    const { data: profile, error } = await getSupabaseAdmin()
      // Égalité exacte (adresses enregistrées en minuscules) : avec ilike, « _ » serait un joker.
      .from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
    if (error) throw error;
    if (profile) return NextResponse.json({ available: false });
    const authUser = await findAuthUserByEmail(email);
    return NextResponse.json({ available: !authUser });
  } catch (err) {
    console.error("[check-email]", err instanceof Error ? err.message : err);
    // État inconnu : le formulaire laisse continuer, la route d'inscription tranchera.
    return NextResponse.json({ error: "Vérification indisponible." }, { status: 503 });
  }
}
