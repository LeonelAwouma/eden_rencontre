"use client";

// Textes d'interface de l'Académie (page de l'Académie, liste des leçons,
// lecteur). Dictionnaire typé plutôt que JSON : TypeScript impose que l'anglais
// ait exactement les mêmes clés que le français, et les pluriels s'écrivent
// simplement. Le contenu des leçons, lui, vit dans batir-sur-le-roc(.en).ts.

import { useI18n } from "@/lib/i18n";
import { BATIR_SUR_LE_ROC } from "./batir-sur-le-roc";
import { BATIR_SUR_LE_ROC_EN } from "./batir-sur-le-roc.en";
import { STORIES } from "./stories";
import { STORIES_EN } from "./stories.en";
import type { Formation, Lesson, Pillar, Story } from "./types";

const s = (n: number, one: string, many: string) => (n > 1 ? many : one);

const fr = {
  // Académie
  academyEyebrow: "Préparation au mariage",
  academyTitle: "Académie du",
  academyTitleHighlight: "mariage",
  academyIntro: "Des parcours pour se préparer à l'alliance, leçon après leçon, à ton rythme. Ta progression est enregistrée au fil de ta lecture.",
  pillarBadge: (n: number) => `Pilier ${n}`,
  lessonsAvailable: (n: number) => `Formation · ${n} leçons disponibles`,
  coverAlt: "Un couple pose ensemble une pierre sur un rocher gravé « Jésus Christ, notre fondation — Matthieu 7:24-25 », devant une maison en construction.",
  progressLabel: "Ta progression",
  lessonsDone: (done: number, total: number) => `${done} / ${total} ${s(total, "leçon terminée", "leçons terminées")}`,
  lessonsCount: (done: number, total: number) => `${done} / ${total} ${s(total, "leçon", "leçons")}`,
  inProgress: (number: string, title: string) => `En cours : Leçon ${number} — ${title}`,
  allDone: "Toutes les leçons sont terminées",
  start: "Commencer",
  continue: "Continuer",
  furtherTitle: "Pour aller plus loin",
  furtherDesc: "Des lectures courtes sur le discernement et la vie de couple.",
  // Liste des leçons
  backToAcademy: "Académie du mariage",
  courseEyebrow: "Académie du mariage · Formation",
  resume: "Reprendre",
  pillarDone: (n: number) => `Pilier ${n} terminé`,
  lessonTitle: (number: string, title: string) => `Leçon ${number} — ${title}`,
  bravo: "Bravo, toutes les leçons sont terminées.",
  autosaved: "Ta progression est enregistrée automatiquement.",
  completed: "Terminée",
  reread: "Relire",
  read: "Lire",
  resumeAt: (pct: number) => `Reprendre · ${pct} %`,
  minutesQuestions: (min: number, q: number) => `${min} min · ${q} questions`,
  nextPillars: "Prochains piliers",
  inPreparation: "En préparation",
  // Lecteur
  pillarNav: (n: number) => `Leçons du pilier ${n}`,
  lessonTooltip: (number: string, title: string, done: boolean) => `Leçon ${number} — ${title}${done ? " (terminée)" : ""}`,
  pillarEyebrow: (n: number, title: string) => `Pilier ${n} · ${title}`,
  lessonLabel: (number: string) => `Leçon ${number}`,
  readingTime: (min: number) => `${min} min de lecture`,
  questionsCount: (n: number) => `${n} ${s(n, "question", "questions")}`,
  lessonCompleted: "Leçon terminée",
  introduction: "Introduction",
  objective: "Objectif de la leçon",
  part: (n: number) => `Partie ${n}`,
  caseStudy: "Cas pratique",
  thePractice: "la pratique",
  quizEyebrow: "Validation des acquis",
  quizTitle: "Ancrer la vision",
  goFurther: "Pour aller plus loin",
  youReadIt: "Tu as parcouru cette leçon",
  doneHint: "Ta progression est enregistrée automatiquement ; tu peux relire cette leçon quand tu veux.",
  previewHint: "Aperçu : rien n'est enregistré.",
  markHint: "Marque-la comme terminée pour suivre ta progression dans le pilier.",
  markDone: "Marquer comme terminée",
  markUndone: "Marquer comme non terminée",
  neighbours: "Leçons voisines",
  previousLesson: "Leçon précédente",
  nextLesson: "Leçon suivante",
  endOfPillar: (n: number) => `Fin du pilier ${n}`,
  backToCourse: "Retour à la formation",
  onThisPage: "Dans cette leçon",
  resumeReading: (pct: number) => `Reprendre la lecture · ${pct} %`,
  hide: "Masquer",
  previewBanner: "Aperçu admin",
  previewBannerDetail: " · la leçon telle que la voient les membres. Réponses et progression ne sont pas enregistrées.",
  backToLessons: "Retour aux leçons",
  // Quiz
  question: (n: number) => `Question ${n}`,
  answersFor: (n: number) => `Réponses à la question ${n}`,
  right: "Juste ! ",
  expected: (letter: string) => `Réponse attendue : ${letter}. `,
  insight: "Éclairage — ",
  score: (correct: number, total: number) => `${correct} / ${total} ${s(correct, "bonne réponse", "bonnes réponses")}.`,
  scorePerfect: "La vision est bien ancrée.",
  scoreRetry: "Relis les éclairages, puis réessaie.",
  answeredOf: (n: number, total: number) => `${n} ${s(n, "question", "questions")} sur ${total}`,
  restart: "Recommencer",
  // Réflexion
  reflectionLabel: "Ce que je retiens de cette leçon",
  reflectionPlaceholder: "Écris librement : personne d'autre que toi ne lira ces lignes.",
  saved: "Enregistré",
  autosave: "Enregistrement automatique",
  deviceOnly: "gardé uniquement sur cet appareil, jamais partagé.",
  // Guillemets des citations bibliques
  quote: (text: string) => `« ${text} »`,
  // Histoires
  storiesTitle: "Histoires",
  storiesDesc: "Des récits pour voir la vision de l'alliance à l'œuvre dans la vie de celles et ceux qui se préparent au mariage.",
  storyEyebrow: "Histoire",
  storySummary: "Résumé du récit",
  chapterLabel: (n: number) => `Chapitre ${n}`,
  epilogue: "Épilogue",
  takeawaysTitle: "Les enseignements clés",
  relatedLessons: "Pour approfondir dans « Bâtir sur le roc »",
  readStory: "Lire l'histoire",
  chaptersCount: (n: number) => `${n} ${s(n, "chapitre", "chapitres")}`,
  otherStories: "Autres histoires",
  storyPreviewBannerDetail: " · l'histoire telle que la voient les membres.",
  backToAcademyPage: "Retour à l'Académie",
};

type FormationUi = typeof fr;

const en: FormationUi = {
  academyEyebrow: "Marriage preparation",
  academyTitle: "Marriage",
  academyTitleHighlight: "Academy",
  academyIntro: "Courses to prepare for the covenant, lesson by lesson, at your own pace. Your progress is saved as you read.",
  pillarBadge: (n) => `Pillar ${n}`,
  lessonsAvailable: (n) => `Course · ${n} lessons available`,
  coverAlt: "A couple setting a stone together on a rock engraved “Jesus Christ, our foundation — Matthew 7:24-25”, in front of a house under construction.",
  progressLabel: "Your progress",
  lessonsDone: (done, total) => `${done} / ${total} ${s(total, "lesson completed", "lessons completed")}`,
  lessonsCount: (done, total) => `${done} / ${total} ${s(total, "lesson", "lessons")}`,
  inProgress: (number, title) => `In progress: Lesson ${number} — ${title}`,
  allDone: "All lessons completed",
  start: "Start",
  continue: "Continue",
  furtherTitle: "Going further",
  furtherDesc: "Short readings on discernment and life as a couple.",
  backToAcademy: "Marriage Academy",
  courseEyebrow: "Marriage Academy · Course",
  resume: "Resume",
  pillarDone: (n) => `Pillar ${n} completed`,
  lessonTitle: (number, title) => `Lesson ${number} — ${title}`,
  bravo: "Well done, all lessons are completed.",
  autosaved: "Your progress is saved automatically.",
  completed: "Completed",
  reread: "Read again",
  read: "Read",
  resumeAt: (pct) => `Resume · ${pct}%`,
  minutesQuestions: (min, q) => `${min} min · ${q} questions`,
  nextPillars: "Coming pillars",
  inPreparation: "In preparation",
  pillarNav: (n) => `Lessons of pillar ${n}`,
  lessonTooltip: (number, title, done) => `Lesson ${number} — ${title}${done ? " (completed)" : ""}`,
  pillarEyebrow: (n, title) => `Pillar ${n} · ${title}`,
  lessonLabel: (number) => `Lesson ${number}`,
  readingTime: (min) => `${min} min read`,
  questionsCount: (n) => `${n} ${s(n, "question", "questions")}`,
  lessonCompleted: "Lesson completed",
  introduction: "Introduction",
  objective: "Lesson objective",
  part: (n) => `Part ${n}`,
  caseStudy: "Case study",
  thePractice: "the practice",
  quizEyebrow: "Check your understanding",
  quizTitle: "Anchor the vision",
  goFurther: "Going further",
  youReadIt: "You've read this lesson",
  doneHint: "Your progress is saved automatically; you can read this lesson again whenever you like.",
  previewHint: "Preview: nothing is saved.",
  markHint: "Mark it as completed to track your progress through the pillar.",
  markDone: "Mark as completed",
  markUndone: "Mark as not completed",
  neighbours: "Neighbouring lessons",
  previousLesson: "Previous lesson",
  nextLesson: "Next lesson",
  endOfPillar: (n) => `End of pillar ${n}`,
  backToCourse: "Back to the course",
  onThisPage: "In this lesson",
  resumeReading: (pct) => `Resume reading · ${pct}%`,
  hide: "Hide",
  previewBanner: "Admin preview",
  previewBannerDetail: " · the lesson as members see it. Answers and progress are not saved.",
  backToLessons: "Back to lessons",
  question: (n) => `Question ${n}`,
  answersFor: (n) => `Answers to question ${n}`,
  right: "Correct! ",
  expected: (letter) => `Expected answer: ${letter}. `,
  insight: "Insight — ",
  score: (correct, total) => `${correct} / ${total} ${s(correct, "correct answer", "correct answers")}.`,
  scorePerfect: "The vision is well anchored.",
  scoreRetry: "Read the insights again, then try once more.",
  answeredOf: (n, total) => `${n} of ${total} ${s(total, "question", "questions")}`,
  restart: "Start over",
  reflectionLabel: "What I take away from this lesson",
  reflectionPlaceholder: "Write freely: no one but you will read these lines.",
  saved: "Saved",
  autosave: "Saved automatically",
  deviceOnly: "kept only on this device, never shared.",
  quote: (text) => `“${text}”`,
  storiesTitle: "Stories",
  storiesDesc: "Stories that show the vision of the covenant at work in the lives of people preparing for marriage.",
  storyEyebrow: "Story",
  storySummary: "Story summary",
  chapterLabel: (n) => `Chapter ${n}`,
  epilogue: "Epilogue",
  takeawaysTitle: "Key takeaways",
  relatedLessons: "Go deeper in “Build on the Rock”",
  readStory: "Read the story",
  chaptersCount: (n) => `${n} ${s(n, "chapter", "chapters")}`,
  otherStories: "More stories",
  storyPreviewBannerDetail: " · the story as members see it.",
  backToAcademyPage: "Back to the Academy",
};

/* ─────────────────────────── Langue courante ─────────────────────────── */

const FORMATIONS: Record<"fr" | "en", Formation> = { fr: BATIR_SUR_LE_ROC, en: BATIR_SUR_LE_ROC_EN };

// Garde-fou (développement uniquement) : la progression est enregistrée par slug
// et par index de réponse, communs aux deux langues. Une leçon ajoutée d'un seul
// côté, ou une bonne réponse déplacée, fausserait la progression et le quiz.
if (process.env.NODE_ENV !== "production") {
  const shape = (f: Formation) => JSON.stringify(f.pillars.map((p) => [p.slug, p.lessons.map((l) => [
    l.slug, l.number, l.quiz.map((q) => [q.options.length, q.answer]), l.caseStudy.responses.map((r) => !!r.right),
  ])]));
  if (shape(BATIR_SUR_LE_ROC) !== shape(BATIR_SUR_LE_ROC_EN)) {
    console.error("[Académie] Les versions FR et EN de « Bâtir sur le roc » ne correspondent plus (leçons, slugs ou réponses du quiz). Voir batir-sur-le-roc.en.ts.");
  }
  const storyShape = (list: Story[]) => JSON.stringify(list.map((st) => [
    st.slug, st.lessons, st.takeaways.length, st.chapters.map((c) => [!!c.epilogue, c.blocks.map((b) => b.type)]),
  ]));
  if (storyShape(STORIES) !== storyShape(STORIES_EN)) {
    console.error("[Académie] Les versions FR et EN des histoires ne correspondent plus (slugs, chapitres ou blocs). Voir stories.en.ts.");
  }
}

/** La formation, ses leçons et les textes d'interface dans la langue de l'utilisateur. */
export function useFormationLocale() {
  const { locale } = useI18n();
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";
  const formation = FORMATIONS[lang];
  const allLessons = formation.pillars.flatMap((p) => p.lessons.map((l) => ({ lesson: l, pillar: p })));
  const find = (slug: string) => {
    const i = allLessons.findIndex((x) => x.lesson.slug === slug);
    if (i === -1) return null;
    return { ...allLessons[i], previous: allLessons[i - 1]?.lesson ?? null, next: allLessons[i + 1]?.lesson ?? null };
  };
  /** Même leçon (même slug) dans la langue courante. */
  const localize = <T extends Lesson | Pillar | null>(item: T): T => {
    if (!item) return item;
    if ("lessons" in item) return (formation.pillars.find((p) => p.slug === item.slug) ?? item) as T;
    return (find(item.slug)?.lesson ?? item) as T;
  };
  const stories = lang === "en" ? STORIES_EN : STORIES;
  /** Même histoire (même slug) dans la langue courante. */
  const localizeStory = (story: Story): Story => stories.find((st) => st.slug === story.slug) ?? story;
  return { lang, formation, allLessons, find, localize, stories, localizeStory, ui: lang === "en" ? en : fr };
}
