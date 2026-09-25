"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Progression dans « Bâtir sur le roc », conservée dans le navigateur du membre.
 * Les réflexions personnelles sont privées : elles ne quittent jamais l'appareil.
 */
export interface FormationProgress {
  completed: string[];
  quiz: Record<string, Record<number, number>>;
  reflections: Record<string, string>;
  /** Position de lecture par leçon (0 → 1), enregistrée au fil du défilement. */
  positions: Record<string, number>;
  /** Dernière leçon ouverte : « Continuer » y ramène. */
  lastLesson: string | null;
}

const KEY = "gaa-formation-batir-sur-le-roc-v1";
const EVENT = "gaa-formation-progress";
const EMPTY: FormationProgress = { completed: [], quiz: {}, reflections: {}, positions: {}, lastLesson: null };

function read(): FormationProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw);
    return {
      completed: p.completed || [], quiz: p.quiz || {}, reflections: p.reflections || {},
      positions: p.positions || {}, lastLesson: typeof p.lastLesson === "string" ? p.lastLesson : null,
    };
  } catch { return EMPTY; }
}

function write(p: FormationProgress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* stockage indisponible : la session continue sans sauvegarde */ }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * `persist: false` (aperçu admin) : la progression reste en mémoire, le temps de
 * la page. Rien n'est lu ni écrit dans le navigateur, pour ne jamais mêler un
 * essai de l'admin à la progression d'un membre qui utiliserait le même appareil.
 */
export function useFormationProgress({ persist = true }: { persist?: boolean } = {}) {
  const [progress, setProgress] = useState<FormationProgress>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!persist) { setReady(true); return; }
    const sync = () => setProgress(read());
    sync(); setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [persist]);

  const update = useCallback(
    (fn: (p: FormationProgress) => FormationProgress) => (persist ? write(fn(read())) : setProgress(fn)),
    [persist]
  );

  const setCompleted = useCallback((slug: string, done: boolean) => update((p) => ({
    ...p, completed: done ? [...new Set([...p.completed, slug])] : p.completed.filter((s) => s !== slug),
  })), [update]);

  const answer = useCallback((slug: string, question: number, option: number) => update((p) => ({
    ...p, quiz: { ...p.quiz, [slug]: { ...(p.quiz[slug] || {}), [question]: option } },
  })), [update]);

  const resetQuiz = useCallback((slug: string) => update((p) => {
    const quiz = { ...p.quiz }; delete quiz[slug];
    return { ...p, quiz };
  }), [update]);

  const saveReflection = useCallback((slug: string, text: string) => update((p) => ({
    ...p, reflections: { ...p.reflections, [slug]: text },
  })), [update]);

  /** Appelé pendant la lecture : mémorise la position et la leçon en cours. */
  const savePosition = useCallback((slug: string, ratio: number) => update((p) => ({
    ...p, lastLesson: slug, positions: { ...p.positions, [slug]: Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 1000 },
  })), [update]);

  return { progress, ready, setCompleted, answer, resetQuiz, saveReflection, savePosition };
}

/**
 * La formation est-elle vraiment commencée ? Ouvrir une leçon ne suffit pas :
 * il faut en avoir terminé une, en avoir lu une partie (plus de 5 %) ou avoir
 * répondu à une question de quiz. Détermine « Commencer » ou « Continuer ».
 */
export function hasStarted(p: FormationProgress): boolean {
  return p.completed.length > 0
    || Object.values(p.positions).some((r) => r > 0.05)
    || Object.values(p.quiz).some((answers) => Object.keys(answers).length > 0);
}
