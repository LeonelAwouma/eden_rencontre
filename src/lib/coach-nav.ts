/**
 * Navigation de l'espace Coach : donnée pure (testable sous vitest, environnement `node`).
 * Elle ne contient QUE les entrées qui existent : Vue d'ensemble, Mes membres, Formation, Mon profil.
 * Les fonctions des lots suivants (séances, comptes rendus, ressources) n'apparaissent qu'avec leur lot.
 */

export type CoachDest =
  | { kind: "route"; id: string; labelKey: string; href: string }
  | { kind: "action"; id: string; labelKey: string; action: "logout" };

export interface CoachGroup { key: string; labelKey: string; dests: CoachDest[] }

export const COACH_GROUPS: CoachGroup[] = [
  {
    key: "main",
    labelKey: "coachNav.groupMain",
    dests: [
      { kind: "route", id: "overview", labelKey: "coachNav.overview", href: "/coach" },
      { kind: "route", id: "members", labelKey: "coachNav.members", href: "/coach/members" },
      { kind: "route", id: "formation", labelKey: "coachNav.formation", href: "/coach/formation" },
    ],
  },
  {
    key: "account",
    labelKey: "coachNav.groupAccount",
    dests: [
      { kind: "route", id: "profile", labelKey: "coachNav.profile", href: "/coach/profile" },
      { kind: "action", id: "logout", labelKey: "coachNav.logout", action: "logout" },
    ],
  },
];

/** Entrées de la barre inférieure mobile ; « Menu » ouvre le tiroir (profil, langue, déconnexion). */
export const COACH_PRIMARY_IDS = ["overview", "members", "formation"] as const;

export const COACH_DESTS: Record<string, CoachDest> = Object.fromEntries(
  COACH_GROUPS.flatMap((g) => g.dests).map((d) => [d.id, d])
);

export const COACH_PRIMARY: CoachDest[] = COACH_PRIMARY_IDS.map((id) => COACH_DESTS[id]);

/** « Vue d'ensemble » (`/coach`) n'est active que sur elle-même ; les autres aussi sur leurs sous-pages. */
export function isCoachRouteActive(pathname: string, href: string): boolean {
  if (href === "/coach") return pathname === "/coach";
  return pathname === href || pathname.startsWith(`${href}/`);
}
