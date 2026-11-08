/**
 * Traduit les erreurs des fonctions SQL d'attribution en réponses HTTP.
 * Les fonctions lèvent des codes courts (coach_not_active, assignment_not_found…).
 * Une violation de l'index unique partiel (course entre deux attributions) donne 23505 → 409.
 */
export interface DbErrorLike { message?: string; code?: string }

export interface HttpFailure { status: number; code: string; message: string }

const BY_CODE: Record<string, HttpFailure> = {
  coach_not_active: { status: 409, code: "coach_not_active", message: "Ce coach n'est pas actif." },
  member_not_eligible: { status: 409, code: "member_not_eligible", message: "Ce membre ne peut pas être attribué (profil non approuvé ou compte non membre)." },
  self_assignment: { status: 400, code: "self_assignment", message: "Un compte ne peut pas être attribué à lui-même." },
  assignment_not_found: { status: 404, code: "not_found", message: "Attribution introuvable." },
  invalid_state: { status: 409, code: "invalid_state", message: "Cette attribution n'est plus dans un état qui permet cette action." },
  coach_not_found: { status: 404, code: "not_found", message: "Coach introuvable." },
  not_a_coach: { status: 409, code: "not_a_coach", message: "Ce compte n'est pas un coach." },
  invalid_actor: { status: 400, code: "invalid_request", message: "Requête invalide." },
};

export function mapAssignmentError(error: DbErrorLike | null | undefined): HttpFailure {
  if (error?.code === "23505") {
    return { status: 409, code: "already_open", message: "Ce membre a déjà un accompagnement en attente ou actif." };
  }
  if (error?.code === "23514") {
    return { status: 409, code: "invalid_state", message: "Transition d'état refusée." };
  }
  const msg = error?.message ?? "";
  for (const key of Object.keys(BY_CODE)) if (msg.includes(key)) return BY_CODE[key];
  return { status: 500, code: "internal", message: "Opération impossible pour le moment." };
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
