/**
 * POST /api/registration/media — adresses d'envoi signées pour les photos
 * d'une inscription (3 photos de profil, le selfie, la rafale de présence).
 *
 * Le navigateur dépose ensuite chaque image directement dans le bucket privé
 * « registration-media » (jamais via une fonction Vercel, limitée à 4,5 Mo).
 * Ouverte sans connexion : le formulaire classique crée le compte après
 * l'envoi des photos. Chaque adresse ne sert qu'une fois, pour un chemin
 * aléatoire, et le bucket limite la taille et le type des fichiers.
 * Limité par adresse IP : chaque appel ouvre 14 adresses d'envoi.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createUploadSlots } from "@/lib/registration-media";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";

/** Une inscription en demande une, plus quelques reprises (photo refaite, retour en arrière…). */
const MAX_PER_IP_PER_HOUR = 15;

export async function POST(request: NextRequest) {
  const ipKey = `registration-media:${clientIp(request)}`;
  if (!(await checkRateLimit(ipKey, "registration_media", MAX_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ error: "Trop d'envois de photos depuis cette connexion. Réessayez dans une heure." }, { status: 429 });
  }
  await recordRateLimit(ipKey, "registration_media");
  try {
    const slots = await createUploadSlots(getSupabaseAdmin());
    return NextResponse.json(slots);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const missing = /bucket not found|not found/i.test(message);
    console.error("[registration/media]", message);
    return NextResponse.json(
      { error: missing ? "Stockage des photos non configuré : exécutez supabase/migrations/20261002_registration_media.sql." : "Envoi des photos indisponible. Réessayez." },
      { status: 503 }
    );
  }
}
