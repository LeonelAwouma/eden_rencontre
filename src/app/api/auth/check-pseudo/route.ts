/**
 * POST /api/auth/check-pseudo — { pseudo } → { available: boolean }
 *
 * Inscription (étape 1, classique et Google) : vérifie dès la saisie qu'aucun
 * compte n'utilise déjà ce pseudonyme (insensible à la casse). Alerte anticipée
 * uniquement — chaque route d'inscription garde son propre contrôle définitif
 * (409) à la soumission, et l'index unique en base (profiles_pseudo_unique_idx)
 * reste la seule garantie contre une course entre deux inscriptions simultanées.
 *
 * Si l'appelant est authentifié (en-tête Authorization: Bearer, vérifié
 * côté serveur via getAuthenticatedUser — jamais un identifiant fourni par le
 * client), son propre pseudo actuel est exclu de la recherche de conflit : un
 * membre Google qui reprend une inscription interrompue et resoumet son propre
 * pseudo ne doit pas se voir répondre « déjà pris » par lui-même.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp, getAuthenticatedUser } from "@/lib/api-auth";

const MAX_CHECKS_PER_IP_PER_HOUR = 30;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const pseudo = typeof body.pseudo === "string" ? body.pseudo.trim() : "";
  if (pseudo.length < 2 || pseudo.length > 30 || /[<>"]/.test(pseudo)) {
    return NextResponse.json({ error: "Pseudonyme invalide." }, { status: 400 });
  }

  const ipKey = `check-pseudo:${clientIp(request)}`;
  if (!(await checkRateLimit(ipKey, "check_pseudo", MAX_CHECKS_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ error: "Trop de vérifications. Réessayez plus tard." }, { status: 429 });
  }
  await recordRateLimit(ipKey, "check_pseudo");

  // Identité dérivée uniquement d'une session vérifiée côté serveur — jamais
  // d'un champ "excludeUserId" fourni par le client, qui permettrait de sonder
  // ou de contourner la vérification pour le pseudo de quelqu'un d'autre.
  const authUser = await getAuthenticatedUser(request);

  try {
    const db = getSupabaseAdmin();
    let query = db.from("profiles").select("id").ilike("pseudo", pseudo).limit(1);
    if (authUser) query = query.neq("id", authUser.id);
    const { data: existing, error } = await query.maybeSingle();
    if (error) throw error;
    return NextResponse.json({ available: !existing });
  } catch (err) {
    console.error("[check-pseudo]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Vérification indisponible." }, { status: 503 });
  }
}
