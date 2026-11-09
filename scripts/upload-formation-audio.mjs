/**
 * Téléverse les audios (mp3) et transcriptions (json) de l'Académie dans le bucket PRIVÉ `formation-media`,
 * d'où la route protégée /api/coach/academie/audio/[slug] les diffuse aux coachs actifs.
 *
 * Opération manuelle, non destructive : ne supprime rien, n'écrase rien (upsert: false → un fichier déjà présent est
 * simplement ignoré). Les copies publiques de public/formation/ restent en place (les membres les utilisent encore).
 *
 * Usage (variables d'environnement requises, clé service_role JAMAIS dans le navigateur ni dans le dépôt) :
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/upload-formation-audio.mjs          → simulation
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/upload-formation-audio.mjs --apply  → téléversement
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "formation-media";
const DIR = join(process.cwd(), "public", "formation", "batir-sur-le-roc", "audio");
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis."); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });
const TYPES = { ".mp3": "audio/mpeg", ".json": "application/json" };

for (const name of readdirSync(DIR)) {
  const ext = name.slice(name.lastIndexOf("."));
  if (!TYPES[ext]) continue;
  const path = `audio/${name}`;
  if (!apply) { console.log(`[simulation] ${path}`); continue; }
  const { error } = await db.storage.from(BUCKET).upload(path, readFileSync(join(DIR, name)), { contentType: TYPES[ext], upsert: false });
  if (!error) console.log(`téléversé : ${path}`);
  else if (/already exists|Duplicate/i.test(error.message)) console.log(`déjà présent (ignoré) : ${path}`);
  else { console.error(`échec ${path} : ${error.message}`); process.exitCode = 1; }
}
