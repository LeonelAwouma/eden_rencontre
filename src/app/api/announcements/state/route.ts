/**
 * POST /api/announcements/state — { id, action: "dismiss" | "discover" }
 *
 * Mémorise, pour le membre connecté, qu'il a fermé la carte d'une annonce
 * (`dismiss`) ou découvert la fonctionnalité (`discover`). L'identité vient du
 * jeton vérifié côté serveur, jamais du corps de la requête.
 *
 * Fermer masque la carte mais pas le badge « Nouveau » ; découvrir éteint les deux
 * (voir `pickCard` / `badgeTargets` dans src/lib/whats-new.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getMemberOrCoach } from "@/lib/api-auth";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { getAnnouncement } from "@/lib/whats-new";
import { writeState } from "@/lib/whats-new-store";

const MAX_WRITES_PER_HOUR = 60;

export async function POST(request: NextRequest) {
  const user = await getMemberOrCoach(request);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action;
  if (action !== "dismiss" && action !== "discover") {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }
  // Seuls les identifiants du registre sont acceptés : aucune ligne pour une clé arbitraire.
  const announcement = getAnnouncement(id);
  if (!announcement || announcement.surface !== "member") {
    return NextResponse.json({ error: "Annonce inconnue." }, { status: 400 });
  }

  if (!(await checkRateLimit(user.id, "announcement_state", MAX_WRITES_PER_HOUR, 3600))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }
  await recordRateLimit(user.id, "announcement_state");

  const saved = await writeState(getSupabaseAdmin(), user.id, id, action);
  // `saved` faux = migration pas encore exécutée : la réponse reste un succès, l'interface
  // a déjà masqué la carte localement et rien ne doit s'afficher comme une erreur.
  return NextResponse.json({ ok: true, saved });
}
