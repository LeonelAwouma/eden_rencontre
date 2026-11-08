/**
 * Destinations après connexion : règles pures (testées), partagées par la page de connexion,
 * MemberGate et le tableau de bord.
 *
 *  - un coach arrive TOUJOURS dans son espace professionnel (/coach), jamais dans l'expérience membre ;
 *  - un membre garde son parcours habituel ;
 *  - le paramètre « next » n'est suivi que s'il est interne, sans boucle, et cohérent avec le rôle.
 */

export type LoginRole = "coach" | "member";

/** Chemin interne sûr, ou null : pas d'URL externe, pas de « // » ni « /\ », pas de retour vers /login. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\r\n]/.test(next)) return null;
  const path = next.split(/[?#]/)[0];
  if (path === "/login" || path.startsWith("/login/")) return null; // évite la boucle de redirection
  return next;
}

const isCoachPath = (p: string) => p === "/coach" || p.startsWith("/coach/") || p.startsWith("/coach?");
const isReunionPath = (p: string) => p.startsWith("/reunion/");

/** Où envoyer la personne qui vient de se connecter (ou qui revient avec une session existante). */
export function postLoginDestination(role: LoginRole, next: string | null | undefined, existingSession = false): string {
  const safe = safeNextPath(next);
  if (role === "coach") {
    // Le coach ne suit « next » que vers son espace ou vers une salle de séance ; sinon /coach.
    return safe && (isCoachPath(safe) || isReunionPath(safe)) ? safe : "/coach";
  }
  // Un membre n'a rien à faire dans l'espace coach.
  if (safe && !isCoachPath(safe)) return safe;
  return existingSession ? "/searching?returning=1" : "/searching";
}

/**
 * Pages d'atterrissage de l'expérience membre qu'un coach actif ne doit pas utiliser :
 * il est renvoyé vers /coach. Les pages explicitement partagées (salle /reunion/…, formation) restent accessibles.
 */
export function isMemberLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.split(/[?#]/)[0];
  return p === "/dashboard" || p === "/searching" || p.startsWith("/searching/") || p === "/onboarding" || p.startsWith("/onboarding/");
}
