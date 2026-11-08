/**
 * Accès aux comptes rendus partagés, aux actions et aux indicateurs (serveur). Colonnes explicites, plafonds de lecture,
 * filtre par coach de la session. Les statuts d'action ne changent QUE par la fonction SQL `coach_update_action_status`.
 * Ce module ne lit JAMAIS `coach_notes` : les routes membre peuvent l'importer sans risque pour la confidentialité.
 */
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ACTION_COLUMNS, REPORT_COLUMNS, type ActionRow, type ReportRow } from "@/lib/coach/content-dto";
import type { SessionRow } from "@/lib/coach/sessions-dto";
import { acceptedMemberIds, coachNames } from "@/lib/coach/sessions-data";

type Db = ReturnType<typeof getSupabaseAdmin>;
export const CONTENT_READ_CAP = 300;

export async function loadCoachReports(db: Db, coachId: string, memberId?: string): Promise<ReportRow[]> {
  let q = db.from("coach_shared_reports").select(REPORT_COLUMNS).eq("coach_id", coachId);
  if (memberId) q = q.eq("member_id", memberId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(CONTENT_READ_CAP);
  if (error) throw new Error("reports: query failed");
  return (data || []) as unknown as ReportRow[];
}

export async function getCoachReport(db: Db, coachId: string, id: string): Promise<ReportRow | null> {
  const { data, error } = await db.from("coach_shared_reports").select(REPORT_COLUMNS).eq("id", id).eq("coach_id", coachId).maybeSingle();
  if (error) throw new Error("reports: lookup failed");
  return (data as unknown as ReportRow | null) ?? null;
}

export async function loadCoachActions(db: Db, coachId: string, memberId?: string): Promise<ActionRow[]> {
  let q = db.from("coach_action_items").select(ACTION_COLUMNS).eq("coach_id", coachId);
  if (memberId) q = q.eq("member_id", memberId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(CONTENT_READ_CAP);
  if (error) throw new Error("actions: query failed");
  return (data || []) as unknown as ActionRow[];
}

export async function getCoachAction(db: Db, coachId: string, id: string): Promise<ActionRow | null> {
  const { data, error } = await db.from("coach_action_items").select(ACTION_COLUMNS).eq("id", id).eq("coach_id", coachId).maybeSingle();
  if (error) throw new Error("actions: lookup failed");
  return (data as unknown as ActionRow | null) ?? null;
}

/** La séance existe-t-elle ET appartient-elle à ce coach et à ce membre ? (rattachement à la création) */
export async function sessionBelongsTo(db: Db, coachId: string, memberId: string, sessionId: string): Promise<boolean> {
  const { data, error } = await db.from("coach_sessions").select("id").eq("id", sessionId).eq("coach_id", coachId).eq("member_id", memberId).maybeSingle();
  if (error) throw new Error("sessions: ownership query failed");
  return Boolean(data);
}

// ── Côté membre : identité = session d'authentification, tables partagées uniquement ──
export async function loadMemberReports(db: Db, memberId: string): Promise<{ rows: ReportRow[]; coachNames: Map<string, string | null> }> {
  const { data, error } = await db.from("coach_shared_reports").select(REPORT_COLUMNS)
    .eq("member_id", memberId).order("published_at", { ascending: false }).limit(CONTENT_READ_CAP);
  if (error) throw new Error("member reports: query failed");
  const rows = ((data || []) as unknown as ReportRow[]).filter((r) => r.published_at); // brouillons exclus
  return { rows, coachNames: await coachNames(db, rows.map((r) => r.coach_id)) };
}

export async function loadMemberActions(db: Db, memberId: string): Promise<{ rows: ActionRow[]; coachNames: Map<string, string | null> }> {
  const { data, error } = await db.from("coach_action_items").select(ACTION_COLUMNS)
    .eq("member_id", memberId).eq("visible_to_member", true).order("created_at", { ascending: false }).limit(CONTENT_READ_CAP);
  if (error) throw new Error("member actions: query failed");
  const rows = (data || []) as unknown as ActionRow[];
  return { rows, coachNames: await coachNames(db, rows.map((r) => r.coach_id)) };
}

// ── Indicateurs du tableau de bord (vrais comptes, aucune estimation) ──
/**
 * « Comptes rendus à compléter » : séances `completed` pour lesquelles AUCUN compte rendu PUBLIÉ n'est lié
 * (`session_id` égal). Un brouillon ne compte pas comme terminé ; une note privée ne fait pas disparaître l'indicateur ;
 * un compte rendu sans `session_id` ne satisfait aucune séance.
 */
export function reportsToComplete(sessions: Pick<SessionRow, "id" | "status">[], reports: Pick<ReportRow, "session_id" | "published_at">[]): string[] {
  const covered = new Set(reports.filter((r) => r.session_id && r.published_at).map((r) => r.session_id as string));
  return sessions.filter((s) => s.status === "completed" && !covered.has(s.id)).map((s) => s.id);
}

export interface CoachLot3Stats {
  upcomingSessions: number;
  nextSessions: { id: string; memberId: string; scheduledAt: string; durationMinutes: number; timezone: string; type: string; topic: string | null }[];
  pendingActions: number;
  reportsToComplete: number;
}

export async function computeCoachLot3Stats(db: Db, coachId: string, nowMs: number): Promise<CoachLot3Stats> {
  const members = await acceptedMemberIds(db, coachId);
  if (members.length === 0) return { upcomingSessions: 0, nextSessions: [], pendingActions: 0, reportsToComplete: 0 };
  const nowIso = new Date(nowMs).toISOString();
  const { data: sdata, error: serr } = await db.from("coach_sessions")
    .select("id, member_id, assignment_id, status, scheduled_at, duration_minutes, timezone, type, topic")
    .eq("coach_id", coachId).in("member_id", members).order("scheduled_at", { ascending: true }).limit(500);
  if (serr) throw new Error("coach stats: sessions query failed");
  const sessions = (sdata || []) as unknown as (Pick<SessionRow, "id" | "member_id" | "status" | "scheduled_at" | "duration_minutes" | "timezone" | "type" | "topic">)[];
  const upcoming = sessions.filter((s) => s.status === "scheduled" && s.scheduled_at >= nowIso);

  const { data: adata, error: aerr } = await db.from("coach_action_items").select("id, member_id, status")
    .eq("coach_id", coachId).in("member_id", members).limit(CONTENT_READ_CAP);
  if (aerr) throw new Error("coach stats: actions query failed");
  const pendingActions = (adata || []).filter((a) => a.status === "todo" || a.status === "in_progress").length;

  const { data: rdata, error: rerr } = await db.from("coach_shared_reports").select("session_id, published_at")
    .eq("coach_id", coachId).in("member_id", members).limit(CONTENT_READ_CAP);
  if (rerr) throw new Error("coach stats: reports query failed");
  const todo = reportsToComplete(sessions, (rdata || []) as unknown as Pick<ReportRow, "session_id" | "published_at">[]);

  return {
    upcomingSessions: upcoming.length,
    nextSessions: upcoming.slice(0, 5).map((s) => ({ id: s.id, memberId: s.member_id, scheduledAt: s.scheduled_at, durationMinutes: s.duration_minutes, timezone: s.timezone, type: s.type, topic: s.topic })),
    pendingActions,
    reportsToComplete: todo.length,
  };
}
