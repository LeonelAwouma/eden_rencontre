/** Utilitaires GeoJSON purs pour la carte (testés). Aucune donnée de membre : limites et comptes agrégés seulement. */
import { fillForCount, type ZoneCount } from "./zone-counts";

export interface ZoneFeature {
  type: "Feature";
  id?: string;
  properties: { id: string; name: string; [k: string]: unknown };
  geometry: { type: string; coordinates: unknown } | null;
}
export interface ZoneCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

type Bbox = [number, number, number, number]; // [ouest, sud, est, nord]

function walk(coords: unknown, acc: Bbox): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const [x, y] = coords as number[];
    if (x < acc[0]) acc[0] = x;
    if (y < acc[1]) acc[1] = y;
    if (x > acc[2]) acc[2] = x;
    if (y > acc[3]) acc[3] = y;
    return;
  }
  for (const c of coords) walk(c, acc);
}

/** Emprise d'une collection ; null si elle ne contient aucune géométrie. */
export function bboxOf(fc: ZoneCollection): Bbox | null {
  const acc: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of fc.features) if (f.geometry) walk(f.geometry.coordinates, acc);
  return Number.isFinite(acc[0]) && Number.isFinite(acc[2]) ? acc : null;
}

/**
 * Ajoute à chaque zone sa couleur de remplissage (selon le compte déjà masqué par le serveur) et si c'est la
 * zone du membre. Un compte absent (réponse non chargée ou consentement manquant) est traité comme masqué.
 */
export function enrichFeatures(fc: ZoneCollection, counts: ZoneCount[], mineIds: ReadonlySet<string>): ZoneCollection {
  const byId = new Map(counts.map((c) => [c.unitId, c.count]));
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        fill: fillForCount(byId.get(f.properties.id) ?? null),
        mine: mineIds.has(f.properties.id) ? 1 : 0,
        // texte de l'infobulle : jamais un nombre sous le seuil
        count: byId.get(f.properties.id) ?? null,
      },
    })),
  };
}
