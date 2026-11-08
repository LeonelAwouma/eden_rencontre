// POST /api/referrals/capture — { nonce }
//
// Capture du parrainage, déclenchée dès l'atterrissage sur la page
// d'onboarding (flux Google) ou côté serveur dans /api/auth/register (flux
// classique, lecture directe du cookie). Utilise `getAuthenticatedUser`,
// JAMAIS `getApprovedUser` : la capture intervient nécessairement avant
// l'approbation administrative (un compte venant de terminer l'échange
// OAuth Google est encore `status='pending'` par définition).
//
// Toute la logique de validation (fraîcheur du compte, usage unique du
// nonce, anti auto-parrainage) vit dans la fonction Postgres
// claim_referral_intent_and_record (une seule transaction) — cette route ne
// fait que résoudre l'identité depuis la session et appeler le RPC.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { captureReferral } from "@/lib/referrals";
import { refuseCoachSession } from "@/lib/coach/guard";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const nonce = typeof body.nonce === "string" ? body.nonce : "";
  if (!nonce) return NextResponse.json({ ok: true }); // rien à capturer, jamais une erreur

  const db = getSupabaseAdmin();
  // Un coach n'est jamais parrainé : refus (le parrainage est réservé aux candidats membres).
  const coachRefusal = await refuseCoachSession(db, user.id);
  if (coachRefusal) return coachRefusal;
  await captureReferral(db, nonce, user.id);
  return NextResponse.json({ ok: true });
}
