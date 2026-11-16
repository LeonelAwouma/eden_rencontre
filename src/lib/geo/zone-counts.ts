/**
 * Comptes par zone — logique PURE (testée). Les comptes bruts viennent de la base vers le SERVEUR seulement ;
 * `maskCounts` est appliqué avant toute réponse au navigateur.
 */

/** En dessous de ce nombre de membres, le compte d'une zone n'est jamais communiqué. */
export const COUNT_THRESHOLD = 5;

export interface RawZoneCount {
  unit_id: string;
  member_count: number;
}

/** `count: null` = « moins de 5 » (0 à 4 indistinguables). */
export interface ZoneCount {
  unitId: string;
  count: number | null;
}

/**
 * Seuil + suppression complémentaire.
 * Si une seule zone est masquée parmi des zones visibles, on pourrait la retrouver par différence avec le total de
 * la zone parente (déjà affiché au niveau précédent) : on masque alors AUSSI la plus petite zone visible, de sorte
 * que la différence ne porte plus que sur une somme d'au moins `threshold` membres.
 */
export function maskCounts(rows: RawZoneCount[], threshold: number = COUNT_THRESHOLD): ZoneCount[] {
  const out: ZoneCount[] = rows.map((r) => ({
    unitId: r.unit_id,
    count: Number.isFinite(r.member_count) && r.member_count >= threshold ? Math.floor(r.member_count) : null,
  }));
  const hidden = out.filter((c) => c.count === null);
  const visible = out.filter((c) => c.count !== null);
  if (hidden.length === 1 && visible.length > 0) {
    const smallest = [...visible].sort((a, b) => (a.count! - b.count!) || a.unitId.localeCompare(b.unitId))[0];
    smallest.count = null;
  }
  return out;
}

export type MapLevel = 1 | 2 | 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valide `level` et `parent` : le niveau 1 n'a pas de parent ; 2 et 3 en exigent un. */
export function parseMapQuery(level: unknown, parent: unknown): { level: MapLevel; parent: string | null } | null {
  const n = typeof level === "string" || typeof level === "number" ? Number(level) : NaN;
  if (n !== 1 && n !== 2 && n !== 3) return null;
  const p = typeof parent === "string" && parent !== "" ? parent : null;
  if (n === 1) return p === null ? { level: 1, parent: null } : null;
  if (p === null || !UUID.test(p)) return null;
  return { level: n, parent: p };
}

/** Palette de remplissage selon le compte (vert Eden, du clair au foncé) ; `null` = masqué. */
export function fillForCount(count: number | null): string {
  if (count === null) return "#EEF5EC";
  if (count < 10) return "#C6D4C0";
  if (count < 25) return "#9DB896";
  if (count < 60) return "#6F9468";
  return "#486B46";
}
