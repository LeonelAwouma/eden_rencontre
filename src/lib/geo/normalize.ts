/**
 * Normalisation de noms de lieux : accents, casse, tirets, apostrophes (« Yaoundé » ≡ « yaounde »).
 *
 * Convention COMMUNE : même règle que `public.geo_normalize_name` (SQL, migration 20261123_geo_resolve_city.sql)
 * et que `norm` de scripts/geo/import-cameroon.mjs. Les cas de conformité sont dans `normalize.cases.ts`, rejoués en
 * SQL par scripts/geo/check-normalize.sql : toute modification ici doit être faite aux trois endroits.
 */
export function normalizePlaceName(s: string): string {
  return s
    .replace(/[\u00a0\u202f]/g, " ") // espaces insécables
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .replace(/æ/g, "ae").replace(/Æ/g, "AE") // ligatures, comme le dictionnaire unaccent
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`´]/g, "'")
    .replace(/[-_.,/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vrai si `query` (≥ 2 caractères) est un préfixe d'un mot du nom ou du nom entier, après normalisation. */
export function placeMatches(query: string, names: readonly string[]): boolean {
  const q = normalizePlaceName(query);
  if (q.length < 2) return false;
  return names.some((n) => {
    const nn = normalizePlaceName(n);
    return nn.startsWith(q) || nn.split(" ").some((w) => w.startsWith(q)) || nn.includes(q);
  });
}
