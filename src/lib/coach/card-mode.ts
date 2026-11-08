/**
 * Logique PURE de la carte « accompagnement » de l'accueil membre (testée sous vitest, sans DOM).
 * Contrat réel du lot 1 : `GET /api/member/coach` → `{ current, history }` ;
 * `POST /api/member/coach/consent` → `{ assignment_id, accept }` ; `POST …/stop` → `{ assignment_id, reason? }`.
 * Aucun identifiant de membre n'est jamais envoyé : l'identité vient de la session côté serveur.
 */

export interface CardAssignment {
  id: string;
  status: string;
  consentStatus: string;
  coachName: string | null;
  assignedAt: string;
  consentAt: string | null;
}

export type CoachCardMode = "none" | "proposal" | "active";

/**
 * Quelle carte afficher ? Seuls deux états cohérents existent : proposition en attente (pending + pending)
 * et suivi actif (active + accepted). Toute autre combinaison (terminée, refusée, incohérente) → rien.
 */
export function coachCardMode(current: CardAssignment | null | undefined): CoachCardMode {
  if (!current) return "none";
  if (current.status === "pending" && current.consentStatus === "pending") return "proposal";
  if (current.status === "active" && current.consentStatus === "accepted") return "active";
  return "none";
}

/** Corps de `POST /api/member/coach/consent` : exactement `assignment_id` et `accept`. */
export function buildConsentPayload(assignmentId: string, accept: boolean): { assignment_id: string; accept: boolean } {
  return { assignment_id: assignmentId, accept };
}

/** Corps de `POST /api/member/coach/stop` : `assignment_id` et une raison optionnelle. */
export function buildStopPayload(assignmentId: string, reason?: string): { assignment_id: string; reason?: string } {
  return reason ? { assignment_id: assignmentId, reason } : { assignment_id: assignmentId };
}

/** Nom d'affichage du coach (identité minimale), ou null pour utiliser le libellé de repli traduit. */
export function coachDisplayName(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed : null;
}

export type ActionOutcome = "success" | "stale" | "error";

/**
 * Issue d'une action selon la réponse du SERVEUR : succès uniquement si la réponse est OK ET porte l'état attendu.
 * 404 (autre membre / dossier disparu) et 409 (déjà traité, coach inactif…) → « stale » : on recharge l'état.
 */
export function actionOutcome(httpStatus: number, body: unknown, expectedStatus: string | readonly string[]): ActionOutcome {
  if (httpStatus === 404 || httpStatus === 409) return "stale";
  if (httpStatus >= 200 && httpStatus < 300) {
    const status = body && typeof body === "object" ? (body as { status?: unknown }).status : undefined;
    const expected = typeof expectedStatus === "string" ? [expectedStatus] : expectedStatus;
    return typeof status === "string" && expected.includes(status) ? "success" : "error";
  }
  return "error";
}
