/** Normalisation de noms de lieux : accents, casse, tirets, apostrophes (« Yaoundé » ≡ « yaounde »). */
export function normalizePlaceName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
