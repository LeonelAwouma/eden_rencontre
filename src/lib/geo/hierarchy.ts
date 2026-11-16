/** Hiérarchie administrative et validation du chaînage parent-enfant (appliquée côté serveur). */

export type AdminLevel = 0 | 1 | 2 | 3; // pays, région, département, arrondissement

export interface AdminUnit {
  id: string;
  code: string;
  level: AdminLevel;
  parentId: string | null;
  nameFr: string;
  nameEn: string | null;
}

export interface PlaceRef {
  id: string;
  adminUnitId: string | null; // arrondissement, null si non vérifié
}

export interface LocationSelection {
  countryCode: string;
  regionId?: string | null;
  departmentId?: string | null;
  arrondissementId?: string | null;
  placeId?: string | null;
}

export type HierarchyError =
  | "unknown_unit"
  | "wrong_level"
  | "department_not_in_region"
  | "arrondissement_not_in_department"
  | "place_not_in_arrondissement"
  | "missing_parent";

/**
 * Vérifie qu'une sélection est cohérente. Un niveau fourni exige tous ses parents (on ne « devine »
 * jamais un arrondissement). Renvoie la première erreur, ou null.
 */
export function validateSelection(
  sel: LocationSelection,
  units: ReadonlyMap<string, AdminUnit>,
  place?: PlaceRef | null,
): HierarchyError | null {
  const get = (id: string | null | undefined, level: AdminLevel): AdminUnit | HierarchyError | null => {
    if (!id) return null;
    const u = units.get(id);
    if (!u) return "unknown_unit";
    if (u.level !== level) return "wrong_level";
    return u;
  };
  const region = get(sel.regionId, 1);
  const dept = get(sel.departmentId, 2);
  const arr = get(sel.arrondissementId, 3);
  for (const x of [region, dept, arr]) if (typeof x === "string") return x;

  if (dept && !region) return "missing_parent";
  if (arr && !dept) return "missing_parent";
  if (region && dept && (dept as AdminUnit).parentId !== (region as AdminUnit).id)
    return "department_not_in_region";
  if (dept && arr && (arr as AdminUnit).parentId !== (dept as AdminUnit).id)
    return "arrondissement_not_in_department";

  if (sel.placeId) {
    if (!place || place.id !== sel.placeId) return "unknown_unit";
    // Lieu rattaché à un arrondissement : celui-ci doit correspondre à la sélection.
    if (place.adminUnitId) {
      if (!arr) return "missing_parent";
      if (place.adminUnitId !== (arr as AdminUnit).id) return "place_not_in_arrondissement";
    }
  }
  return null;
}

/** Chaîne d'ancêtres (de la région au niveau demandé) à partir d'une unité, pour remplir les champs. */
export function ancestorsOf(unitId: string, units: ReadonlyMap<string, AdminUnit>): AdminUnit[] {
  const chain: AdminUnit[] = [];
  let cur = units.get(unitId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? units.get(cur.parentId) : undefined;
  }
  return chain;
}
