/**
 * DTO des notes PRIVÉES du coach (Coach seulement). Ce module est le SEUL à connaître les champs d'une note privée :
 * aucune route membre, aucune route administrateur et aucun composant membre ne l'importe (test statique).
 * Les comptes rendus partagés et les actions vivent dans `content-dto.ts`, sans aucun champ de note privée.
 */

export const NOTE_COLUMNS = "id, coach_id, member_id, session_id, objectives, topics, points_to_support, observations, next_steps, deleted_at, created_at, updated_at";
export interface NoteRow {
  id: string; coach_id: string; member_id: string; session_id: string | null; objectives: string; topics: string;
  points_to_support: string; observations: string; next_steps: string; deleted_at: string | null; created_at: string; updated_at: string;
}
export const COACH_NOTE_KEYS = ["id", "memberId", "sessionId", "objectives", "topics", "pointsToSupport", "observations", "nextSteps", "createdAt", "updatedAt"] as const;
export interface CoachNoteDto {
  id: string; memberId: string; sessionId: string | null; objectives: string; topics: string; pointsToSupport: string;
  observations: string; nextSteps: string; createdAt: string; updatedAt: string;
}
export function toCoachNoteDto(r: NoteRow): CoachNoteDto {
  return {
    id: r.id, memberId: r.member_id, sessionId: r.session_id, objectives: r.objectives, topics: r.topics, pointsToSupport: r.points_to_support,
    observations: r.observations, nextSteps: r.next_steps, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
