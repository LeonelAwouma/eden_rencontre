/**
 * POST /api/user/verification — badge « Profil vérifié » du membre connecté.
 * Attribue le badge si le profil et le questionnaire sont complets, et renvoie
 * l'avancement (ce qu'il reste à remplir). Appelée à l'ouverture du tableau de
 * bord et après chaque modification du profil.
 * Le membre est identifié par son jeton (Authorization: Bearer), jamais par un
 * identifiant envoyé par le navigateur.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { evaluateVerificationBadge } from "@/lib/verification-badge";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour continuer." }, { status: 401 });
  const result = await evaluateVerificationBadge(getSupabaseAdmin(), user.id);
  if (!result) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  return NextResponse.json(result);
}
