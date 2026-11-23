/**
 * Résolution d'un nom de ville en localité du référentiel — règle de décision PURE (sans base).
 *
 * Les candidats viennent de `public.geo_resolve_city` : correspondance EXACTE (nom officiel ou alias, après
 * normalisation commune), une ligne par localité, `total_count` = nombre de localités avant le plafond de 50.
 * On ne devine jamais : la population ne sert pas à trancher, et toute ambiguïté laisse la ville en texte libre.
 */
export interface CityCandidate {
  place_id: string;
  match_kind: "canonical" | "alias";
  place_type: string | null;
  total_count: number;
}

export type CityResolution =
  | { kind: "resolved"; placeId: string }
  | { kind: "ambiguous" }
  | { kind: "none" };

export const RESOLVE_CAP = 50;

export function resolvePlaceFromCandidates(candidates: readonly CityCandidate[] | null | undefined): CityResolution {
  const list = candidates ?? [];
  if (list.length === 0) return { kind: "none" };
  // Plafond dépassé : on ne sait pas ce qu'il y a au-delà, donc jamais de choix.
  const total = Math.max(list.length, ...list.map((c) => Number(c.total_count) || 0));
  if (total > RESOLVE_CAP) return { kind: "ambiguous" };

  const ids = [...new Set(list.map((c) => c.place_id))];
  if (ids.length === 1) return { kind: "resolved", placeId: ids[0] };

  const cities = [...new Set(list.filter((c) => c.place_type === "city").map((c) => c.place_id))];
  if (cities.length === 1) return { kind: "resolved", placeId: cities[0] };
  return { kind: "ambiguous" };
}
