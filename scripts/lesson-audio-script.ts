/**
 * Texte à faire lire par la voix (ElevenLabs…) pour la version audio d'une leçon, dans l'ordre et avec
 * les annonces de la leçon 1.1 (la référence : son audio est la lecture du texte, mot pour mot) :
 *
 *   titre · « Introduction, … » · paragraphes · « Objectif de la leçon » · « Partie N » + titre + paragraphes ·
 *   cas pratique · « La boussole »
 *
 * Le quiz et la réflexion ne sont pas lus. Les références bibliques sont dites en toutes lettres
 * (« Proverbes 4.23 » → « Proverbes 4, verset 23 »).
 *
 * Pourquoi un texte exact : le surlignage mot à mot (src/components/formation/speech-player.tsx) suit la
 * voix dans le texte de la leçon. Un audio qui résume ou reformule ne peut pas être surligné mot à mot.
 *
 * Usage :  npx jiti scripts/lesson-audio-script.ts 1-2            → affiche le texte
 *          npx jiti scripts/lesson-audio-script.ts 1-2 --write    → l'écrit dans docs/audio-scripts/lecon-1-2.txt
 * Suite de la procédure : docs/audio-lecons.md
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findLesson } from "../src/lib/formation/batir-sur-le-roc";
import type { LessonBlock } from "../src/lib/formation/types";

const slug = process.argv[2];
const write = process.argv.includes("--write");
if (!slug) { console.error("Usage : npx jiti scripts/lesson-audio-script.ts <slug de la leçon, ex. 1-2> [--write]"); process.exit(1); }
const found = findLesson(slug);
if (!found) { console.error(`Leçon introuvable : ${slug}`); process.exit(1); }
const { lesson } = found;

/** Texte sans marques de mise en forme, avec les références bibliques dites en toutes lettres. */
function speakable(text: string): string {
  return text
    .replace(/\*\*/g, "").replace(/\*/g, "")
    .replace(/(\p{L}) (\d+)\.(\d+)-(\d+)/gu, "$1 $2, versets $3 à $4")
    .replace(/(\p{L}) (\d+)\.(\d+)/gu, "$1 $2, verset $3")
    .replace(/\s+/g, " ")
    .trim();
}
const sentence = (t: string) => { const s = speakable(t); return /[.!?…»)]$/.test(s) ? s : `${s}.`; };

const unsupported = new Set<string>();
function blocks(list: LessonBlock[]): string[] {
  return list.flatMap((b): string[] => {
    switch (b.type) {
      case "p": return [speakable(b.text)];
      case "verse": return [`${speakable(b.text)} ${sentence(b.ref)}`];
      case "points": return b.items.map((it) => `${sentence(it.lead)} ${speakable(it.text)}`);
      case "steps": return b.items.map(speakable);
      default: unsupported.add(b.type); return [];
    }
  });
}

const out: string[] = [];
out.push(sentence(lesson.title));
out.push(`Introduction, ${sentence(lesson.intro.heading)}`);
out.push(...blocks(lesson.intro.blocks));
if (lesson.objective) out.push(`Objectif de la leçon. ${speakable(lesson.objective)}`);
lesson.parts.forEach((p, i) => {
  out.push(`Partie ${i + 1}. ${sentence(p.heading)}`);
  out.push(...blocks(p.blocks));
});
if (lesson.caseStudy) {
  out.push(`Cas pratique. ${sentence(lesson.caseStudy.title)}`);
  out.push(speakable(lesson.caseStudy.context));
  for (const r of lesson.caseStudy.responses) {
    out.push(r.right ? `${speakable(r.label)}, la pratique. ${speakable(r.text)}` : `${speakable(r.label)}, ${speakable(r.text)}`);
  }
}
if (lesson.compass) {
  const compassTitle = sentence(lesson.compass.title);
  // « La boussole pour ton célibat » : le titre annonce déjà la boussole.
  out.push(/^la boussole/i.test(compassTitle) ? compassTitle : `La boussole, ${compassTitle}`);
  out.push(...blocks(lesson.compass.blocks));
}

const text = out.join("\n\n") + "\n";
if (unsupported.size) console.error(`Attention : types de blocs non lus (à compléter dans ce script) : ${[...unsupported].join(", ")}`);
if (write) {
  const dir = join(__dirname, "..", "docs", "audio-scripts");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `lecon-${slug}.txt`);
  writeFileSync(file, text, "utf8");
  const words = text.split(/\s+/).filter(Boolean).length;
  console.log(`${file} — ${words} mots, ${Math.round(words / 2.6 / 60)} min de lecture environ`);
} else {
  process.stdout.write(text);
}
