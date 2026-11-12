// Enregistrement du questionnaire côté SERVEUR (sauvegarde automatique et validation finale).
// Un seul chemin d'écriture : validation des réponses synchronisées, colonnes historiques de `profiles`
// tenues à jour, archives des anciennes réponses préservées (src/lib/onboarding-legacy.ts).

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { planQuestionnaireSave, validateSyncedAnswers, type LegacyColumns, type SyncedAnswerError } from "@/lib/onboarding-legacy";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Un questionnaire complet pèse quelques dizaines de Ko ; au-delà, la requête n'est pas un questionnaire. */
export const QUESTIONNAIRE_MAX_BYTES = 200_000;

export type SaveFailure =
  | { ok: false; status: 400; code: "bad_answers" | SyncedAnswerError; field?: string }
  | { ok: false; status: 404; code: "profile_not_found" }
  | { ok: false; status: 413; code: "answers_too_large" }
  | { ok: false; status: 500; code: "read_failed" | "save_failed" };

export interface SaveSuccess {
  ok: true;
  /** Questionnaire tel qu'enregistré (archives comprises). */
  questionnaire: Record<string, unknown>;
  /** Colonnes historiques après l'enregistrement : sert au calcul de complétion sans relire la base. */
  legacy: LegacyColumns;
}

/** Corps `{ answers }` → objet de réponses, ou null s'il n'a pas la forme attendue. */
export function parseAnswersBody(body: unknown): Record<string, unknown> | null {
  const answers = (body as { answers?: unknown } | null)?.answers;
  return answers && typeof answers === "object" && !Array.isArray(answers) ? (answers as Record<string, unknown>) : null;
}

const isMissingColumn = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "42703" || error.code === "PGRST204" || /discovery_source/i.test(error.message ?? ""));

/**
 * Enregistre les réponses de `userId` (identité issue du jeton, jamais du corps de la requête).
 * `complete` pose en plus `onboarding_completed` ; la sauvegarde automatique ne le touche jamais.
 */
export async function persistQuestionnaire(
  db: Db,
  userId: string,
  answers: Record<string, unknown>,
  opts: { complete: boolean }
): Promise<SaveSuccess | SaveFailure> {
  let size = 0;
  try { size = JSON.stringify(answers).length; } catch { return { ok: false, status: 400, code: "bad_answers" }; }
  if (size > QUESTIONNAIRE_MAX_BYTES) return { ok: false, status: 413, code: "answers_too_large" };

  const valid = validateSyncedAnswers(answers);
  if (!valid.ok) return { ok: false, status: 400, code: valid.code, field: valid.field };

  // Ligne actuelle : indispensable pour ne rien écraser (colonnes) et ne rien perdre (archives).
  let hasDiscoveryColumn = true;
  let read = await db.from("profiles").select("id, questionnaire, marriage_vision, discovery_source").eq("id", userId).maybeSingle();
  if (read.error && isMissingColumn(read.error)) {
    // Ancienne base sans la colonne facultative : on continue sans elle, comme /api/auth/register.
    hasDiscoveryColumn = false;
    read = await db.from("profiles").select("id, questionnaire, marriage_vision").eq("id", userId).maybeSingle();
  }
  if (read.error) return { ok: false, status: 500, code: "read_failed" };
  if (!read.data) return { ok: false, status: 404, code: "profile_not_found" };
  const current = read.data as { questionnaire?: unknown; marriage_vision?: unknown; discovery_source?: unknown };

  const plan = planQuestionnaireSave(answers, current);
  const columns: Record<string, unknown> = {};
  if (plan.columns.marriage_vision) columns.marriage_vision = plan.columns.marriage_vision;
  if (plan.columns.discovery_source && hasDiscoveryColumn) columns.discovery_source = plan.columns.discovery_source;

  const patch: Record<string, unknown> = {
    questionnaire: plan.questionnaire,
    updated_at: new Date().toISOString(),
    ...(opts.complete ? { onboarding_completed: true } : {}),
    ...columns,
  };
  let write = await db.from("profiles").update(patch).eq("id", userId);
  if (write.error && "discovery_source" in patch && isMissingColumn(write.error)) {
    delete patch.discovery_source;
    delete columns.discovery_source;
    write = await db.from("profiles").update(patch).eq("id", userId);
  }
  if (write.error) return { ok: false, status: 500, code: "save_failed" };

  return {
    ok: true,
    questionnaire: plan.questionnaire,
    legacy: {
      marriage_vision: columns.marriage_vision ?? current.marriage_vision ?? null,
      discovery_source: columns.discovery_source ?? current.discovery_source ?? null,
    },
  };
}

const MESSAGES: Record<SaveFailure["code"], string> = {
  bad_answers: "Réponses invalides.",
  marriage_vision_invalid: "La vision du mariage contient une valeur non reconnue.",
  marriage_vision_too_many: "Choisissez au maximum 3 valeurs pour votre vision du mariage.",
  discovery_source_invalid: "La source de découverte choisie n'est pas reconnue.",
  profile_not_found: "Utilisateur introuvable.",
  answers_too_large: "Réponses trop volumineuses.",
  read_failed: "Enregistrement impossible. Réessayez.",
  save_failed: "Enregistrement impossible. Réessayez.",
};

export const saveFailureMessage = (failure: SaveFailure) => MESSAGES[failure.code];
