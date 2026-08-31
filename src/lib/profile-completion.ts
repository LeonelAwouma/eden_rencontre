/**
 * Profile completion utility.
 * Used by both backend (verify endpoint) and frontend (admin panel, badge display).
 *
 * A profile is considered "complete" when ALL required fields are filled.
 */

export interface ProfileCompletionResult {
  percentage: number;
  completed: number;
  total: number;
  missing: string[];
}

const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "avatar_url", label: "Photo de profil" },
  { key: "name", label: "Nom" },
  { key: "bio", label: "Bio" },
  { key: "city", label: "Ville" },
  { key: "profession", label: "Profession" },
  { key: "civil_status", label: "Situation familiale" },
  { key: "marriage_vision", label: "Vision du mariage" },
];

/**
 * Calculate profile completion percentage.
 * Works with a plain object (Supabase row or frontend state).
 */
export function getProfileCompletion(profile: Record<string, any>): ProfileCompletionResult {
  const missing: string[] = [];
  let completed = 0;

  for (const field of REQUIRED_FIELDS) {
    const value = profile[field.key];
    const isFilled =
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0);

    if (isFilled) {
      completed++;
    } else {
      missing.push(field.label);
    }
  }

  return {
    percentage: Math.round((completed / REQUIRED_FIELDS.length) * 100),
    completed,
    total: REQUIRED_FIELDS.length,
    missing,
  };
}

/**
 * Check if a profile is fully complete (100%).
 */
export function isProfileFullyComplete(profile: Record<string, any>): boolean {
  return getProfileCompletion(profile).percentage === 100;
}
