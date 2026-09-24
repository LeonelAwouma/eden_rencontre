/**
 * Avertissements affichés à l'admin quand l'action sur un compte a réussi mais
 * que l'e-mail au membre n'est pas parti (SMTP indisponible, adresse invalide…).
 */
export type AccountAction = "approve" | "reject" | "suspend";

export const EMAIL_NOT_SENT: Record<AccountAction, string> = {
  approve: "Compte approuvé, mais l'e-mail de confirmation n'a pas pu être envoyé. Prévenez le membre directement.",
  reject: "Inscription refusée, mais l'e-mail n'a pas pu être envoyé. Prévenez la personne directement.",
  suspend: "Compte suspendu, mais l'e-mail n'a pas pu être envoyé. Prévenez le membre directement.",
};
