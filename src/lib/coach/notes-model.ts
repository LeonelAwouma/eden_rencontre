/**
 * Notes privées, comptes rendus partagés et actions (module PUR) : plafonds, nettoyage, validation, transitions.
 *
 * Les plafonds et la matrice de transitions sont RÉPÉTÉS côté SQL (CHECK, trigger, fonction
 * `coach_update_action_status`) : ce module donne des réponses claires et refuse tôt, il n'est jamais la seule barrière.
 * Tout est du TEXTE BRUT : jamais de HTML, rendu par React (échappé) — aucun `dangerouslySetInnerHTML`.
 */

export const NOTE_FIELD_MAX = 2000;
export const REPORT_TITLE_MAX = 120;
export const REPORT_SUMMARY_MAX = 5000;
export const ACTION_TITLE_MAX = 120;
export const ACTION_DESCRIPTION_MAX = 1000;

export const NOTE_FIELDS = ["objectives", "topics", "points_to_support", "observations", "next_steps"] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export const ACTION_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export const ACTION_OWNERS = ["coach", "member"] as const;
export type ActionOwner = (typeof ACTION_OWNERS)[number];

export type ContentErrorCode =
  | "bad_input" | "bad_field" | "too_long" | "empty" | "bad_title" | "bad_summary" | "bad_description" | "bad_due_date"
  | "bad_owner" | "bad_status" | "bad_visibility" | "forbidden_field" | "bad_session" | "bad_member";

export type Validation<T> = { ok: true; value: T } | { ok: false; code: ContentErrorCode; field?: string };

const record = (b: unknown): Record<string, unknown> | null => (b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuidString = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Texte brut : fins de ligne normalisées, caractères de contrôle retirés, espaces de bord supprimés. */
export function cleanText(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function text(v: unknown, max: number, code: ContentErrorCode, field: string): Validation<string> {
  if (typeof v !== "string") return { ok: false, code, field };
  const t = cleanText(v);
  if (t.length > max) return { ok: false, code: "too_long", field };
  return { ok: true, value: t };
}

/** Sélecteur facultatif « Rattacher à une séance » : absent ou nul = pas de séance ; sinon un UUID. */
export function parseSessionId(v: unknown): Validation<string | null> {
  if (v === undefined || v === null) return { ok: true, value: null };
  return isUuidString(v) ? { ok: true, value: v } : { ok: false, code: "bad_session", field: "session_id" };
}

// ── Notes privées ────────────────────────────────────────────────────────────
export interface NoteInput { sessionId: string | null; fields: Record<NoteField, string> }

/** Création d'une note : au moins un champ non vide ; `session_id` fixé ICI (immuable ensuite). */
export function validateNoteCreate(body: unknown): Validation<NoteInput> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  const allowed = new Set<string>([...NOTE_FIELDS, "session_id"]);
  const extra = Object.keys(b).find((k) => !allowed.has(k));
  if (extra) return { ok: false, code: "forbidden_field", field: extra };
  const session = parseSessionId(b.session_id);
  if (!session.ok) return session;
  const fields = {} as Record<NoteField, string>;
  for (const f of NOTE_FIELDS) {
    if (b[f] === undefined || b[f] === null) { fields[f] = ""; continue; }
    const t = text(b[f], NOTE_FIELD_MAX, "bad_field", f);
    if (!t.ok) return t;
    fields[f] = t.value;
  }
  if (NOTE_FIELDS.every((f) => fields[f] === "")) return { ok: false, code: "empty" };
  return { ok: true, value: { sessionId: session.value, fields } };
}

/** Modification d'une note : champs de texte seulement (jamais `session_id`, `coach_id`, `member_id`). */
export function validateNotePatch(body: unknown): Validation<Partial<Record<NoteField, string>>> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  const extra = Object.keys(b).find((k) => !(NOTE_FIELDS as readonly string[]).includes(k));
  if (extra) return { ok: false, code: "forbidden_field", field: extra };
  const out: Partial<Record<NoteField, string>> = {};
  for (const f of NOTE_FIELDS) {
    if (!(f in b)) continue;
    const t = text(b[f], NOTE_FIELD_MAX, "bad_field", f);
    if (!t.ok) return t;
    out[f] = t.value;
  }
  if (Object.keys(out).length === 0) return { ok: false, code: "bad_input" };
  return { ok: true, value: out };
}

// ── Comptes rendus partagés ──────────────────────────────────────────────────
export interface ReportInput { sessionId: string | null; title: string; summary: string }

export function validateReportCreate(body: unknown): Validation<ReportInput> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  const extra = Object.keys(b).find((k) => !["title", "summary", "session_id"].includes(k));
  if (extra) return { ok: false, code: "forbidden_field", field: extra };
  const session = parseSessionId(b.session_id);
  if (!session.ok) return session;
  const title = b.title === undefined ? ({ ok: true, value: "" } as const) : text(b.title, REPORT_TITLE_MAX, "bad_title", "title");
  if (!title.ok) return title;
  const summary = b.summary === undefined ? ({ ok: true, value: "" } as const) : text(b.summary, REPORT_SUMMARY_MAX, "bad_summary", "summary");
  if (!summary.ok) return summary;
  return { ok: true, value: { sessionId: session.value, title: title.value, summary: summary.value } };
}

export type ReportPatch = { kind: "edit"; title?: string; summary?: string } | { kind: "publish" } | { kind: "unpublish" };

/** Édition (titre / résumé) OU publication / dépublication — jamais mélangées, jamais `session_id` ni `published_at`. */
export function parseReportPatch(body: unknown): Validation<ReportPatch> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  if ("action" in b) {
    if (Object.keys(b).length > 1) return { ok: false, code: "forbidden_field" };
    if (b.action === "publish") return { ok: true, value: { kind: "publish" } };
    if (b.action === "unpublish") return { ok: true, value: { kind: "unpublish" } };
    return { ok: false, code: "bad_input", field: "action" };
  }
  const extra = Object.keys(b).find((k) => k !== "title" && k !== "summary");
  if (extra) return { ok: false, code: "forbidden_field", field: extra };
  const out: { kind: "edit"; title?: string; summary?: string } = { kind: "edit" };
  if ("title" in b) { const t = text(b.title, REPORT_TITLE_MAX, "bad_title", "title"); if (!t.ok) return t; out.title = t.value; }
  if ("summary" in b) { const t = text(b.summary, REPORT_SUMMARY_MAX, "bad_summary", "summary"); if (!t.ok) return t; out.summary = t.value; }
  if (out.title === undefined && out.summary === undefined) return { ok: false, code: "bad_input" };
  return { ok: true, value: out };
}

/** Un compte rendu ne peut être publié que s'il a un titre et un résumé non vides (règle reprise par un CHECK SQL). */
export const canPublishReport = (title: string, summary: string) => title.trim().length > 0 && summary.trim().length > 0;

// ── Actions ──────────────────────────────────────────────────────────────────
export interface ActionInput {
  memberId: string;
  sessionId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
  owner: ActionOwner;
  visibleToMember: boolean;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseDueDate(v: unknown, todayIso: string): Validation<string | null> {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false, code: "bad_due_date", field: "due_date" };
  const m = DATE_RE.exec(v);
  if (!m) return { ok: false, code: "bad_due_date", field: "due_date" };
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return { ok: false, code: "bad_due_date", field: "due_date" };
  if (v < todayIso) return { ok: false, code: "bad_due_date", field: "due_date" }; // échéance avant aujourd'hui refusée
  return { ok: true, value: v };
}

/** Création : `status` et `completed_at` ne sont JAMAIS acceptés (une action naît « todo »). */
export function validateActionCreate(body: unknown, todayIso: string): Validation<ActionInput> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  const allowed = ["member_id", "session_id", "title", "description", "due_date", "owner", "visible_to_member"];
  const extra = Object.keys(b).find((k) => !allowed.includes(k));
  if (extra) return { ok: false, code: "forbidden_field", field: extra };
  if (!isUuidString(b.member_id)) return { ok: false, code: "bad_member", field: "member_id" };
  const session = parseSessionId(b.session_id);
  if (!session.ok) return session;
  const title = text(b.title, ACTION_TITLE_MAX, "bad_title", "title");
  if (!title.ok) return title;
  if (title.value === "") return { ok: false, code: "bad_title", field: "title" };
  const desc = b.description === undefined || b.description === null ? ({ ok: true, value: "" } as const) : text(b.description, ACTION_DESCRIPTION_MAX, "bad_description", "description");
  if (!desc.ok) return desc;
  const due = parseDueDate(b.due_date, todayIso);
  if (!due.ok) return due;
  const owner = b.owner === undefined ? "member" : b.owner;
  if (owner !== "coach" && owner !== "member") return { ok: false, code: "bad_owner", field: "owner" };
  if (b.visible_to_member !== undefined && typeof b.visible_to_member !== "boolean") return { ok: false, code: "bad_visibility", field: "visible_to_member" };
  // Une action dont le membre est responsable lui est forcément visible.
  const visible = owner === "member" ? true : b.visible_to_member === undefined ? false : (b.visible_to_member as boolean);
  return { ok: true, value: { memberId: b.member_id, sessionId: session.value, title: title.value, description: desc.value, dueDate: due.value, owner, visibleToMember: visible } };
}

export type ActionPatch = { kind: "status"; status: ActionStatus } | { kind: "edit"; title?: string; description?: string; dueDate?: string | null; visibleToMember?: boolean };

/**
 * Coach : changement de statut (via la fonction SQL) OU édition de titre / description / échéance / visibilité.
 * `completed_at`, `status` mélangé à une édition, `session_id`, `owner`, `member_id` : refusés.
 */
export function parseActionPatch(body: unknown, todayIso: string): Validation<ActionPatch> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  if ("status" in b) {
    if (Object.keys(b).length > 1) return { ok: false, code: "forbidden_field" };
    if (!(ACTION_STATUSES as readonly unknown[]).includes(b.status)) return { ok: false, code: "bad_status", field: "status" };
    return { ok: true, value: { kind: "status", status: b.status as ActionStatus } };
  }
  const allowed = ["title", "description", "due_date", "visible_to_member"];
  const extra = Object.keys(b).find((k) => !allowed.includes(k));
  if (extra) return { ok: false, code: "forbidden_field", field: extra };
  const out: { kind: "edit"; title?: string; description?: string; dueDate?: string | null; visibleToMember?: boolean } = { kind: "edit" };
  if ("title" in b) { const t = text(b.title, ACTION_TITLE_MAX, "bad_title", "title"); if (!t.ok) return t; if (t.value === "") return { ok: false, code: "bad_title", field: "title" }; out.title = t.value; }
  if ("description" in b) { const t = text(b.description, ACTION_DESCRIPTION_MAX, "bad_description", "description"); if (!t.ok) return t; out.description = t.value; }
  if ("due_date" in b) { const d = parseDueDate(b.due_date, todayIso); if (!d.ok) return d; out.dueDate = d.value; }
  if ("visible_to_member" in b) { if (typeof b.visible_to_member !== "boolean") return { ok: false, code: "bad_visibility", field: "visible_to_member" }; out.visibleToMember = b.visible_to_member; }
  if (Object.keys(out).length === 1) return { ok: false, code: "bad_input" };
  return { ok: true, value: out };
}

/** Membre : le champ `status` UNIQUEMENT (aucun autre champ n'est accepté). */
export function parseMemberActionPatch(body: unknown): Validation<ActionStatus> {
  const b = record(body);
  if (!b) return { ok: false, code: "bad_input" };
  if (Object.keys(b).some((k) => k !== "status")) return { ok: false, code: "forbidden_field" };
  if (!(ACTION_STATUSES as readonly unknown[]).includes(b.status)) return { ok: false, code: "bad_status", field: "status" };
  return { ok: true, value: b.status as ActionStatus };
}

/** Transitions du MEMBRE : todo→in_progress, todo→done, in_progress→done. Rien d'autre (jamais « cancelled »). */
export function canMemberTransition(from: ActionStatus, to: ActionStatus): boolean {
  return (from === "todo" && (to === "in_progress" || to === "done")) || (from === "in_progress" && to === "done");
}

/** Transitions du COACH sur ses propres actions : tout statut différent (réouverture comprise). */
export function canCoachTransition(from: ActionStatus, to: ActionStatus): boolean {
  return from !== to;
}

export const ACTION_ERROR_STATUS: Record<ContentErrorCode, number> = {
  bad_input: 400, bad_field: 400, too_long: 400, empty: 400, bad_title: 400, bad_summary: 400, bad_description: 400, bad_due_date: 400,
  bad_owner: 400, bad_status: 400, bad_visibility: 400, forbidden_field: 400, bad_session: 400, bad_member: 400,
};

/** Date du jour `YYYY-MM-DD` en UTC (échéances comparées sans dérive de fuseau côté serveur). */
export const todayIsoUtc = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 10);
