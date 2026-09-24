"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveQuestionnaireAnswers } from "@/lib/onboarding";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Sauvegarde automatique des réponses au questionnaire (espace membre).
 * Appeler `markDirty()` avant chaque modification : l'envoi part après
 * `delayMs` d'inactivité, et ce qui reste est envoyé quand l'onglet est
 * masqué, la page quittée ou le composant démonté. Les envois sont
 * sérialisés pour qu'une ancienne version n'écrase jamais une plus récente.
 */
export function useQuestionnaireAutosave(answers: Record<string, any>, delayMs = 800) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const answersRef = useRef(answers);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<unknown> | null>(null);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (inflightRef.current) await inflightRef.current;
    if (!dirtyRef.current) return true;
    dirtyRef.current = false;
    setStatus("saving");
    const request = saveQuestionnaireAnswers(answersRef.current);
    inflightRef.current = request;
    const res = await request;
    if (inflightRef.current === request) inflightRef.current = null;
    if (!res.ok) {
      dirtyRef.current = true; // renvoyé à la prochaine modification
      setStatus("error");
      return false;
    }
    setStatus(dirtyRef.current ? "saving" : "saved");
    return true;
  }, []);

  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  /** Nouvelle session d'édition : rien en attente, indicateur remis à zéro. */
  const reset = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    dirtyRef.current = false;
    setStatus("idle");
  }, []);

  useEffect(() => {
    answersRef.current = answers;
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, delayMs);
  }, [answers, delayMs, flush]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") void flush(); };
    const onPageHide = () => { void flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      void flush();
    };
  }, [flush]);

  return { status, flush, markDirty, reset };
}
