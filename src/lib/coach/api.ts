import { NextRequest, NextResponse } from "next/server";
import { requireActiveCoach, type ActiveCoach } from "@/lib/coach-auth";

export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export const coachJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * Enveloppe commune des routes `/api/coach/*` : coach actif exigé (membre, coach suspendu ou désynchronisé,
 * erreur de lecture → 403), jamais de mise en cache, et aucune erreur interne exposée (500 générique).
 */
export async function withActiveCoach(
  req: NextRequest,
  handler: (coach: ActiveCoach) => Promise<NextResponse>
): Promise<NextResponse> {
  let coach: ActiveCoach | null = null;
  try { coach = await requireActiveCoach(req); } catch { coach = null; }
  if (!coach) return coachJson({ error: "Accès Coach non autorisé" }, 403);
  try {
    return await handler(coach);
  } catch (err) {
    // Le message est écrit pour le journal serveur (jamais renvoyé) et ne contient aucune donnée de membre.
    console.error("[coach-api]", err instanceof Error ? err.message : "erreur inconnue");
    return coachJson({ error: "Service momentanément indisponible." }, 500);
  }
}
