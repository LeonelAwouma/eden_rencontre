/**
 * DTO des séances : LISTES BLANCHES explicites par rôle (jamais la ligne brute).
 * Aucune note privée, aucun contenu de compte rendu, aucun identifiant interne inutile n'y figure.
 */
import type { SessionStatus, SessionType } from "@/lib/coach/sessions-model";

/** Colonnes lues en base (jamais `select("*")`). */
export const SESSION_COLUMNS =
  "id, coach_id, member_id, assignment_id, type, status, scheduled_at, duration_minutes, timezone, topic, rescheduled_to, completed_at, cancelled_at, created_at";

export interface SessionRow {
  id: string; coach_id: string; member_id: string; assignment_id: string; type: string; status: string;
  scheduled_at: string; duration_minutes: number; timezone: string; topic: string | null;
  rescheduled_to: string | null; completed_at: string | null; cancelled_at: string | null; created_at: string;
}

export const COACH_SESSION_KEYS = [
  "id", "memberId", "type", "status", "scheduledAt", "durationMinutes", "timezone", "topic", "rescheduledTo", "completedAt", "cancelledAt", "createdAt",
] as const;

export interface CoachSessionDto {
  id: string; memberId: string; type: SessionType; status: SessionStatus; scheduledAt: string; durationMinutes: number;
  timezone: string; topic: string | null; rescheduledTo: string | null; completedAt: string | null; cancelledAt: string | null; createdAt: string;
}

export function toCoachSessionDto(r: SessionRow): CoachSessionDto {
  return {
    id: r.id, memberId: r.member_id, type: r.type as SessionType, status: r.status as SessionStatus, scheduledAt: r.scheduled_at,
    durationMinutes: r.duration_minutes, timezone: r.timezone, topic: r.topic, rescheduledTo: r.rescheduled_to,
    completedAt: r.completed_at, cancelledAt: r.cancelled_at, createdAt: r.created_at,
  };
}

/** Vue membre : en lecture seule, sans identifiant de coach ni d'attribution. */
export const MEMBER_SESSION_KEYS = ["id", "type", "status", "scheduledAt", "durationMinutes", "timezone", "topic", "coachName"] as const;

export interface MemberSessionDto {
  id: string; type: SessionType; status: SessionStatus; scheduledAt: string; durationMinutes: number; timezone: string; topic: string | null; coachName: string | null;
}

export function toMemberSessionDto(r: SessionRow, coachName: string | null): MemberSessionDto {
  return {
    id: r.id, type: r.type as SessionType, status: r.status as SessionStatus, scheduledAt: r.scheduled_at,
    durationMinutes: r.duration_minutes, timezone: r.timezone, topic: r.topic, coachName,
  };
}
