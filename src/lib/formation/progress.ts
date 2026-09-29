"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Progression dans « Bâtir sur le roc », conservée dans le navigateur du membre,
 * par compte. Les leçons terminées sont aussi enregistrées sur sa fiche
 * (profiles.formation_completed) : elles le suivent d'un appareil à l'autre et
 * ouvrent l'accès au matching. Les réflexions personnelles sont privées : elles
 * ne quittent jamais l'appareil.
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

// Ancienne clé, commune à tous les comptes de l'appareil : reprise une fois par le
// premier compte qui s'y connecte, puis supprimée.
const LEGACY_KEY = "gaa-formation-batir-sur-le-roc-v1";
const keyFor = (uid: string | null) => (uid ? `${LEGACY_KEY}:${uid}` : LEGACY_KEY);
const EVENT = "gaa-formation-progress";
const EMPTY: FormationProgress = { completed: [], quiz: {}, reflections: {}, positions: {}, lastLesson: null };

function read(key: string): FormationProgress {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw);
    return {
      completed: p.completed || [], quiz: p.quiz || {}, reflections: p.reflections || {},
      positions: p.positions || {}, lastLesson: typeof p.lastLesson === "string" ? p.lastLesson : null,
    };
  } catch { return EMPTY; }
}

function write(key: string, p: FormationProgress) {
  try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* stockage indisponible : la session continue sans sauvegarde */ }
  window.dispatchEvent(new Event(EVENT));
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Clé du compte connecté ; reprend l'ancienne progression commune si le compte n'en a pas. */
function resolveKey(uid: string | null): string {
  const key = keyFor(uid);
  if (!uid) return key;
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(key)) localStorage.setItem(key, legacy);
    if (legacy) localStorage.removeItem(LEGACY_KEY);
  } catch { /* stockage indisponible */ }
  return key;
}

async function pushCompleted(uid: string, completed: string[]) {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").update({ formation_completed: completed }).eq("id", uid);
  if (error) console.error("[Eden] progression de la formation non enregistrée :", error.message);
}

/** Réunit les leçons terminées sur cet appareil et sur la fiche du membre. */
async function syncWithServer(uid: string, key: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from("profiles").select("formation_completed").eq("id", uid).maybeSingle();
  if (error) { console.error("[Eden] progression de la formation illisible :", error.message); return; }
  const remote: string[] = (data as { formation_completed?: string[] } | null)?.formation_completed ?? [];
  const local = read(key);
  const merged = [...new Set([...local.completed, ...remote])];
  if (merged.length !== local.completed.length) write(key, { ...local, completed: merged });
  if (merged.length !== remote.length) await pushCompleted(uid, merged);
}

/**
 * `persist: false` (aperçu admin) : la progression reste en mémoire, le temps de
 * la page. Rien n'est lu ni écrit dans le navigateur, pour ne jamais mêler un
 * essai de l'admin à la progression d'un membre qui utiliserait le même appareil.
 */
export function useFormationProgress({ persist = true }: { persist?: boolean } = {}) {
  const [progress, setProgress] = useState<FormationProgress>(EMPTY);
  const [ready, setReady] = useState(false);
  // Vrai une fois la progression de la fiche récupérée (ou impossible à récupérer) :
  // le verrou du matching attend ce moment pour ne pas bloquer à tort.
  const [synced, setSynced] = useState(false);
  const keyRef = useRef<string>(LEGACY_KEY);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!persist) { setReady(true); setSynced(true); return; }
    let active = true;
    const sync = () => setProgress(read(keyRef.current));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    (async () => {
      const uid = await currentUserId();
      if (!active) return;
      uidRef.current = uid;
      keyRef.current = resolveKey(uid);
      sync(); setReady(true);
      if (uid) await syncWithServer(uid, keyRef.current).catch(() => {});
      if (active) setSynced(true);
    })();
    return () => { active = false; window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [persist]);

  const update = useCallback(
    (fn: (p: FormationProgress) => FormationProgress) => (persist ? write(keyRef.current, fn(read(keyRef.current))) : setProgress(fn)),
    [persist]
  );

  const setCompleted = useCallback((slug: string, done: boolean) => {
    update((p) => ({
      ...p, completed: done ? [...new Set([...p.completed, slug])] : p.completed.filter((s) => s !== slug),
    }));
    if (persist && uidRef.current) void pushCompleted(uidRef.current, read(keyRef.current).completed);
  }, [update, persist]);

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

  return { progress, ready, synced, setCompleted, answer, resetQuiz, saveReflection, savePosition };
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
