/**
 * Décision serveur du layout `/coach`, extraite dans un module `.ts` : elle s'exécute dans le composant SERVEUR avant
 * tout rendu de page, et reste testable (les tests Vitest n'importent pas de TSX).
 *
 * Réutilise les fonctions d'authentification du lot 1 via `resolveCoachPageAccess` ; ne contient aucune règle propre.
 * `redirect()` lève l'exception de redirection de Next : aucune ligne après elle ne s'exécute.
 */
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import type { ActiveCoach } from "@/lib/coach-auth";
import { resolveCoachPageAccess } from "@/lib/coach/page-guard";

/** Reconstruit une requête à partir des SEULS cookies reçus (la session du navigateur n'accompagne pas une page). */
export function requestFromCookies(incoming: Headers): NextRequest {
  const forwarded = new Headers();
  const cookie = incoming.get("cookie");
  if (cookie) forwarded.set("cookie", cookie);
  return new NextRequest("http://localhost/coach", { headers: forwarded });
}

/** Le coach actif, ou « unavailable » (panne de lecture) ; toute autre situation redirige et ne retourne jamais. */
export async function enforceCoachPageAccess(incoming: Headers): Promise<ActiveCoach | "unavailable"> {
  const access = await resolveCoachPageAccess(requestFromCookies(incoming));
  if (access.decision === "redirect") redirect(access.to);
  if (access.decision === "unavailable") return "unavailable";
  return access.coach;
}
