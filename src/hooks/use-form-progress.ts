"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sauvegarde de la progression d'un formulaire en plusieurs étapes.
 *
 * Sur un téléphone modeste, ouvrir la galerie ou l'appareil photo peut faire
 * recharger l'onglet par le système : le membre revenait au début de
 * l'inscription, photos perdues. La progression est donc gardée dans
 * sessionStorage — elle survit au rechargement de l'onglet, mais s'efface à sa
 * fermeture (photos et selfie ne restent pas sur un appareil partagé) — et
 * expire au bout de 24 h.
 *
 * - `key` : null tant que la sauvegarde ne doit pas démarrer (identité inconnue…).
 * - `snapshot` : à mémoïser (useMemo) — il est sérialisé à chaque changement.
 * - `heavyKeys` : abandonnées si le quota du navigateur est dépassé (photos…),
 *   pour garder au moins les réponses.
 * - Ne jamais y mettre de mot de passe.
 */

const VERSION = 1;
const MAX_AGE_MS = 24 * 3600 * 1000;
const WRITE_DELAY_MS = 300;

export function useFormProgress<T extends Record<string, unknown>>({
  key,
  snapshot,
  onRestore,
  heavyKeys = [],
}: {
  key: string | null;
  snapshot: T;
  onRestore: (saved: Partial<T>) => void;
  heavyKeys?: (keyof T)[];
}): { restored: boolean; clear: () => void } {
  const [ready, setReady] = useState(false);
  /** Une progression a été reprise (pour l'annoncer au membre). */
  const [restored, setRestored] = useState(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const clearedRef = useRef(false);
  const heavyRef = useRef(heavyKeys);
  heavyRef.current = heavyKeys;

  // Reprise : une seule fois, dès que la clé est connue, AVANT toute écriture
  // (sinon le formulaire vide écraserait la sauvegarde).
  useEffect(() => {
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { v?: number; at?: number; data?: Partial<T> };
        if (parsed?.v === VERSION && typeof parsed.at === "number" && Date.now() - parsed.at < MAX_AGE_MS && parsed.data) {
          onRestoreRef.current(parsed.data);
          setRestored(true);
        } else {
          sessionStorage.removeItem(key);
        }
      }
    } catch { /* stockage indisponible (navigation privée…) : formulaire normal */ }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!key || !ready || clearedRef.current) return;
    const id = setTimeout(() => {
      if (clearedRef.current) return;
      const write = (data: Partial<T>) =>
        sessionStorage.setItem(key, JSON.stringify({ v: VERSION, at: Date.now(), data }));
      try {
        write(snapshot);
      } catch {
        // Quota dépassé : on garde au moins les réponses, sans les images.
        try {
          const light: Partial<T> = { ...snapshot };
          for (const k of heavyRef.current) delete light[k];
          write(light);
        } catch { /* rien à faire */ }
      }
    }, WRITE_DELAY_MS);
    return () => clearTimeout(id);
  }, [key, ready, snapshot]);

  /** À appeler quand le formulaire a abouti : plus rien n'est gardé ni réécrit. */
  const clear = useCallback(() => {
    clearedRef.current = true;
    if (!key) return;
    try { sessionStorage.removeItem(key); } catch { /* rien */ }
  }, [key]);

  return { restored, clear };
}
