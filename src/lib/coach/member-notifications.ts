/**
 * Logique PURE des notifications d'accompagnement côté membre (testée sous vitest, sans DOM).
 * Source : `GET /api/coach-notifications` (table coach_notifications) ; lecture : `PATCH` { id } ou { all: true }.
 */

export const COACH_PROPOSAL_KIND = "coach_assignment_proposed";
export const COACH_PROPOSAL_ANCHOR = "coach-proposal";
/** Adresse stable du deep link : l'onglet « Home » est la valeur réelle de TABS, quelle que soit la langue. */
export const COACH_PROPOSAL_HREF = `/dashboard?tab=Home#${COACH_PROPOSAL_ANCHOR}`;

export interface MemberCoachNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Clic sur une notification : une proposition mène à la carte de validation ; les autres restent dans la liste. */
export type CoachNotifAction = "open-proposal" | "mark-read-only";

export function coachNotifAction(n: Pick<MemberCoachNotification, "kind">): CoachNotifAction {
  return n.kind === COACH_PROPOSAL_KIND ? "open-proposal" : "mark-read-only";
}

/** Clés de traduction connues (texte fixe en base : on affiche la version traduite, sinon le texte enregistré). */
const KNOWN_KINDS = new Set(["coach_assignment_proposed", "assignment_ended"]);
export const coachNotifTextKey = (kind: string): string => (KNOWN_KINDS.has(kind) ? kind : "generic");

/** Applique localement une lecture individuelle (réponse optimiste confirmée par le serveur). */
export function markReadLocal(items: MemberCoachNotification[], id: string, at: string): MemberCoachNotification[] {
  return items.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: at } : n));
}

export function markAllReadLocal(items: MemberCoachNotification[], at: string): MemberCoachNotification[] {
  return items.map((n) => (n.read_at ? n : { ...n, read_at: at }));
}

/** Nombre de non lues après une lecture locale : le total serveur (exact) moins les lignes tout juste lues. */
export function unreadAfter(totalUnread: number, newlyRead: number): number {
  return Math.max(0, totalUnread - Math.max(0, newlyRead));
}

/** La carte « proposition » n'est la bonne cible que tant qu'une proposition est réellement en attente. */
export function proposalAnchorFromHash(hash: string): boolean {
  return hash.replace(/^#/, "") === COACH_PROPOSAL_ANCHOR;
}
