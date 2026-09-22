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
}

const KEY = "gaa-formation-batir-sur-le-roc-v1";
const EVENT = "gaa-formation-progress";
const EMPTY: FormationProgress = { completed: [], quiz: {}, reflections: {} };

function read(): FormationProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw);
    return { completed: p.completed || [], quiz: p.quiz || {}, reflections: p.reflections || {} };
  } catch { return EMPTY; }
}

function write(p: FormationProgress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* stockage indisponible : la session continue sans sauvegarde */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useFormationProgress() {
  const [progress, setProgress] = useState<FormationProgress>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setProgress(read());
    sync(); setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);

  const update = useCallback((fn: (p: FormationProgress) => FormationProgress) => write(fn(read())), []);

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

  return { progress, ready, setCompleted, answer, resetQuiz, saveReflection };
}
