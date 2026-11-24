/**
 * Suggestions du champ ville — logique PURE (testée sans navigateur).
 *
 * La valeur tapée EST la ville : une suggestion ne sert qu'à corriger l'orthographe et, si le nom est unique dans le
 * référentiel, à transmettre son identifiant. Sans clic, le serveur retrouve la ville à partir du nom
 * (saveMemberLocation → geo_resolve_city).
 */
import { normalizePlaceName } from "./normalize";

export interface PlaceHit {
  id: string;
  name: string;
}

export interface CitySuggestion {
  name: string;
  /** Identifiant transmis seulement si le nom est unique ; sinon c'est le serveur qui décide. */
  placeId: string | null;
}

/** Longueur minimale d'une ville saisie (après suppression des espaces autour). */
export const MIN_CITY_LENGTH = 2;

export const isCityFilled = (city: string | null | undefined): boolean => (city ?? "").trim().length >= MIN_CITY_LENGTH;

/** Un seul nom par ville : plusieurs localités au même nom deviennent une entrée sans identifiant. */
export function groupHitsByName(hits: readonly PlaceHit[]): CitySuggestion[] {
  const groups = new Map<string, { name: string; ids: Set<string> }>();
  for (const h of hits) {
    const key = normalizePlaceName(h.name);
    const g = groups.get(key) ?? { name: h.name, ids: new Set<string>() };
    g.ids.add(h.id);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ name: g.name, placeId: g.ids.size === 1 ? [...g.ids][0] : null }));
}

/** Suggestions à afficher : rien quand la saisie correspond déjà exactement à l'unique suggestion. */
export function visibleSuggestions(typed: string, suggestions: readonly CitySuggestion[], max = 8): CitySuggestion[] {
  const t = normalizePlaceName(typed);
  if (t.length < MIN_CITY_LENGTH) return [];
  const list = suggestions.slice(0, max);
  if (list.length === 1 && normalizePlaceName(list[0].name) === t) return [];
  return list;
}
