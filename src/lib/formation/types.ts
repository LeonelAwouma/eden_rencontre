// Modèle de contenu de la formation « Bâtir sur le roc ».
// Le texte accepte deux marques en ligne : **gras** et *italique*.

export type LessonBlock =
  | { type: "p"; text: string }
  | { type: "verse"; text: string; ref: string }
  | { type: "points"; items: { lead: string; text: string }[] }
  | { type: "steps"; items: string[] }
  /** Citation d'un auteur (les versets bibliques passent par `verse`). */
  | { type: "authorQuote"; text: string; author: string }
  /**
   * Tableau ; sur mobile, chaque ligne devient une carte. `compare` : deux colonnes
   * de même poids, la posture à éviter puis la posture à cultiver (« diagnostic miroir »).
   */
  | { type: "table"; head: string[]; rows: string[][]; variant?: "compare" }
  /** Encadré : `info` pour un éclairage, `warning` pour une mise en garde, `neutral` pour un aparté. */
  | { type: "callout"; tone: "info" | "warning" | "neutral"; title?: string; blocks: LessonBlock[] }
  /** Étapes numérotées avec un titre chacune (un chemin, un protocole). */
  | { type: "titledSteps"; items: { title: string; text: string }[] }
  /** Fiche pratique : des questions à travailler, regroupées par section. */
  | { type: "worksheet"; title: string; intro?: string; sections: { title: string; intro?: string; items: string[] }[] };

/** Affiche illustrée (le texte fait partie de l'image) : toujours montrée entière. */
export interface Poster {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface LessonPart {
  heading: string;
  blocks: LessonBlock[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index (base 0) de la bonne réponse. */
  answer: number;
  explanation: string;
}

export interface Lesson {
  /** Numéro affiché : « 1.4 ». */
  number: string;
  /** Segment d'URL : « 1-4 ». */
  slug: string;
  title: string;
  image: { src: string; card: string; alt: string; position?: string };
  /** Affiche de la leçon : remplace la bannière recadrée en tête de lecture. */
  poster?: Poster;
  pdf: string;
  readingMinutes: number;
  intro: { heading: string; blocks: LessonBlock[] };
  /** « L'objectif de cette leçon », quand la leçon en formule un. */
  objective?: string;
  parts: LessonPart[];
  /** Cas pratique et boussole : présents au pilier 1, absents des leçons du pilier 2. */
  caseStudy?: {
    title: string;
    context: string;
    responses: { label: string; text: string; right?: boolean }[];
  };
  compass?: { title: string; blocks: LessonBlock[] };
  quizIntro: string;
  quiz: QuizQuestion[];
  reflection: { title: string; prompt: string };
}

export interface Pillar {
  number: number;
  slug: string;
  title: string;
  summary?: string;
  /** Affiche du pilier, montrée en tête de sa section dans la liste des leçons. */
  poster?: Poster;
  /** Vignette paysage du pilier (720×450), pour sa carte sur la page de l'Académie. */
  card?: string;
  lessons: Lesson[];
}

export interface Formation {
  slug: string;
  title: string;
  tagline: string;
  verse: { text: string; ref: string };
  /** Image d'identité de la formation, distincte des photos de chaque leçon. */
  coverImage: { src: string; card: string; alt: string; position?: string };
  pillars: Pillar[];
}

/* ─────────────── Histoires de l'Académie (storybooks) ─────────────── */

export type StoryBlock =
  | LessonBlock
  /** Réplique d'un personnage, affichée en citation. */
  | { type: "quote"; text: string }
  /** Intertitre à l'intérieur d'un chapitre (« Scène A… »). */
  | { type: "scene"; text: string };

export interface Story {
  /** Segment d'URL, commun aux deux langues. */
  slug: string;
  title: string;
  summary: string;
  /**
   * Couverture illustrée, propre à chaque langue (le titre est dans l'image) :
   * toujours affichée entière, jamais recadrée.
   */
  cover: { src: string; width: number; height: number; alt: string };
  /** Chapitres dans l'ordre ; le dernier peut être l'épilogue. */
  chapters: { title: string; epilogue?: boolean; blocks: StoryBlock[] }[];
  takeaways: { lead: string; text: string }[];
  /** Leçons de « Bâtir sur le roc » que l'histoire illustre (slugs). */
  lessons: string[];
}
