import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = ReturnType<typeof getSupabaseAdmin>;

export type CoachActorKind = "admin" | "coach" | "member" | "system";

/** Clés qui ne doivent JAMAIS entrer dans le journal (contenu de notes, secrets). */
const FORBIDDEN_KEY = /(content|note|notes|body|observation|password|passwd|token|secret|key|authorization)/i;

/** Ne garde que des informations opérationnelles : identifiants, compteurs, codes courts. */
export function sanitizeAuditMetadata(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (FORBIDDEN_KEY.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}

export interface CoachAuditEntry {
  actorId: string | null;
  actorKind: CoachActorKind;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Écrit dans coach_audit_logs. Ne bloque jamais l'opération métier. Renvoie true si l'écriture a réussi. */
export async function writeCoachAudit(db: Db, entry: CoachAuditEntry): Promise<boolean> {
  try {
    const { error } = await db.from("coach_audit_logs").insert({
      actor_id: entry.actorId,
      actor_kind: entry.actorKind,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      metadata: sanitizeAuditMetadata(entry.metadata),
    });
    return !error;
  } catch {
    return false;
  }
}
