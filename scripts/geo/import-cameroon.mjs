#!/usr/bin/env node
/**
 * Import idempotent du référentiel géographique du Cameroun.
 *
 *   node scripts/geo/import-cameroon.mjs --dir <dossier> [--dry-run | --apply]
 *
 * Le dossier contient des fichiers que VOUS avez téléchargés et dont VOUS avez lu la licence :
 *   adm1.geojson  adm2.geojson  adm3.geojson   (OCHA COD-AB CMR, ou geoBoundaries gbOpen — voir docs/geo-sources-licences.md)
 *   CM.txt (ou places.txt)                      (GeoNames, tabulations — facultatif ; --meta <fichier> pour meta.json)
 *   meta.json                                   (OBLIGATOIRE, un bloc par fichier)
 *
 * meta.json :
 * {
 *   "adm":    { "source": "OCHA COD-AB CMR", "url": "https://data.humdata.org/dataset/cod-ab-cmr",
 *               "version": "2024-xx", "license": "CC BY-IGO", "retrievedAt": "2026-11-15" },
 *   "places": { "source": "GeoNames", "url": "https://download.geonames.org/export/dump/CM.zip",
 *               "version": "2026-11-15", "license": "CC BY 4.0", "retrievedAt": "2026-11-15" }
 * }
 * La licence N'EST PAS déduite : elle est recopiée de votre meta.json (et le script refuse de continuer
 * sans). Lisez-la sur le fichier/jeu réellement téléchargé, pas sur la page générale de la plateforme.
 *
 * --dry-run (défaut) : lit, valide, affiche statistiques et anomalies ; ne touche à aucune base.
 * --apply            : écrit dans la base (SUPABASE_DB_URL = chaîne de connexion Postgres). Idempotent :
 *                      relancer ne crée aucun doublon ; une donnée marquée `validated` n'est JAMAIS écrasée
 *                      (le conflit est consigné dans geo_import_runs.conflicts).
 *
 * Aucune frontière n'est codée à la main : tout vient des fichiers.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const dir = opt("--dir");
const APPLY = flag("--apply") && !flag("--dry-run");
if (!dir) {
  console.error("Usage : node scripts/geo/import-cameroon.mjs --dir <dossier> [--dry-run | --apply]");
  process.exit(2);
}

const COUNTRY = "CM";
// Même convention que normalizePlaceName (src/lib/geo/normalize.ts) et public.geo_normalize_name (SQL).
const norm = (s) =>
  String(s ?? "")
    .replace(/[  ]/g, " ")
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´]/g, "'")
    .replace(/[-_.,/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const meta = JSON.parse(readFileSync(opt("--meta") ?? join(dir, "meta.json"), "utf8"));
const placesFile = [join(dir, "places.txt"), join(dir, "CM.txt")].find(existsSync);
for (const k of ["adm", ...(placesFile ? ["places"] : [])]) {
  const m = meta[k];
  if (!m || !m.source || !m.url || !m.version || !m.license || !m.retrievedAt) {
    console.error(`meta.json : « ${k} » doit contenir source, url, version, license, retrievedAt (licence lue sur le fichier réel).`);
    process.exit(2);
  }
}

const anomalies = [];
const stats = { units: { 1: 0, 2: 0, 3: 0 }, places: 0, skipped: 0 };

// ── Lecture des unités administratives ────────────────────────────────────────
// Répare le double encodage (« MÃ©long » → « Mélong ») ; sans perte, sinon le nom est laissé tel quel.
const repairMojibake = (s) => {
  if (!/[ÂÃ]/.test(s)) return s;
  const fixed = Buffer.from(s, "latin1").toString("utf8");
  return fixed.includes("�") ? s : fixed;
};
// geoBoundaries ne donne que le nom anglais des régions. Pour ces 10 régions seulement, le nom français
// vient de cette table fixe ; les autres niveaux gardent le nom du fichier (aucun nom inventé).
const REGION_FR = {
  Centre: "Centre", "Far North": "Extrême-Nord", North: "Nord", "North-West": "Nord-Ouest", Adamaoua: "Adamaoua",
  East: "Est", South: "Sud", "South-West": "Sud-Ouest", West: "Ouest", Littoral: "Littoral",
};
const pick = (props, keys) => {
  for (const k of keys) if (props[k] != null && String(props[k]).trim() !== "") return String(props[k]).trim();
  return null;
};
function readLevel(level) {
  // adm1.geojson OU cameroun-regions.geojson (geoBoundaries tel que livré dans public/geo)
  const alt = { 1: "cameroun-regions", 2: "cameroun-departements", 3: "cameroun-arrondissements" }[level];
  const file = [join(dir, `adm${level}.geojson`), join(dir, `${alt}.geojson`)].find(existsSync) ?? join(dir, `adm${level}.geojson`);
  if (!existsSync(file)) {
    anomalies.push({ level, problem: "fichier absent", file });
    return [];
  }
  const fc = JSON.parse(readFileSync(file, "utf8"));
  const seen = new Set();
  const out = [];
  for (const f of fc.features ?? []) {
    const p = f.properties ?? {};
    const code = pick(p, [`ADM${level}_PCODE`, "shapeISO", "shapeID", "code", "id"]);
    const rawName = pick(p, [`ADM${level}_FR`, `ADM${level}_NAME`, `ADM${level}_EN`, "shapeName", "name_fr", "name"]);
    const name = rawName ? repairMojibake(rawName) : null;
    const nameFr = level === 1 && name ? (REGION_FR[name] ?? name) : name;
    const nameEn = level === 1 && name && nameFr !== name ? name : pick(p, [`ADM${level}_EN`, "name_en"]);
    const parentCode = level > 1 ? pick(p, [`ADM${level - 1}_PCODE`, "parent_code"]) : null;
    if (!code || !nameFr || !f.geometry) {
      anomalies.push({ level, problem: "code, nom ou géométrie manquant", props: p });
      stats.skipped++;
      continue;
    }
    if (seen.has(code)) {
      anomalies.push({ level, problem: "code dupliqué", code });
      stats.skipped++;
      continue;
    }
    seen.add(code);
    // Même nom au même niveau = une unité découpée en plusieurs polygones : fusion, et signalement.
    const sameName = out.find((o) => norm(o.nameFr) === norm(nameFr));
    if (sameName) {
      const parts = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
      sameName.geometry = { type: "MultiPolygon", coordinates: [...parts(sameName.geometry), ...parts(f.geometry)] };
      sameName.aliases.push(code);
      anomalies.push({ level, problem: "même nom, deux polygones : fusionnés", name: nameFr, kept: sameName.code, merged: code });
      continue;
    }
    const extra = [pick(p, [`ADM${level}_ALT`, `ADM${level}_ALT1`, `ADM${level}_ALT2`, "alias"])].filter(Boolean);
    out.push({ level, code, nameFr, nameEn: nameEn && nameEn !== nameFr ? nameEn : null, parentCode, geometry: f.geometry, aliases: extra });
    stats.units[level]++;
  }
  return out;
}
const units = [1, 2, 3].flatMap(readLevel);
if (stats.units[1] !== 10) anomalies.push({ problem: `Le Cameroun compte 10 régions ; ${stats.units[1]} trouvée(s).` });

// ── Localités (GeoNames, tabulations) ─────────────────────────────────────────
const places = [];
if (placesFile) {
  for (const line of readFileSync(placesFile, "utf8").split("\n")) {
    const c = line.split("\t");
    if (c.length < 15 || c[6] !== "P") continue; // « P » = lieux habités
    const lat = Number(c[4]);
    const lon = Number(c[5]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || c[8] !== COUNTRY) {
      stats.skipped++;
      continue;
    }
    const type = c[7] === "PPLC" || c[7] === "PPLA" || c[7] === "PPLA2" ? "city" : c[7] === "PPLA3" ? "town" : "locality";
    places.push({
      sourceId: c[0],
      name: c[1],
      aliases: c[3] ? c[3].split(",").filter((a) => a && a !== c[1]).slice(0, 12) : [],
      lat,
      lon,
      type,
      population: Number(c[14]) || null,
    });
  }
  stats.places = places.length;
}

console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", stats, anomalies: anomalies.length }, null, 2));
for (const a of anomalies.slice(0, 20)) console.log("  anomalie :", JSON.stringify(a));
if (!APPLY) {
  console.log("\nDry-run : aucune écriture. Relancez avec --apply pour importer.");
  process.exit(anomalies.some((a) => a.problem?.includes("régions")) ? 1 : 0);
}

// ── Écriture ──────────────────────────────────────────────────────────────────
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL (chaîne de connexion Postgres) est requise pour --apply.");
  process.exit(2);
}
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const conflicts = [];
const run = await client.query(
  "insert into public.geo_import_runs (source, source_version, mode) values ($1,$2,'apply') returning id",
  [meta.adm.source, meta.adm.version],
);
const runId = run.rows[0].id;

try {
  await client.query("begin");
  const idByCode = new Map();
  for (const level of [1, 2, 3]) {
    for (const u of units.filter((x) => x.level === level)) {
      const names = [u.nameFr, u.nameEn, ...u.aliases].filter(Boolean);
      // Une donnée validée n'est jamais écrasée : la ligne n'est pas mise à jour, le conflit est consigné.
      const existing = await client.query(
        "select id, validated from public.geo_admin_units where country_code=$1 and level=$2 and code=$3",
        [COUNTRY, level, u.code],
      );
      if (existing.rows[0]?.validated) {
        conflicts.push({ level, code: u.code, reason: "donnée validée non écrasée" });
        idByCode.set(u.code, existing.rows[0].id);
        continue;
      }
      const parentId = u.parentCode ? idByCode.get(u.parentCode) ?? null : null;
      const r = await client.query(
        `insert into public.geo_admin_units
           (code, country_code, level, name_fr, name_en, aliases, normalized_names, parent_id, geom,
            source, source_url, source_version, license, retrieved_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,
            extensions.ST_Multi(extensions.ST_CollectionExtract(extensions.ST_MakeValid(
               extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON($9),4326)),3)),
            $10,$11,$12,$13,$14)
         on conflict (country_code, level, code) do update set
           name_fr=excluded.name_fr, name_en=excluded.name_en, aliases=excluded.aliases,
           normalized_names=excluded.normalized_names, parent_id=coalesce(excluded.parent_id, public.geo_admin_units.parent_id),
           geom=excluded.geom, source=excluded.source, source_url=excluded.source_url,
           source_version=excluded.source_version, license=excluded.license, retrieved_at=excluded.retrieved_at,
           updated_at=now()
         returning id`,
        [
          u.code, COUNTRY, level, u.nameFr, u.nameEn, u.aliases, [...new Set(names.map(norm))], parentId,
          JSON.stringify(u.geometry), meta.adm.source, meta.adm.url, meta.adm.version, meta.adm.license, meta.adm.retrievedAt,
        ],
      );
      idByCode.set(u.code, r.rows[0].id);
    }
  }

  // Parents manquants (ex. geoBoundaries sans code parent) : résolus spatialement, jamais devinés par le nom.
  await client.query(`
    update public.geo_admin_units c set parent_id = p.id
    from public.geo_admin_units p
    where c.parent_id is null and c.level > 1 and c.country_code=$1
      and p.country_code=c.country_code and p.level = c.level - 1
      and extensions.ST_Within(extensions.ST_PointOnSurface(c.geom), p.geom)`, [COUNTRY]);

  // Contrôles : géométries invalides, orphelins.
  const bad = await client.query(
    "select code, level from public.geo_admin_units where country_code=$1 and (geom is null or not extensions.ST_IsValid(geom))", [COUNTRY]);
  for (const r of bad.rows) anomalies.push({ problem: "géométrie invalide", ...r });
  const orphans = await client.query(
    "select code, level from public.geo_admin_units where country_code=$1 and level>1 and parent_id is null", [COUNTRY]);
  for (const r of orphans.rows) anomalies.push({ problem: "unité sans parent", ...r });

  // Point intérieur + simplification EN MÈTRES (projection métrique adaptée), puis retour en 4326.
  // SRID personnalisé : Lambert azimutal équivalent centré sur le Cameroun (6°N, 12,5°E) ; repli UTM 33N.
  // PostGIS est dans le schéma « extensions » : spatial_ref_sys s'y trouve. L'essai se fait dans un SAVEPOINT,
  // sinon un échec (droits) invaliderait toute la transaction d'import malgré le catch.
  let metric = 32633;
  await client.query("savepoint srid_custom");
  try {
    await client.query(
      `insert into extensions.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
       select 990237,'CUSTOM',990237,'',
         '+proj=laea +lat_0=6 +lon_0=12.5 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
       where not exists (select 1 from extensions.spatial_ref_sys where srid=990237)`);
    await client.query("release savepoint srid_custom");
    metric = 990237;
  } catch {
    await client.query("rollback to savepoint srid_custom");
    console.warn("SRID personnalisé non créé (droits) : repli sur EPSG:32633.");
  }
  const tol = { 1: 1000, 2: 300, 3: 100 }; // mètres
  for (const level of [1, 2, 3]) {
    await client.query(
      `update public.geo_admin_units set
         centroid = extensions.ST_PointOnSurface(geom),
         geom_simplified = extensions.ST_Multi(extensions.ST_CollectionExtract(extensions.ST_MakeValid(
           extensions.ST_Transform(extensions.ST_SimplifyPreserveTopology(extensions.ST_Transform(geom, ${metric}), $2), 4326)),3))
       where country_code=$1 and level=$3 and geom is not null`,
      [COUNTRY, tol[level], level],
    );
  }
  // Déformation : écart de surface (en m², projection équivalente) > 1 % → anomalie signalée.
  const drift = await client.query(
    `select code, level,
       abs(extensions.ST_Area(extensions.ST_Transform(geom,${metric})) - extensions.ST_Area(extensions.ST_Transform(geom_simplified,${metric})))
         / nullif(extensions.ST_Area(extensions.ST_Transform(geom,${metric})),0) as drift
     from public.geo_admin_units where country_code=$1 and geom_simplified is not null`, [COUNTRY]);
  for (const r of drift.rows) if (r.drift > 0.01) anomalies.push({ problem: "simplification > 1 % de surface", code: r.code, level: r.level, drift: Number(r.drift) });

  // Localités : rattachement à l'arrondissement par inclusion du point ; hors polygone = non vérifié.
  for (const p of places) {
    await client.query(
      `insert into public.geo_places
         (name, normalized_name, aliases, country_code, place_type, representative_point, population,
          source, source_id, source_url, source_version, license, retrieved_at)
       values ($1,$2,$3,$4,$5,extensions.ST_SetSRID(extensions.ST_MakePoint($6,$7),4326),$8,$9,$10,$11,$12,$13,$14)
       on conflict (source, source_id) do update set
         name=excluded.name, normalized_name=excluded.normalized_name, aliases=excluded.aliases,
         place_type=excluded.place_type, representative_point=excluded.representative_point,
         population=excluded.population, source_version=excluded.source_version, license=excluded.license,
         retrieved_at=excluded.retrieved_at, updated_at=now()`,
      [p.name, norm(p.name), p.aliases, COUNTRY, p.type, p.lon, p.lat, p.population,
       meta.places.source, p.sourceId, meta.places.url, meta.places.version, meta.places.license, meta.places.retrievedAt],
    );
  }
  // Rattachement : seulement si le point tombe dans UN arrondissement (jamais deviné autrement) ; ne
  // touche pas une localité déjà « verified » par l'administration.
  await client.query(
    `update public.geo_places pl set admin_unit_id = a.id, verification_status = 'verified'
     from public.geo_admin_units a
     where pl.country_code=$1 and pl.verification_status <> 'verified' and pl.admin_unit_id is null
       and a.country_code=pl.country_code and a.level=3 and extensions.ST_Within(pl.representative_point, a.geom)
       and (select count(*) from public.geo_admin_units a2 where a2.country_code=pl.country_code and a2.level=3
            and extensions.ST_Within(pl.representative_point, a2.geom)) = 1`, [COUNTRY]);

  await client.query(
    "update public.geo_import_runs set finished_at=now(), stats=$2, anomalies=$3, conflicts=$4 where id=$1",
    [runId, JSON.stringify(stats), JSON.stringify(anomalies), JSON.stringify(conflicts)],
  );
  await client.query("commit");
  console.log(`\nImport terminé (run ${runId}). Anomalies : ${anomalies.length}, conflits non écrasés : ${conflicts.length}.`);
} catch (e) {
  await client.query("rollback");
  console.error("Échec, import annulé :", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
