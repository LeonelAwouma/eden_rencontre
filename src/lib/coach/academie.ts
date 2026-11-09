import { PILLAR_LESSON_SLUGS } from "@/lib/formation/structure";
import { FORMATION_PUBLIC_BASE } from "@/lib/formation/media";
import type { Lesson } from "@/lib/formation/types";

/**
 * Académie du Mariage vue par un coach : consultation seule. Logique PURE (sans accès base), testable.
 *
 * Source unique : le catalogue existant « Bâtir sur le roc » (aucune copie). Est « publiée » toute leçon présente dans
 * PILLAR_LESSON_SLUGS (les piliers 4 à 6 sont vides). Rien de la médiathèque générale n'est référencé ici.
 */

/** Liste blanche des identifiants de leçon (anti-manipulation d'URL : tout le reste est refusé). */
export const ACADEMIE_SLUGS: ReadonlySet<string> = new Set(Object.values(PILLAR_LESSON_SLUGS).flat());
export const isAcademieSlug = (slug: unknown): slug is string => typeof slug === "string" && ACADEMIE_SLUGS.has(slug);

export type AudioKind = "audio" | "transcript";
export const audioUrlFor = (slug: string, kind: AudioKind) =>
  `/api/coach/academie/audio/${slug}${kind === "transcript" ? "?kind=transcript" : ""}`;

/** Leçon renvoyée au coach : texte + audio associé ; ni PDF, ni quiz, ni réflexion, ni chemin de fichier source. */
export type CoachLesson = Omit<Lesson, "pdf" | "quiz" | "quizIntro" | "reflection" | "audio" | "image" | "poster"> & {
  image: { alt: string; position?: string };
  audio: { src: string; transcript: string | null; summary: boolean } | null;
};

export function toCoachLesson(lesson: Lesson, hasTranscript: boolean): CoachLesson {
  // Les champs retirés sont volontairement écartés : un coach ne reçoit jamais de lien vers un fichier source.
  const { pdf, quiz, quizIntro, reflection, audio, image, poster, ...rest } = lesson;
  void pdf; void quiz; void quizIntro; void reflection; void poster;
  return {
    ...rest,
    image: { alt: image.alt, position: image.position },
    audio: audio
      ? { src: audioUrlFor(lesson.slug, "audio"), transcript: audio.transcript && hasTranscript ? audioUrlFor(lesson.slug, "transcript") : null, summary: !!audio.summary }
      : null,
  };
}

/** Chemin dans le bucket privé `formation-media` pour un chemin public d'actif ; null s'il n'en dérive pas. */
export function storagePathOf(publicPath: string | undefined | null): string | null {
  if (!publicPath || !publicPath.startsWith(`${FORMATION_PUBLIC_BASE}/`)) return null;
  const rest = publicPath.slice(FORMATION_PUBLIC_BASE.length + 1);
  // Seuls l'audio et sa transcription sont servis ; pas de remontée de répertoire.
  return /^audio\/[A-Za-z0-9._-]+\.(mp3|json)$/.test(rest) ? rest : null;
}

import type { LessonBlock } from "@/lib/formation/types";

function blockText(b: LessonBlock): string {
  switch (b.type) {
    case "p": return b.text;
    case "verse": return `${b.text} ${b.ref}`;
    case "points": return b.items.map((i) => `${i.lead} ${i.text}`).join(" ");
    case "steps": return b.items.join(" ");
    case "authorQuote": return `${b.text} ${b.author}`;
    case "table": return [...b.head, ...b.rows.flat()].join(" ");
    case "callout": return `${b.title ?? ""} ${b.blocks.map(blockText).join(" ")}`;
    case "titledSteps": return b.items.map((i) => `${i.title} ${i.text}`).join(" ");
    case "worksheet": return `${b.title} ${b.sections.map((s) => `${s.title} ${s.items.join(" ")}`).join(" ")}`;
    default: return "";
  }
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Un contenu correspond-il à la recherche (titre ou mot-clé du texte, sans accents ni casse) ? */
export function lessonMatches(lesson: Lesson, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold([
    lesson.title, lesson.number, lesson.objective ?? "", lesson.intro.heading, lesson.intro.blocks.map(blockText).join(" "),
    lesson.parts.map((p) => `${p.heading} ${p.blocks.map(blockText).join(" ")}`).join(" "),
  ].join(" "));
  return q.split(/\s+/).every((w) => hay.includes(w));
}

export type ByteRange = { start: number; end: number } | "invalid" | null;

/** En-tête Range (une seule plage d'octets). null = pas de plage ; "invalid" = 416. */
export function parseRange(header: string | null, size: number): ByteRange {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "") || size <= 0) return "invalid";
  let start: number;
  let end: number;
  if (m[1] === "") { // « les N derniers octets »
    const n = Number(m[2]);
    if (!Number.isFinite(n) || n <= 0) return "invalid";
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return "invalid";
  return { start, end };
}
