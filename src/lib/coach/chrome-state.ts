import type { CoachMe } from "@/lib/coach/client";

/**
 * État du coach affiché dans l'espace Coach (fonctions pures, testables sans navigateur).
 * Le contexte `CoachChromeProvider` est la source unique de la photo : ces deux transitions sont les seules
 * façons de la changer.
 */

/** Photo remplacée : la nouvelle adresse s'applique immédiatement (même objet si rien ne change, pour éviter un rendu inutile). */
export function applyAvatar(coach: CoachMe, url: string | null): CoachMe {
  return (coach.avatarUrl ?? null) === url ? coach : { ...coach, avatarUrl: url };
}

/**
 * Nouvelles propriétés reçues du layout serveur (navigation ou `router.refresh()`) : elles font foi et remplacent
 * l'état local. Même objet si elles n'apportent rien de nouveau.
 */
export function syncCoachFromServer(current: CoachMe, server: CoachMe): CoachMe {
  const avatarUrl = server.avatarUrl ?? null;
  if (current.id === server.id && current.email === server.email && current.name === server.name && (current.avatarUrl ?? null) === avatarUrl) {
    return current;
  }
  return { id: server.id, email: server.email, name: server.name, avatarUrl };
}
