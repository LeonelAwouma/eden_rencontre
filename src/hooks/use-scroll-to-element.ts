"use client";

import { useEffect } from "react";

/**
 * Fait défiler jusqu'à l'élément `#id` dès qu'il existe dans le DOM, puis lui donne le focus.
 * Changer d'onglet puis appeler `scrollIntoView` immédiatement ne ferait rien : l'onglet n'est pas encore rendu et la
 * carte charge ses données. On réessaie donc (cadence courte, durée bornée) jusqu'à trouver la cible, puis on s'arrête.
 * `onDone(found)` est appelé une seule fois (found = false si la cible n'a jamais paru : ex. plus de proposition).
 */
export function useScrollToElement(targetId: string | null, enabled: boolean, onDone: (found: boolean) => void, maxMs = 6000) {
  useEffect(() => {
    if (!targetId || !enabled) return;
    let cancelled = false;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.focus({ preventScroll: true });
        onDone(true);
        return;
      }
      if (Date.now() - started >= maxMs) { onDone(false); return; }
      timer = setTimeout(() => requestAnimationFrame(tick), 100);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone volontairement exclu : appelé une fois
  }, [targetId, enabled, maxMs]);
}
