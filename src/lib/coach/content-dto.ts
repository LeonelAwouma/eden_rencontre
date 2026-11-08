/**
 * DTO des comptes rendus PARTAGÉS et des actions : listes blanches par rôle (Coach / membre).
 * Les types « membre » ne contiennent AUCUN champ de note privée (celles-ci vivent dans `notes-dto.ts`, que ni les routes
 * membre ni les routes administrateur n'importent) : il est impossible, par construction, d'en renvoyer une à un membre.
 */
import type { ActionOwner, ActionStatus } from "@/lib/coach/notes-model";

// ── Comptes rendus partagés ──────────────────────────────────────────────────
export const REPORT_COLUMNS = "id, coach_id, member_id, session_id, title, summary, published_at, created_at, updated_at";
export interface ReportRow {
  id: string; coach_id: string; member_id: string; session_id: string | null; title: string; summary: string;
  published_at: string | null; created_at: string; updated_at: string;
}
export const COACH_REPORT_KEYS = ["id", "memberId", "sessionId", "title", "summary", "publishedAt", "createdAt", "updatedAt"] as const;
export interface CoachReportDto {
  id: string; memberId: string; sessionId: string | null; title: string; summary: string; publishedAt: string | null; createdAt: string; updatedAt: string;
}
export function toCoachReportDto(r: ReportRow): CoachReportDto {
  return { id: r.id, memberId: r.member_id, sessionId: r.session_id, title: r.title, summary: r.summary, publishedAt: r.published_at, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** Vue membre : un compte rendu PUBLIÉ uniquement ; ni brouillon, ni identifiant de coach. */
export const MEMBER_REPORT_KEYS = ["id", "sessionId", "title", "summary", "publishedAt", "coachName"] as const;
export interface MemberReportDto { id: string; sessionId: string | null; title: string; summary: string; publishedAt: string; coachName: string | null }
export function toMemberReportDto(r: ReportRow, coachName: string | null): MemberReportDto | null {
  if (!r.published_at) return null; // un brouillon n'est jamais exposé
  return { id: r.id, sessionId: r.session_id, title: r.title, summary: r.summary, publishedAt: r.published_at, coachName };
}

// ── Actions ──────────────────────────────────────────────────────────────────
export const ACTION_COLUMNS = "id, coach_id, member_id, session_id, title, description, due_date, status, owner, visible_to_member, completed_at, created_at, updated_at";
export interface ActionRow {
  id: string; coach_id: string; member_id: string; session_id: string | null; title: string; description: string; due_date: string | null;
  status: string; owner: string; visible_to_member: boolean; completed_at: string | null; created_at: string; updated_at: string;
}
export const COACH_ACTION_KEYS = ["id", "memberId", "sessionId", "title", "description", "dueDate", "status", "owner", "visibleToMember", "completedAt", "createdAt", "updatedAt"] as const;
export interface CoachActionDto {
  id: string; memberId: string; sessionId: string | null; title: string; description: string; dueDate: string | null; status: ActionStatus;
  owner: ActionOwner; visibleToMember: boolean; completedAt: string | null; createdAt: string; updatedAt: string;
}
export function toCoachActionDto(r: ActionRow): CoachActionDto {
  return {
    id: r.id, memberId: r.member_id, sessionId: r.session_id, title: r.title, description: r.description, dueDate: r.due_date,
    status: r.status as ActionStatus, owner: r.owner as ActionOwner, visibleToMember: r.visible_to_member,
    completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

/** Vue membre : actions VISIBLES seulement ; `canUpdate` indique si le membre peut les faire avancer (il en est responsable). */
export const MEMBER_ACTION_KEYS = ["id", "sessionId", "title", "description", "dueDate", "status", "owner", "canUpdate", "completedAt", "coachName"] as const;
export interface MemberActionDto {
  id: string; sessionId: string | null; title: string; description: string; dueDate: string | null; status: ActionStatus;
  owner: ActionOwner; canUpdate: boolean; completedAt: string | null; coachName: string | null;
}
export function toMemberActionDto(r: ActionRow, coachName: string | null): MemberActionDto | null {
  if (!r.visible_to_member) return null;
  return {
    id: r.id, sessionId: r.session_id, title: r.title, description: r.description, dueDate: r.due_date, status: r.status as ActionStatus,
    owner: r.owner as ActionOwner, canUpdate: r.owner === "member", completedAt: r.completed_at, coachName,
  };
}
