/**
 * Fond de carte de la vue « International » (administration).
 *
 * Fournisseur : MapTiler (tuiles vectorielles issues d'OpenStreetMap), style sobre « dataviz-light ».
 * Clé : NEXT_PUBLIC_MAPTILER_KEY (Vercel). Changer de fournisseur = changer CETTE fonction seulement.
 * Le serveur public tile.openstreetmap.org n'est jamais utilisé (politique d'usage OSM : pas d'usage applicatif).
 * Sans clé : aucun fond, frontières seules sur fond crème (aucun service tiers appelé).
 */

export interface Basemap {
  /** URL d'un style MapLibre, ou null = pas de fond (frontières seules). */
  styleUrl: string | null;
  provider: string | null;
}

export function getBasemap(key: string | undefined = process.env.NEXT_PUBLIC_MAPTILER_KEY): Basemap {
  const k = (key || "").trim();
  if (!k) return { styleUrl: null, provider: null };
  return { styleUrl: `https://api.maptiler.com/maps/dataviz-light/style.json?key=${encodeURIComponent(k)}`, provider: "MapTiler" };
}

/** Attributions à afficher en permanence sous la carte internationale. */
export const BASEMAP_ATTRIBUTIONS = [
  { label: "© MapTiler", href: "https://www.maptiler.com/copyright/" },
  { label: "© OpenStreetMap contributors", href: "https://www.openstreetmap.org/copyright" },
] as const;

export const BORDERS_ATTRIBUTION = { label: "Frontières : Natural Earth", href: "https://www.naturalearthdata.com/" } as const;
