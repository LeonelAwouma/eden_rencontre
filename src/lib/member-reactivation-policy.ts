/**
 * Règles PURES des rappels d'inactivité (testées sous vitest, sans base ni réseau).
 *
 * Inscription AUTOMATIQUE : tout membre approuvé et éligible reçoit les rappels. `member_reactivation_preferences`
 * est devenue une LISTE D'OPPOSITION : seule une ligne `email_opt_in = false` (désinscription par e-mail ou ancien choix)
 * exclut un membre ; l'absence de ligne ou `true` = inscrit.
 */

export const REACTIVATION_STEPS = [7, 21, 45] as const;
export type ReactivationStep = (typeof REACTIVATION_STEPS)[number];

export const DAY_MS = 86_400_000;
/** Au plus un e-mail de rappel par membre tous les 7 jours. */
export const MIN_GAP_MS = 7 * DAY_MS;
/** Prise en charge abandonnée (plantage entre le claim et l'envoi) : reprise possible après 1 h. */
export const STALE_CLAIM_MS = 60 * 60 * 1000;
/** Une nouvelle tentative après échec au plus une fois par jour. */
export const RETRY_AFTER_FAILURE_MS = 20 * 60 * 60 * 1000;
/** Au-delà, l'étape est abandonnée : une adresse défaillante ne bloque ni les autres membres ni les étapes suivantes. */
export const MAX_ATTEMPTS = 3;

export type SendStatus = "claimed" | "sent" | "failed";
export interface SendRow {
  user_id: string;
  inactive_since: string;
  step_days: number;
  status: SendStatus;
  claimed_at: string;
  sent_at: string | null;
  attempts: number | null;
}

/** Comptes techniques et adresses inutilisables : jamais de rappel. */
export function isUnusableEmail(email: string | null | undefined, systemEmail: string): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !e.includes("@")) return true;
  if (e === systemEmail.toLowerCase()) return true;
  return e.endsWith(".local") || e.endsWith(".invalid") || e.endsWith(".test") || e.endsWith("@example.com");
}

/** Jours entiers d'inactivité depuis la dernière VISITE réelle ; null si la date est absente ou invalide. */
export function inactiveDays(lastVisitIso: string | null | undefined, now: number): number | null {
  if (!lastVisitIso) return null; // l'inactivité n'est jamais déduite de la date d'inscription
  const t = Date.parse(lastVisitIso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

export type SendState = "done" | "in_progress" | "retryable" | "retry_later" | "abandoned";

export function classifySend(row: Pick<SendRow, "status" | "claimed_at" | "attempts">, now: number): SendState {
  if (row.status === "sent") return "done";
  const attempts = row.attempts ?? 1;
  const age = now - Date.parse(row.claimed_at);
  if (row.status === "claimed") {
    if (!(age >= STALE_CLAIM_MS)) return "in_progress";
    return attempts >= MAX_ATTEMPTS ? "abandoned" : "retryable";
  }
  if (attempts >= MAX_ATTEMPTS) return "abandoned";
  return age >= RETRY_AFTER_FAILURE_MS ? "retryable" : "retry_later";
}

export type NextAction = { step: ReactivationStep; mode: "new" } | { step: ReactivationStep; mode: "retry"; row: SendRow } | null;

/**
 * Prochain envoi pour CE cycle d'inactivité (`rows` = envois du même `inactive_since`) : le plus ancien palier atteint
 * qui n'est ni envoyé ni abandonné. Un palier en cours ou en attente de nouvelle tentative suspend la suite.
 */
export function nextAction(days: number, rows: SendRow[], now: number): NextAction {
  for (const step of REACTIVATION_STEPS) {
    if (days < step) return null;
    const row = rows.find((r) => r.step_days === step);
    if (!row) return { step, mode: "new" };
    const state = classifySend(row, now);
    if (state === "done" || state === "abandoned") continue;
    if (state === "retryable") return { step, mode: "retry", row };
    return null; // in_progress / retry_later
  }
  return null;
}

/** Même instant ? (formats de timestamp PostgREST différents selon la source). */
export const sameInstant = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && Date.parse(a) === Date.parse(b);

/** Dernier e-mail réellement envoyé il y a moins de 7 jours (tous cycles confondus) ? */
export function sentRecently(rows: SendRow[], now: number): boolean {
  return rows.some((r) => r.status === "sent" && !!r.sent_at && now - Date.parse(r.sent_at) < MIN_GAP_MS);
}
