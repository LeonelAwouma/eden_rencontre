/** Extrait de register/page.tsx pour être réutilisable par le flux classique et Google. */
export function getPasswordStrength(password: string, t: (key: string) => string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const normalizedScore = Math.min(4, Math.max(1, score));
  const levels = [
    { label: t("resetPassword.strengthVeryWeak"), color: "#dc3545" },
    { label: t("resetPassword.strengthWeak"), color: "#fd7e14" },
    { label: t("resetPassword.strengthMedium"), color: "#ffc107" },
    { label: t("resetPassword.strengthStrong"), color: "#28a745" },
    { label: t("resetPassword.strengthVeryStrong"), color: "#2D5016" },
  ];
  return { score: normalizedScore, label: levels[normalizedScore].label, color: levels[normalizedScore].color };
}
