/**
 * Utilitaires communs des routes du lot 3 (séances, notes, comptes rendus, actions).
 * Aucun contenu de note n'est jamais journalisé : les métadonnées d'audit ne portent que des identifiants et des statuts.
 */
import type { NextRequest } from "next/server";
import { coachJson } from "@/lib/coach/api";
import { writeCoachAudit } from "@/lib/coach/audit";
import { isUuid } from "@/lib/coach/assignment-errors";
import { SESSION_ERROR_STATUS, type SessionErrorCode } from "@/lib/coach/sessions-model";
import { ACTION_ERROR_STATUS, type ContentErrorCode } from "@/lib/coach/notes-model";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = ReturnType<typeof getSupabaseAdmin>;

export const COACH_WRITES_PER_HOUR = 120;

/** Limiteur d'écriture par coach (même limiteur que le reste du projet ; fail-open si la base du limiteur est indisponible). */
export async function allowCoachWrite(coachId: string): Promise<boolean> {
  const key = `coach-write:${coachId}`;
  if (!(await checkRateLimit(key, "coach_write", COACH_WRITES_PER_HOUR, 3600))) return false;
  await recordRateLimit(key, "coach_write");
  return true;
}

export const rateLimited = () => coachJson({ error: "Trop de modifications en peu de temps. Réessayez plus tard.", code: "rate_limited" }, 429);
export const notFound = () => coachJson({ error: "Introuvable", code: "not_found" }, 404);
export const badParams = () => coachJson({ error: "Paramètres invalides", code: "bad_input" }, 400);

/** Réponse d'erreur d'une validation de séance : code stable (l'interface le traduit) et, le cas échéant, les candidats. */
export function sessionFailure(code: SessionErrorCode, candidates?: [string, string]) {
  return coachJson({ error: "Requête refusée", code, ...(candidates ? { candidates } : {}) }, SESSION_ERROR_STATUS[code]);
}

export function contentFailure(code: ContentErrorCode, field?: string) {
  return coachJson({ error: "Requête refusée", code, ...(field ? { field } : {}) }, ACTION_ERROR_STATUS[code]);
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try { return await req.json(); } catch { return undefined; }
}

export function queryUuid(url: URL, key: string): { ok: true; value: string | null } | { ok: false } {
  const v = url.searchParams.get(key);
  if (v === null || v === "") return { ok: true, value: null };
  return isUuid(v) ? { ok: true, value: v } : { ok: false };
}

export function queryPage(url: URL): number {
  const n = Number(url.searchParams.get("page") ?? "1");
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

/** Pseudos des membres (colonnes minimales : jamais de nom réel, d'e-mail ni de téléphone). */
export async function memberPseudos(db: Db, ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const { data } = await db.from("profiles").select("id, pseudo").in("id", unique).eq("account_type", "member");
  for (const p of data || []) out.set(p.id as string, (p.pseudo as string | null) ?? null);
  return out;
}

/** Audit sans contenu : uniquement des identifiants, statuts et horodatages. */
export function auditCoach(db: Db, coachId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  return writeCoachAudit(db, { actorId: coachId, actorKind: "coach", action, targetType, targetId, metadata });
}
