/**
 * Logique pure du tableau de bord administrateur (aucune dépendance React),
 * pour que les libellés et les cas limites se vérifient par des tests.
 *
 * Règle d'or : ne jamais fabriquer un chiffre. Une donnée qui n'a pas pu être
 * lue vaut `null` (affichée « indisponible »), jamais 0.
 */

export interface AttentionItem {
  id: "pending-users" | "pending-reports";
  label: string;
  /** `null` : donnée indisponible (lecture en échec). */
  count: number | null;
  href: string;
  /** Précision réelle, ou `undefined` s'il n'y en a pas. */
  hint?: string;
}

export interface AttentionInput {
  pendingUsers: number;
  /** `null` quand `/api/admin/reports` n'a pas répondu. */
  reports: { pending: number; critical: number } | null;
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export function buildAttentionItems({ pendingUsers, reports }: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [
    {
      id: "pending-users",
      label: "Inscriptions à examiner",
      count: pendingUsers,
      href: "/admin/users?status=pending",
      hint: pendingUsers > 0 ? `${pendingUsers} ${plural(pendingUsers, "demande attend", "demandes attendent")} une décision` : undefined,
    },
    {
      id: "pending-reports",
      label: "Signalements en attente",
      count: reports ? reports.pending : null,
      href: "/admin/reports",
      hint: reports && reports.critical > 0
        ? `${reports.critical} ${plural(reports.critical, "signalement critique", "signalements critiques")} (tous statuts confondus)`
        : undefined,
    },
  ];
  return items;
}

/** Nombre d'éléments qui réclament réellement une intervention (les données indisponibles ne comptent pas). */
export function attentionTotal(items: ReadonlyArray<AttentionItem>): number {
  return items.reduce((sum, i) => sum + (i.count ?? 0), 0);
}

/**
 * Croissance sur 30 jours. Sans base de comparaison (`null`), aucun badge :
 * un 0 % ou un 100 % trompeur serait pire que l'absence d'indicateur.
 */
export function trendFrom(pct: number | null): { value: string; positive: boolean } | undefined {
  if (pct === null) return undefined;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return { value: `${sign}${Math.abs(pct)} % sur 30 j`, positive: pct >= 0 };
}

/** Part d'un sous-ensemble dans le total, arrondie ; 0 si le total est nul. */
export function shareOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
