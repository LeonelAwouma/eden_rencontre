#!/usr/bin/env node
/**
 * Génère le bloc SQL de correspondance « nom de pays → code ISO » à partir de COUNTRIES (src/lib/geo.ts), la même
 * source que findCountry. Aucune correspondance n'est tapée à la main.
 *
 *   node scripts/geo/build-country-map.mjs            → affiche le bloc
 *   node scripts/geo/build-country-map.mjs --write    → le réécrit dans scripts/geo/backfill-foreign-members.sql
 *                                                       (entre les marqueurs BEGIN/END COUNTRY MAP)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = readFileSync(join(root, "src/lib/geo.ts"), "utf8");
const rows = [...src.matchAll(/^\s*C\("([^"]+)", "([^"]+)", "([A-Z]{2})"/gm)].map((m) => ({ fr: m[1], en: m[2], iso: m[3] }));
if (rows.length < 50) {
  console.error(`Seulement ${rows.length} pays lus dans src/lib/geo.ts : format inattendu, arrêt.`);
  process.exit(1);
}
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const seen = new Set();
const values = [];
for (const r of rows) {
  for (const name of [r.fr, r.en]) {
    const key = `${name.toLowerCase()}|${r.iso}`;
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(`  (${q(name)}, ${q(r.iso)})`);
  }
}
const block = `-- BEGIN COUNTRY MAP (généré par scripts/geo/build-country-map.mjs — ne pas modifier à la main)
create temporary table country_map (name text, iso text) on commit drop;
insert into country_map (name, iso) values
${values.join(",\n")};
-- END COUNTRY MAP`;

if (process.argv.includes("--write")) {
  const target = join(root, "scripts/geo/backfill-foreign-members.sql");
  const sql = readFileSync(target, "utf8");
  const re = /-- BEGIN COUNTRY MAP[\s\S]*?-- END COUNTRY MAP/;
  if (!re.test(sql)) {
    console.error("Marqueurs BEGIN/END COUNTRY MAP absents du script cible.");
    process.exit(1);
  }
  writeFileSync(target, sql.replace(re, block));
  console.log(`${rows.length} pays, ${values.length} noms écrits dans ${target}`);
} else {
  console.log(block);
}
