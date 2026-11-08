import type { ReactNode } from "react";
import { headers } from "next/headers";
import { CoachShell } from "@/components/coach/coach-shell";
import { CoachUnavailable } from "@/components/coach/coach-unavailable";
import { enforceCoachPageAccess } from "@/lib/coach/layout-guard";

/**
 * Layout de l'espace professionnel : composant SERVEUR. L'accès est décidé ICI, avant qu'aucune page ne soit
 * rendue ni servie : session vérifiée, compte coach actif et approuvé (mêmes règles que les API du lot 1,
 * voir `src/lib/coach/page-guard.ts`).
 *   - anonyme / session expirée → `/login` ; membre approuvé → `/dashboard` (session conservée, aucune déconnexion) ;
 *   - coach désactivé, suspendu ou désynchronisé → `/login?blocked=suspended` ;
 *   - panne de lecture → écran « indisponible » (jamais d'accès par défaut).
 * Rendu dynamique obligatoire : une réponse personnalisée ne doit jamais être servie depuis un cache statique.
 * Le layout n'est pas ré-exécuté lors d'une navigation interne : un refus d'API en cours de session déclenche
 * `router.refresh()` côté client, qui rejoue cette garde.
 */
export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: ReactNode }) {
  // La décision est prise (et la redirection levée) AVANT que `children` ne soit rendu.
  const coach = await enforceCoachPageAccess(await headers());
  if (coach === "unavailable") return <CoachUnavailable />;
  return <CoachShell coach={coach}>{children}</CoachShell>;
}
