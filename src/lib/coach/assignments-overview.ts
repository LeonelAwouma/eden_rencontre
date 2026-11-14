/**
 * Vue d'ensemble « Affectation aux coachs » (administration) : logique pure, testable sans base.
 * Les écritures (attribuer, réaffecter, mettre fin) restent dans les fonctions SQL transactionnelles existantes
 * (`coach_assign_member`, `coach_end_assignment`) : on ne recrée aucun mécanisme.
 */

export type Situation = "none" | "pending" | "active" | "to_reassign";
export const SITUATIONS: readonly Situation[] = ["none", "pending", "active", "to_reassign"];

export interface MemberRow {
  id: string; name: string | null; pseudo: string | null; first_name: string | null; last_name: string | null;
  email: string | null; status: string | null; avatar_url: string | null;
}
export interface AssignmentRow {
  id: string; coach_id: string; member_id: string; status: string; assigned_at: string; end_reason: string | null;
}
export interface CoachRow { user_id: string; display_name: string; email: string | null; active: boolean; avatar_url: string | null }

export interface OverviewItem {
  id: string; name: string; pseudo: string | null; email: string | null; status: string | null; avatar_url: string | null;
  situation: Situation;
  coach: { id: string; name: string; email: string | null; active: boolean; avatar_url: string | null } | null;
  assignment: { id: string; status: string; assigned_at: string } | null;
}

const isOpen = (a: AssignmentRow) => a.status === "pending" || a.status === "active";

/** Nom d'affichage : prénom + nom, sinon nom, sinon pseudo. */
export function displayName(m: Pick<MemberRow, "name" | "pseudo" | "first_name" | "last_name">): string {
  const full = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return full || m.name?.trim() || m.pseudo?.trim() || "Membre";
}

/** Retire les caractères qui auraient un sens dans un filtre PostgREST (`or=(…)`, jokers). */
export function sanitizeSearch(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/[,()*%\\:"'`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

/**
 * `open` : attributions pending/active (au plus une par membre, garanti par un index unique).
 * `closed` : attributions terminées, de la plus récente à la plus ancienne.
 * Un membre est « à réaffecter » s'il n'a aucune attribution ouverte et que la plus récente s'est terminée parce
 * que son coach a été désactivé.
 */
export function buildOverview(
  members: MemberRow[], open: AssignmentRow[], closed: AssignmentRow[], coaches: CoachRow[],
): OverviewItem[] {
  const coachById = new Map(coaches.map((c) => [c.user_id, c]));
  const openByMember = new Map<string, AssignmentRow>();
  for (const a of open) if (isOpen(a) && !openByMember.has(a.member_id)) openByMember.set(a.member_id, a);
  const lastClosed = new Map<string, AssignmentRow>();
  for (const a of closed) if (!lastClosed.has(a.member_id)) lastClosed.set(a.member_id, a);

  return members.map((m) => {
    const cur = openByMember.get(m.id);
    const prev = lastClosed.get(m.id);
    const shown = cur ?? (prev?.end_reason === "coach_deactivated" ? prev : undefined);
    const situation: Situation = cur ? (cur.status === "active" ? "active" : "pending") : shown ? "to_reassign" : "none";
    const c = shown ? coachById.get(shown.coach_id) : undefined;
    return {
      id: m.id, name: displayName(m), pseudo: m.pseudo, email: m.email, status: m.status, avatar_url: m.avatar_url,
      situation,
      coach: c ? { id: c.user_id, name: c.display_name, email: c.email, active: c.active, avatar_url: c.avatar_url } : null,
      assignment: shown ? { id: shown.id, status: shown.status, assigned_at: shown.assigned_at } : null,
    };
  });
}

export function filterOverview(items: OverviewItem[], opts: { situation?: Situation | null; coachId?: string | null }): OverviewItem[] {
  return items.filter((i) =>
    (!opts.situation || i.situation === opts.situation) && (!opts.coachId || i.coach?.id === opts.coachId));
}
