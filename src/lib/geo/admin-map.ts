/**
 * Cartes administratives de répartition des membres — logique PURE (testée), partagée serveur / navigateur.
 *
 * Effectifs EXACTS : aucun seuil, aucun masquage (espace d'administration). Les classes de couleur ne sont
 * qu'un outil de lecture : la légende affiche exactement les intervalles utilisés pour colorer.
 */
import { parseMapQuery, type MapLevel } from "./zone-counts";

// ── Portée (filtre de statut) ─────────────────────────────────────────────────────────────────────────
export const ADMIN_MAP_SCOPES = {
  approved: ["approved"],
  all: ["approved", "pending", "suspended"],
} as const satisfies Record<string, readonly string[]>;
export type AdminMapScope = keyof typeof ADMIN_MAP_SCOPES;

export function parseScope(raw: unknown): AdminMapScope | null {
  if (raw === null || raw === undefined || raw === "") return "approved";
  return raw === "approved" || raw === "all" ? raw : null;
}

export function parseAdminMapQuery(level: unknown, parent: unknown, scope: unknown):
  { level: MapLevel; parent: string | null; scope: AdminMapScope } | null {
  const q = parseMapQuery(level, parent);
  const s = parseScope(scope);
  return q && s ? { ...q, scope: s } : null;
}

// ── Réponses (contrat route ↔ interface) ──────────────────────────────────────────────────────────────
export interface MemberSummary {
  total: number;
  noLocation: number;
  cameroon: number;
  cameroonWithRegion: number;
  cameroonWithoutRegion: number;
  /** Membres localisés hors Cameroun avec un code pays ISO valide. */
  abroad: number;
  /** Localisation enregistrée mais code pays inconnu (ZZ, faute…) : jamais attribuée à un pays. */
  undetermined: number;
}

export interface CameroonMapResponse {
  level: MapLevel;
  parent: string | null;
  scope: AdminMapScope;
  counts: Array<{ unitId: string; count: number }>;
  /** Membres du périmètre sans rattachement au niveau consulté. */
  unattached: number;
  /** Membres rattachés à une unité qui n'appartient pas au parent consulté (incohérence de données). */
  inconsistent: number;
  summary: MemberSummary;
}

export interface CountryStat { code: string; name: string; count: number; withCity: number }

export interface InternationalMapResponse {
  scope: AdminMapScope;
  countries: CountryStat[];
  indicators: {
    abroad: number;
    countriesRepresented: number;
    top: CountryStat | null;
    abroadWithoutCity: number;
  };
  /** Codes non reconnus et leur effectif (affichés à part, jamais placés sur la carte). */
  undetermined: Array<{ code: string; count: number }>;
  summary: MemberSummary;
}

// ── Couleurs et légende ───────────────────────────────────────────────────────────────────────────────
export const MAP_COLORS = {
  zero: "#EEF5EC",
  noData: "#FAF8F5",
  selected: "#234B36",
  scale: ["#C6D4C0", "#8FB088", "#486B46", "#234B36"],
} as const;

export interface ColorClass { min: number; max: number; color: string }

/**
 * Classes de couleur pour les effectifs POSITIFS : au plus 4, bornes entières contiguës de 1 au maximum
 * (quartiles arrondis). Aucune valeur positive n'est exclue : la dernière classe se termine au maximum.
 */
export function classBreaks(values: Iterable<number>): ColorClass[] {
  const pos = [...values].filter((v) => Number.isFinite(v) && v > 0).map(Math.floor).sort((a, b) => a - b);
  if (pos.length === 0) return [];
  const max = pos[pos.length - 1];
  const uppers: number[] = [];
  if (max <= 4) {
    for (const v of new Set(pos)) uppers.push(v);
  } else {
    for (const q of [0.25, 0.5, 0.75]) {
      const v = pos[Math.min(pos.length - 1, Math.floor(q * (pos.length - 1)))];
      if (v < max && (uppers.length === 0 || v > uppers[uppers.length - 1])) uppers.push(v);
    }
    uppers.push(max);
  }
  // pas plus de 4 classes ; les couleurs les plus foncées vont aux plus grands effectifs
  const bounds = uppers.slice(-4);
  const colors = MAP_COLORS.scale.slice(MAP_COLORS.scale.length - bounds.length);
  let prev = 0;
  return bounds.map((upper, i) => {
    const cls = { min: i === 0 ? 1 : prev + 1, max: upper, color: colors[i] };
    prev = upper;
    return cls;
  });
}

/** Couleur d'un effectif : `null` = pas de données, 0 = aucun membre, sinon la classe qui le contient. */
export function colorFor(count: number | null | undefined, classes: ColorClass[]): string {
  if (count === null || count === undefined) return MAP_COLORS.noData;
  if (count <= 0) return MAP_COLORS.zero;
  const c = classes.find((k) => count >= k.min && count <= k.max) ?? classes[classes.length - 1];
  return c ? c.color : MAP_COLORS.scale[0];
}

export interface LegendItem { label: string; color: string; kind: "zero" | "class" | "noData" }

/** Légende = exactement les classes utilisées par `colorFor` (+ zéro, + pas de données si demandé). */
export function legendFor(classes: ColorClass[], opts: { noData?: boolean } = {}): LegendItem[] {
  const items: LegendItem[] = [{ label: "0", color: MAP_COLORS.zero, kind: "zero" }];
  for (const c of classes) items.push({ label: c.min === c.max ? `${c.min}` : `${c.min} – ${c.max}`, color: c.color, kind: "class" });
  if (opts.noData) items.push({ label: "Pas de données", color: MAP_COLORS.noData, kind: "noData" });
  return items;
}

/** Codes pays avec membres mais sans géométrie dans le fond de frontières (à lister, jamais supprimés). */
export function countriesWithoutGeometry(featureCodes: Iterable<string>, countries: CountryStat[]): CountryStat[] {
  const have = new Set(featureCodes);
  return countries.filter((c) => c.count > 0 && !have.has(c.code));
}

export function membersLabel(n: number): string {
  return `${n.toLocaleString("fr-FR")} membre${n > 1 ? "s" : ""}`;
}
