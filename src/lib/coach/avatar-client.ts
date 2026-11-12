/**
 * Côté navigateur de la photo du coach : contrôle de confort avant l'envoi et traduction des codes d'erreur.
 * Rien ici n'est une protection — le serveur revérifie le type réel (signature binaire) et la taille.
 * Module sans dépendance serveur (aucun import du client d'administration).
 */

/** Même limite que `COACH_AVATAR_MAX_BYTES` côté serveur (vérifié par un test). */
export const AVATAR_MAX_BYTES_CLIENT = 3 * 1024 * 1024;
export const AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AvatarClientProblem = "avatar_too_large" | "avatar_invalid_type" | "avatar_missing";

export function precheckAvatarFile(file: { size: number; type: string }): AvatarClientProblem | null {
  if (!file.size) return "avatar_missing";
  if (file.size > AVATAR_MAX_BYTES_CLIENT) return "avatar_too_large";
  if (!(AVATAR_ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "avatar_invalid_type";
  return null;
}

const ERROR_KEYS: Record<string, string> = {
  avatar_too_large: "coachProfile.photoErrors.tooLarge",
  avatar_invalid_type: "coachProfile.photoErrors.invalidType",
  avatar_missing: "coachProfile.photoErrors.missing",
  avatar_upload_failed: "coachProfile.photoErrors.uploadFailed",
  avatar_save_failed: "coachProfile.photoErrors.saveFailed",
  rate_limited: "coachProfile.photoErrors.rateLimited",
};

/** Clé de traduction d'un échec (code stable de l'API, sinon statut HTTP ; 0 = réseau). Jamais de message technique. */
export function avatarErrorKey(code: string | undefined, status?: number): string {
  if (code && ERROR_KEYS[code]) return ERROR_KEYS[code];
  if (status === 413) return ERROR_KEYS.avatar_too_large;
  if (status === 429) return ERROR_KEYS.rate_limited;
  if (status === 0) return "coachProfile.photoErrors.network";
  if (status === 401 || status === 403) return "coachProfile.photoErrors.denied";
  return "coachProfile.photoErrors.generic";
}

export const AVATAR_ERROR_KEYS: readonly string[] = [
  ...Object.values(ERROR_KEYS),
  "coachProfile.photoErrors.network", "coachProfile.photoErrors.denied", "coachProfile.photoErrors.generic",
];
