/**
 * Accès aux séances (serveur). Colonnes explicites (jamais `select("*")`), plafonds de lecture, toujours filtré par le
 * coach de la SESSION D'AUTHENTIFICATION. Les changements d'horaire et de statut passent EXCLUSIVEMENT par les
 * fonctions SQL transactionnelles du lot 3 (`callSessionRpc`).
 */
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SESSION_COLUMNS, type SessionRow } from "@/lib/coach/sessions-dto";
import { mapSessionDbError, type SessionErrorCode } from "@/lib/coach/sessions-model";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Plafond de lecture : les 500 séances les plus récentes (le filtrage fin se fait ensuite). */
export const SESSION_READ_CAP = 500;
export const SESSIONS_PAGE_SIZE = 20;

/** Membres actuellement accompagnés par ce coach : attribution ACTIVE et consentement ACCEPTÉ. */
export async function acceptedMemberIds(db: Db, coachId: string): Promise<string[]> {
  const { data, error } = await db.from("coach_member_assignments").select("member_id")
    .eq("coach_id", coachId).eq("status", "active").eq("consent_status", "accepted");
  if (error) throw new Error("sessions: assignments query failed");
  return [...new Set((data || []).map((r) => r.member_id as string))];
}

export interface SessionFilter { status?: string; memberId?: string; from?: string; to?: string }

/** Séances du coach pour les membres qu'il accompagne ENCORE (les autres sont invisibles : accès coupé). */
export async function loadCoachSessions(db: Db, coachId: string, filter: SessionFilter = {}): Promise<SessionRow[]> {
  const members = await acceptedMemberIds(db, coachId);
  if (members.length === 0) return [];
  const wanted = filter.memberId ? members.filter((m) => m === filter.memberId) : members;
  if (wanted.length === 0) return [];
  const { data, error } = await db.from("coach_sessions").select(SESSION_COLUMNS)
    .eq("coach_id", coachId).in("member_id", wanted).order("scheduled_at", { ascending: false }).limit(SESSION_READ_CAP);
  if (error) throw new Error("sessions: query failed");
  let rows = (data || []) as unknown as SessionRow[];
  if (filter.status) rows = rows.filter((r) => r.status === filter.status);
  if (filter.from) rows = rows.filter((r) => r.scheduled_at >= filter.from!);
  if (filter.to) rows = rows.filter((r) => r.scheduled_at <= filter.to!);
  return rows;
}

/** Une séance de CE coach, ou null (inexistante, ou appartenant à un autre coach : même réponse). */
export async function getCoachSessionRow(db: Db, coachId: string, id: string): Promise<SessionRow | null> {
  const { data, error } = await db.from("coach_sessions").select(SESSION_COLUMNS).eq("id", id).eq("coach_id", coachId).maybeSingle();
  if (error) throw new Error("sessions: lookup failed");
  return (data as unknown as SessionRow | null) ?? null;
}

export type RpcOutcome = { ok: true; id: string } | { ok: false; code: SessionErrorCode | null };

/** Appelle une fonction transactionnelle ; l'exception SQL est traduite en code stable (null = erreur inattendue). */
export async function callSessionRpc(db: Db, fn: string, args: Record<string, unknown>): Promise<RpcOutcome> {
  const { data, error } = await db.rpc(fn, args);
  if (error) return { ok: false, code: mapSessionDbError((error as { message?: string }).message) };
  return typeof data === "string" && data ? { ok: true, id: data } : { ok: false, code: null };
}

/** Séances d'un MEMBRE : tout son historique ; les séances « scheduled » d'une attribution non active sont masquées. */
export async function loadMemberSessions(db: Db, memberId: string): Promise<{ rows: SessionRow[]; coachNames: Map<string, string | null> }> {
  const { data: active, error: aerr } = await db.from("coach_member_assignments").select("id")
    .eq("member_id", memberId).eq("status", "active").eq("consent_status", "accepted");
  if (aerr) throw new Error("member sessions: assignments query failed");
  const activeIds = new Set((active || []).map((r) => r.id as string));
  const { data, error } = await db.from("coach_sessions").select(SESSION_COLUMNS)
    .eq("member_id", memberId).order("scheduled_at", { ascending: false }).limit(SESSION_READ_CAP);
  if (error) throw new Error("member sessions: query failed");
  const rows = ((data || []) as unknown as SessionRow[]).filter((r) => r.status !== "scheduled" || activeIds.has(r.assignment_id));
  return { rows, coachNames: await coachNames(db, rows.map((r) => r.coach_id)) };
}

/** Noms d'affichage des coachs (jamais d'e-mail). */
export async function coachNames(db: Db, ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const { data } = await db.from("coach_accounts").select("user_id, display_name").in("user_id", unique);
  for (const c of data || []) out.set(c.user_id as string, (c.display_name as string | null) ?? null);
  return out;
}

export function paginateRows<T>(rows: T[], page: number, size = SESSIONS_PAGE_SIZE): { items: T[]; page: number; totalPages: number; total: number } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), totalPages);
  return { items: rows.slice((p - 1) * size, p * size), page: p, totalPages, total };
}
