/**
 * Garde SERVEUR de l'espace Coach (pages `/coach/*`) : décide, à partir de la requête, avant qu'AUCUNE page ne soit rendue.
 *
 * Elle réutilise les règles de sécurité du lot 1 — jamais une seconde logique d'autorisation :
 *   - session : `getAuthenticatedUser` (jeton Supabase vérifié auprès du service d'authentification, pas un simple
 *     contrôle de présence d'un JWT) ;
 *   - coach actif : `getActiveCoachByUserId` (coach_accounts actif + profil coach approuvé : une désynchronisation
 *     entre les deux tables est refusée) ;
 *   - rôle du refus : `getAccountKind` (membre approuvé) et `classifyTarget` (compte coach inactif).
 *
 * Le motif du refus vient de la base, jamais d'une valeur envoyée par le navigateur. Aucune déconnexion n'est
 * déclenchée ici : un membre qui ouvre `/coach` garde sa session.
 */
import type { NextRequest } from "next/server";
import { getAccountKind, getVerifiedSession } from "@/lib/api-auth";
import { isCoachSessionAccepted } from "@/lib/session-guard";
import { getActiveCoachByUserId, type ActiveCoach } from "@/lib/coach-auth";
import { classifyTarget } from "@/lib/coach/guard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Anonyme, session absente ou expirée : connexion, puis retour sur l'espace Coach. */
export const COACH_LOGIN_REDIRECT = "/login?next=%2Fcoach";
/** Membre approuvé : son espace, session conservée. */
export const COACH_MEMBER_REDIRECT = "/dashboard";
/** Compte coach désactivé, suspendu ou désynchronisé : message de suspension (la connexion refuse déjà ces comptes). */
export const COACH_INACTIVE_REDIRECT = "/login?blocked=suspended";

export type CoachRefusalReason = "anonymous" | "member" | "inactive_coach" | "other";

export type CoachPageAccess =
  | { decision: "allow"; coach: ActiveCoach }
  | { decision: "redirect"; to: string; reason: CoachRefusalReason }
  /** Erreur technique : ni accès ni redirection (jamais d'accès par défaut, jamais de déconnexion sur une panne). */
  | { decision: "unavailable" };

export async function resolveCoachPageAccess(req: NextRequest): Promise<CoachPageAccess> {
  let session: Awaited<ReturnType<typeof getVerifiedSession>>;
  try { session = await getVerifiedSession(req); } catch { return { decision: "unavailable" }; }
  if (!session) return { decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "anonymous" };
  const user = session.user;

  const coach = await getActiveCoachByUserId(user.id);
  if (coach) {
    // Option B : session révoquée (drapeau COACH_REQUIRE_ACTIVE_SESSION) → comme une session absente : connexion.
    // Le jeton transmis ici est celui que le service Auth vient de vérifier (jamais une `NextRequest` globale).
    if (!(await isCoachSessionAccepted(session.accessToken))) return { decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "anonymous" };
    return { decision: "allow", coach };
  }

  // Pas un coach actif : pourquoi ? (fail-closed : une panne de lecture n'est jamais prise pour un refus de rôle)
  const kind = await getAccountKind(user.id);
  if (kind === "member") return { decision: "redirect", to: COACH_MEMBER_REDIRECT, reason: "member" };
  // « coach » ici signifie coach actif selon une lecture, alors que la précédente a refusé : incohérence passagère.
  if (kind === "coach") return { decision: "unavailable" };

  const target = await classifyTarget(getSupabaseAdmin(), user.id);
  if (target === "coach") return { decision: "redirect", to: COACH_INACTIVE_REDIRECT, reason: "inactive_coach" };
  if (target === "error") return { decision: "unavailable" };
  // Membre en attente, refusé ou suspendu, profil absent : l'espace membre (MemberGate) décidera.
  return { decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "other" };
}
