/**
 * Données d'un membre exposées à un coach : liste blanche explicite.
 * Jamais de select("*") : ni nom réel, e-mail, téléphone, questionnaire, selfie, ni photos d'inscription.
 */
export const COACH_MEMBER_COLUMNS = "id, pseudo, avatar_url, country, city" as const;

export interface CoachMemberDto {
  id: string;
  pseudo: string | null;
  avatarUrl: string | null;
  country: string | null;
  city: string | null;
}

export function toCoachMemberDto(row: Record<string, unknown> | null | undefined): CoachMemberDto | null {
  if (!row || typeof row.id !== "string") return null;
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  return { id: row.id, pseudo: s(row.pseudo), avatarUrl: s(row.avatar_url), country: s(row.country), city: s(row.city) };
}

/** Vue d'une attribution pour le membre concerné (jamais l'identité de l'administrateur). */
export interface MemberAssignmentDto {
  id: string;
  status: string;
  consentStatus: string;
  coachName: string | null;
  /** Photo de profil du coach (profiles.avatar_url), ou null : la carte affiche alors son initiale. */
  coachAvatarUrl: string | null;
  assignedAt: string;
  consentAt: string | null;
  endedAt: string | null;
}

export function toMemberAssignmentDto(row: Record<string, unknown>, coachName: string | null, coachAvatarUrl: string | null = null): MemberAssignmentDto {
  return {
    id: String(row.id),
    status: String(row.status),
    consentStatus: String(row.consent_status),
    coachName,
    coachAvatarUrl: coachAvatarUrl && coachAvatarUrl.trim() ? coachAvatarUrl : null,
    assignedAt: String(row.assigned_at),
    consentAt: (row.consent_at as string | null) ?? null,
    endedAt: (row.ended_at as string | null) ?? null,
  };
}
