// Modèle de contenu de la formation « Bâtir sur le roc ».
// Le texte accepte deux marques en ligne : **gras** et *italique*.

export type LessonBlock =
  | { type: "p"; text: string }
  | { type: "verse"; text: string; ref: string }
  | { type: "points"; items: { lead: string; text: string }[] }
  | { type: "steps"; items: string[] };

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
  pdf: string;
  readingMinutes: number;
  intro: { heading: string; blocks: LessonBlock[] };
  /** « L'objectif de cette leçon », quand la leçon en formule un. */
  objective?: string;
  parts: LessonPart[];
  caseStudy: {
    title: string;
    context: string;
    responses: { label: string; text: string; right?: boolean }[];
  };
  compass: { title: string; blocks: LessonBlock[] };
  quizIntro: string;
  quiz: QuizQuestion[];
  reflection: { title: string; prompt: string };
}

export interface Pillar {
  number: number;
  slug: string;
  title: string;
  summary?: string;
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
