/**
 * Modèle des séances (module PUR) : types, machine d'états, validation, correspondance des erreurs de la base.
 *
 * Ces règles sont RÉPÉTÉES côté SQL (contraintes, triggers, fonctions du lot 3) : ce module donne des réponses
 * claires à l'interface et refuse tôt, il n'est jamais la seule barrière.
 *
 * Périmètre : une séance concerne UN seul membre. Aucun type « couple », aucun lien de visioconférence.
 */
import { parseInstantInput, type ZoneErrorCode } from "@/lib/coach/time-zone";

export const SESSION_TYPES = ["individual", "follow_up", "review"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_STATUSES = ["scheduled", "completed", "cancelled", "postponed", "no_show"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** `reschedule` (même séance, nouvel horaire) et `postpone` (nouvelle séance, ancienne conservée) sont DEUX opérations. */
export const SESSION_ACTIONS = ["complete", "cancel", "no_show", "reschedule", "postpone"] as const;
export type SessionAction = (typeof SESSION_ACTIONS)[number];

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 240;
export const DURATION_STEP_MINUTES = 5;
export const TOPIC_MAX = 200;
/** Tolérance pour planifier « maintenant » (identique à la base : 5 minutes). */
export const PAST_GRACE_MS = 5 * 60_000;

export const isSessionType = (v: unknown): v is SessionType => typeof v === "string" && (SESSION_TYPES as readonly string[]).includes(v);
export const isSessionStatus = (v: unknown): v is SessionStatus => typeof v === "string" && (SESSION_STATUSES as readonly string[]).includes(v);
export const isSessionAction = (v: unknown): v is SessionAction => typeof v === "string" && (SESSION_ACTIONS as readonly string[]).includes(v);

/** 15 à 240 minutes, entier, par pas de 5. */
export function isValidDuration(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= MIN_DURATION_MINUTES && n <= MAX_DURATION_MINUTES && n % DURATION_STEP_MINUTES === 0;
}

export type SessionErrorCode =
  | ZoneErrorCode
  | "bad_input" | "bad_type" | "bad_duration" | "bad_topic" | "bad_action" | "bad_member" | "past"
  | "not_scheduled" | "not_started" | "overlap" | "no_access" | "not_found" | "forbidden_field";

export type Validation<T> = { ok: true; value: T } | { ok: false; code: SessionErrorCode; candidates?: [string, string] };

/** Sujet : texte brut, nettoyé, ≤ 200 caractères ; vide → null. Trop long = refus (jamais tronqué en silence). */
export function cleanTopic(v: unknown): Validation<string | null> {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false, code: "bad_topic" };
  // eslint-disable-next-line no-control-regex
  const t = v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (t.length > TOPIC_MAX) return { ok: false, code: "bad_topic" };
  return { ok: true, value: t === "" ? null : t };
}

/**
 * Machine d'états. Seule une séance « scheduled » évolue ; `complete` et `no_show` exigent que la séance ait commencé ;
 * `cancel`, `reschedule` et `postpone` sont possibles à tout moment tant qu'elle est « scheduled ».
 */
export function canTransition(
  status: SessionStatus, action: SessionAction, scheduledAtMs: number, nowMs: number
): { ok: true } | { ok: false; code: "not_scheduled" | "not_started" } {
  if (status !== "scheduled") return { ok: false, code: "not_scheduled" };
  if ((action === "complete" || action === "no_show") && scheduledAtMs > nowMs) return { ok: false, code: "not_started" };
  return { ok: true };
}

export interface CreateSessionInput {
  memberId: string;
  type: SessionType;
  scheduledAtIso: string;
  durationMinutes: number;
  timezone: string;
  topic: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (b: unknown): Record<string, unknown> | null => (b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null);

/** Corps de POST /api/coach/sessions. Un seul `member_id` (jamais une liste) ; l'instant suit la règle des fuseaux. */
export function validateCreateSession(body: unknown, nowMs: number): Validation<CreateSessionInput> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  if (typeof b.member_id !== "string" || !UUID.test(b.member_id)) return { ok: false, code: "bad_member" };
  if (!isSessionType(b.type)) return { ok: false, code: "bad_type" };
  if (!isValidDuration(b.duration_minutes)) return { ok: false, code: "bad_duration" };
  const topic = cleanTopic(b.topic);
  if (!topic.ok) return topic;
  const at = parseInstantInput(b as never);
  if (!at.ok) return { ok: false, code: at.code, candidates: at.candidates };
  if (at.utc.getTime() < nowMs - PAST_GRACE_MS) return { ok: false, code: "past" };
  return { ok: true, value: { memberId: b.member_id, type: b.type, scheduledAtIso: at.utc.toISOString(), durationMinutes: b.duration_minutes, timezone: at.timezone, topic: topic.value } };
}

export interface RescheduleInput { scheduledAtIso: string; durationMinutes: number }

/** Corps de reprogrammation / report : nouvel instant (+ fuseau pour une heure locale) et durée. */
export function validateNewSchedule(body: unknown, nowMs: number): Validation<RescheduleInput & { timezone: string }> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  if (!isValidDuration(b.duration_minutes)) return { ok: false, code: "bad_duration" };
  const at = parseInstantInput(b as never);
  if (!at.ok) return { ok: false, code: at.code, candidates: at.candidates };
  if (at.utc.getTime() < nowMs - PAST_GRACE_MS) return { ok: false, code: "past" };
  return { ok: true, value: { scheduledAtIso: at.utc.toISOString(), durationMinutes: b.duration_minutes, timezone: at.timezone } };
}

/**
 * PATCH /api/coach/sessions/[id] : soit une ACTION (complete, cancel, no_show, reschedule, postpone), soit une
 * modification de `topic` / `type`. Les deux à la fois sont refusés ; `scheduled_at`, `duration_minutes` et `status` ne
 * peuvent JAMAIS être écrits directement (ils passent par les actions, donc par les fonctions transactionnelles).
 */
export type PatchSession =
  | { kind: "action"; action: SessionAction; body: Record<string, unknown> }
  | { kind: "edit"; topic?: string | null; type?: SessionType };

export function parsePatchSession(body: unknown): Validation<PatchSession> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  const hasAction = "action" in b;
  const editKeys = ["topic", "type"].filter((k) => k in b);
  if (hasAction) {
    if (editKeys.length > 0) return { ok: false, code: "forbidden_field" };
    if (!isSessionAction(b.action)) return { ok: false, code: "bad_action" };
    return { ok: true, value: { kind: "action", action: b.action, body: b } };
  }
  const allowed = new Set(["topic", "type"]);
  if (Object.keys(b).some((k) => !allowed.has(k))) return { ok: false, code: "forbidden_field" };
  if (editKeys.length === 0) return { ok: false, code: "bad_input" };
  const out: { kind: "edit"; topic?: string | null; type?: SessionType } = { kind: "edit" };
  if ("topic" in b) {
    const t = cleanTopic(b.topic);
    if (!t.ok) return t;
    out.topic = t.value;
  }
  if ("type" in b) {
    if (!isSessionType(b.type)) return { ok: false, code: "bad_type" };
    out.type = b.type;
  }
  return { ok: true, value: out };
}

/** Code d'erreur → statut HTTP (404 pour tout ce qui révélerait l'existence d'une ressource d'autrui). */
export const SESSION_ERROR_STATUS: Record<SessionErrorCode, number> = {
  bad_timezone: 400, bad_datetime: 400, naive_datetime: 400, nonexistent_local_time: 400, ambiguous_local_time: 400,
  bad_input: 400, bad_type: 400, bad_duration: 400, bad_topic: 400, bad_action: 400, bad_member: 400, past: 400, forbidden_field: 400,
  not_scheduled: 409, not_started: 409, overlap: 409, no_access: 404, not_found: 404,
};

const DB_CODES: SessionErrorCode[] = [
  "no_access", "not_found", "overlap", "past", "not_scheduled", "not_started", "bad_duration", "bad_type", "bad_topic", "bad_timezone", "bad_action",
];

/** Message d'une exception SQL des fonctions du lot 3 → code stable ; null = erreur inattendue (500 générique). */
export function mapSessionDbError(message: unknown): SessionErrorCode | null {
  if (typeof message !== "string") return null;
  return DB_CODES.find((c) => new RegExp(`(^|[^a-z_])${c}([^a-z_]|$)`).test(message)) ?? null;
}
