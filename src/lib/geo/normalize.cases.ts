/**
 * Cas de conformité de la normalisation des noms de lieux, partagés par le test TypeScript (normalize.test.ts) et
 * le contrôle SQL (scripts/geo/check-normalize.sql, à rejouer sur la base réelle : son dictionnaire unaccent peut
 * différer). Format : [saisie, résultat attendu].
 */
export const NORMALIZE_CASES: ReadonlyArray<readonly [string, string]> = [
  ["Yaoundé", "yaounde"],
  ["YAOUNDE", "yaounde"],
  ["  Yaoundé  ", "yaounde"],
  ["Yaoundé\u00a0Centre", "yaounde centre"],
  ["Yaoundé\u202fCentre", "yaounde centre"],
  ["N’Gaoundéré", "n'gaoundere"],
  ["N`Gaoundéré", "n'gaoundere"],
  ["Extrême-Nord", "extreme nord"],
  ["Bafoussam / Mifi", "bafoussam mifi"],
  ["Ébolowa", "ebolowa"],
  ["Cœur", "coeur"],
  ["Æther", "aether"],
];
