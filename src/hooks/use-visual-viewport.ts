"use client";

import { useEffect } from "react";

/**
 * Publie la taille du *viewport visuel* dans `--app-vh` / `--app-vt`.
 *
 * Pourquoi `100dvh` ne suffit pas : à l'ouverture du clavier, Chrome Android
 * rétrécit le viewport de mise en page (donc `dvh` suit), mais **iOS Safari ne
 * rétrécit que le viewport visuel**. Un écran en `h-[100dvh]` y reste donc plus
 * haut que la zone visible et son champ de saisie passe sous le clavier — c'est
 * exactement le défaut à corriger dans les conversations et le forum.
 *
 * `--app-vt` (offsetTop) compense le décalage que iOS applique quand il fait
 * défiler le viewport visuel pour révéler le champ actif.
 */
export function useVisualViewportHeight(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) return;

    const apply = () => {
      root.style.setProperty("--app-vh", `${vv.height}px`);
      root.style.setProperty("--app-vt", `${vv.offsetTop}px`);
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--app-vh");
      root.style.removeProperty("--app-vt");
    };
  }, [enabled]);
}
