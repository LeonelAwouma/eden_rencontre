"use client";

import { useEffect, useState } from "react";

/**
 * `useIsMobile` (use-mobile.tsx) est figé sur 768 px et reste pour ses usages
 * existants. La chrome membre a besoin du seuil `lg` de Tailwind (1024 px), car
 * c'est là que basculent la sidebar, la barre inférieure *et* le découpage de la
 * messagerie — les aligner supprime la bande mixte 768-1023 px.
 */
export function useMediaQuery(query: string): boolean {
  // `false` au premier rendu : identique côté serveur et côté client, donc pas
  // d'avertissement d'hydratation. Les composants qui ne tolèrent pas ce premier
  // rendu doivent se reposer sur les classes Tailwind, pas sur ce hook.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Vrai à partir du breakpoint `lg` de Tailwind (1024 px). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
