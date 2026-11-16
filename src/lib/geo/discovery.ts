/**
 * Découverte géographique — logique PURE (testée sans réseau ni base).
 *
 * La géographie ne sert qu'à FILTRER et CLASSER des profils déjà compatibles : rien ici ne touche au score
 * de compatibilité. Les données brutes (distance, noms de zones) ne sortent du serveur qu'après
 * `toPublicCandidate`, qui applique le niveau d'affichage choisi par chaque membre.
 */
import { COUNTRIES } from "@/lib/geo";
import type { DisplayLevel } from "./public-label";

// ── Portées ──────────────────────────────────────────────────────────────────
export const GEO_SCOPES = [
  "none", "city", "arrondissement", "department", "region",
  "radius25", "radius50", "radius100", "radius250", "country",
] as const;
export type GeoScope = (typeof GEO_SCOPES)[number];

export interface ParsedScope {
  /** Valeur envoyée à la fonction SQL. */
  sqlScope: "city" | "arrondissement" | "department" | "region" | "country" | "radius";
  radiusKm: number | null;
}

/** Portée du navigateur → paramètres SQL. « none » (aucune restriction) n'appelle jamais la base. */
export function parseScope(raw: unknown): ParsedScope | null {
  if (typeof raw !== "string") return null;
  const m = /^radius(25|50|100|250)$/.exec(raw);
  if (m) return { sqlScope: "radius", radiusKm: Number(m[1]) };
  if (raw === "city" || raw === "arrondissement" || raw === "department" || raw === "region" || raw === "country") {
    return { sqlScope: raw, radiusKm: null };
  }
  return null;
}

/** Zone du demandeur nécessaire pour appliquer cette portée. */
export function viewerNeeds(scope: ParsedScope["sqlScope"]): "place" | "arrondissement" | "department" | "region" | "country" {
  switch (scope) {
    case "city": case "radius": return "place";
    default: return scope;
  }
}

// ── Catégories de distance (jamais de valeur précise) ────────────────────────
export const DISTANCE_BANDS = ["same_city", "lt25", "25_50", "50_100", "100_250", "gt250"] as const;
export type DistanceBand = (typeof DISTANCE_BANDS)[number];
export const BAND_RANK: Record<DistanceBand, number> = {
  same_city: 0, lt25: 1, "25_50": 2, "50_100": 3, "100_250": 4, gt250: 5,
};

export function distanceBand(distanceM: number | null | undefined, samePlace: boolean): DistanceBand | null {
  if (samePlace) return "same_city";
  if (distanceM == null || !Number.isFinite(distanceM) || distanceM < 0) return null;
  const km = distanceM / 1000;
  if (km < 25) return "lt25";
  if (km < 50) return "25_50";
  if (km < 100) return "50_100";
  if (km < 250) return "100_250";
  return "gt250";
}

// ── Expurgation : ce qui peut quitter le serveur ─────────────────────────────
export interface RawCandidate {
  user_id: string;
  category: "in_scope" | "unlocated";
  display_level: DisplayLevel | null;
  country_code: string | null;
  same_place: boolean;
  distance_m: number | null;
  region_name: string | null;
  department_name: string | null;
  arrondissement_name: string | null;
  city_name: string | null;
}

export interface PublicCandidate {
  userId: string;
  category: "in_scope" | "unlocated";
  /** Catégorie de distance approximative, ou null (non autorisée / non calculable). */
  proximityBand: DistanceBand | null;
  /** Localisation que le membre accepte de montrer, ou null. */
  locationLabel: string | null;
}

/** Niveaux d'affichage qui autorisent une catégorie de distance (assez précis pour ne rien révéler de plus). */
const BAND_ALLOWED: ReadonlySet<DisplayLevel> = new Set(["department", "arrondissement", "city"]);

const countryName = (code: string | null) =>
  code ? COUNTRIES.find((c) => c.iso === code.toUpperCase())?.name ?? null : null;

export function toPublicCandidate(raw: RawCandidate): PublicCandidate {
  const out: PublicCandidate = { userId: raw.user_id, category: raw.category, proximityBand: null, locationLabel: null };
  // Non localisé : jamais de ville, de zone ni de distance.
  if (raw.category !== "in_scope") return out;

  const level = raw.display_level ?? "none";
  switch (level) {
    case "country": out.locationLabel = countryName(raw.country_code); break;
    case "region": out.locationLabel = raw.region_name; break;
    case "department": out.locationLabel = raw.department_name; break;
    case "arrondissement": out.locationLabel = raw.arrondissement_name; break;
    case "city": out.locationLabel = raw.city_name; break;
    default: out.locationLabel = null; // « none » : rien du tout
  }
  if (BAND_ALLOWED.has(level)) out.proximityBand = distanceBand(raw.distance_m, raw.same_place);
  return out;
}

// ── Classement côté navigateur (APRÈS le calcul de compatibilité) ────────────
export type GeoSort = "compat" | "proximity";

/**
 * `ranked` est DÉJÀ classé par compatibilité décroissante (filterAndRankByReciprocalMatch) : on ne modifie ni
 * les scores ni l'ensemble des profils. Les profils localisés passent avant les non localisés ; en mode
 * « proximité », tri STABLE par catégorie de distance (ex æquo : l'ordre de compatibilité est conservé ;
 * catégorie inconnue en dernier). Ne renvoie que des profils présents dans `meta`.
 */
export function orderForDiscover<T extends { id: string }>(
  ranked: readonly T[],
  meta: ReadonlyMap<string, PublicCandidate>,
  sort: GeoSort,
): { located: T[]; unlocated: T[] } {
  const located: T[] = [];
  const unlocated: T[] = [];
  for (const m of ranked) {
    const c = meta.get(m.id);
    if (!c) continue;
    (c.category === "in_scope" ? located : unlocated).push(m);
  }
  if (sort === "proximity") {
    const rank = (m: T) => {
      const b = meta.get(m.id)?.proximityBand;
      return b ? BAND_RANK[b] : DISTANCE_BANDS.length;
    };
    const idx = new Map(located.map((m, i) => [m.id, i]));
    located.sort((a, b) => rank(a) - rank(b) || (idx.get(a.id)! - idx.get(b.id)!));
  }
  return { located, unlocated };
}

// ── Pagination côté navigateur ───────────────────────────────────────────────
export interface CandidatePage {
  candidates: PublicCandidate[];
  nextOffset: number | null;
}

/**
 * Charge les pages jusqu'à épuisement ou plafond. `truncated` = il restait des résultats : l'interface
 * le dit au lieu de masquer silencieusement des profils compatibles.
 */
export async function collectPages(
  fetchPage: (offset: number) => Promise<CandidatePage>,
  maxItems = 1000,
): Promise<{ candidates: PublicCandidate[]; truncated: boolean }> {
  const all: PublicCandidate[] = [];
  let offset: number | null = 0;
  let guard = 0;
  while (offset !== null && all.length < maxItems && guard++ < 50) {
    const page: CandidatePage = await fetchPage(offset);
    all.push(...page.candidates);
    offset = page.nextOffset;
  }
  return { candidates: all.slice(0, maxItems), truncated: offset !== null || all.length > maxItems };
}

export const chunk = <T,>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
