#!/usr/bin/env node
/**
 * Frontières nationales du monde pour la carte « International » de l'administration.
 *
 * Source : Natural Earth — Admin 0 Countries, 1:50m (domaine public), version figée ci-dessous.
 * Sortie : public/geo/world-countries.geojson — polygones + { iso2, name_fr, name_en } UNIQUEMENT.
 * Aucune donnée de membre. Le fichier est commité : la carte ne fait aucune requête externe pour les frontières.
 *
 * Usage : node scripts/geo/build-world-countries.mjs [chemin-local.geojson]
 *   (sans argument, télécharge la version figée depuis le dépôt officiel natural-earth-vector)
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const NE_VERSION = "v5.1.2";
const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_VERSION}/geojson/ne_50m_admin_0_countries.geojson`;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/geo/world-countries.geojson");

// Natural Earth code -99 pour quelques pays (ISO_A2 non attribué dans ses données) : correction par l'ADM0_A3.
const A3_FIX = { FRA: "FR", NOR: "NO", KOS: "XK", SOL: null, CYN: null, SAH: "EH", PSX: "PS" };

const round = (c) => (typeof c[0] === "number" ? [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000] : c.map(round));

function iso2Of(p) {
  for (const k of ["ISO_A2_EH", "ISO_A2", "WB_A2"]) {
    const v = p[k];
    if (typeof v === "string" && /^[A-Z]{2}$/.test(v)) return v;
  }
  const a3 = p.ADM0_A3 || p.SOV_A3;
  return a3 && a3 in A3_FIX ? A3_FIX[a3] : null;
}

const raw = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], "utf8"))
  : await (async () => {
      const res = await fetch(SOURCE_URL);
      if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${SOURCE_URL}`);
      return res.json();
    })();

const seen = new Set();
const skipped = [];
const features = [];
for (const f of raw.features) {
  const p = f.properties || {};
  const iso2 = iso2Of(p);
  if (!iso2 || !f.geometry) { skipped.push(p.NAME || p.ADMIN); continue; }
  if (seen.has(iso2)) { skipped.push(`${p.NAME} (doublon ${iso2})`); continue; }
  seen.add(iso2);
  features.push({
    type: "Feature",
    id: iso2,
    properties: { iso2, name_fr: p.NAME_FR || p.NAME, name_en: p.NAME_EN || p.NAME },
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  });
}
features.sort((a, b) => a.properties.iso2.localeCompare(b.properties.iso2));

const out = {
  type: "FeatureCollection",
  source: `Natural Earth ${NE_VERSION} — ne_50m_admin_0_countries (domaine public)`,
  features,
};
await writeFile(OUT, JSON.stringify(out));
console.log(`${features.length} pays écrits dans ${OUT}`);
if (skipped.length) console.log(`Ignorés (sans code ISO ou doublon) : ${skipped.join(", ")}`);
