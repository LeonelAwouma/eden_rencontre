"use client";

import { useEffect, type ReactNode } from "react";
import { useVisualViewportHeight } from "@/hooks/use-visual-viewport";

/**
 * Coque plein écran d'une conversation sur téléphone et tablette (< 1024 px).
 *
 * Structure verticale stricte, comme WhatsApp : l'en-tête et la zone de saisie
 * sont `shrink-0`, seule la liste des messages (`flex-1 min-h-0 overflow-y-auto`)
 * défile. La page, elle, ne bouge jamais.
 *
 * Deux choix qui corrigent le défaut à la source (au lieu d'un z-index ou d'une
 * marge arbitraire) :
 *  - la hauteur suit le viewport *visuel* (`--app-vh`), donc le clavier iOS ne la
 *    laisse pas dépasser ; `100dvh` ne couvre que Chrome Android ;
 *  - le composant doit être rendu dans un portail sur `document.body` : le parent
 *    animé de la page applique un `transform`, qui deviendrait le bloc conteneur
 *    de ce `position: fixed` et le recalerait sur lui plutôt que sur l'écran.
 */
export function ImmersiveChatShell({ children }: { children: ReactNode }) {
  useVisualViewportHeight(true);

  // Aucun défilement de la page derrière la conversation (iOS compris).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <div
      role="region"
      className="fixed inset-x-0 z-50 flex flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)]"
      style={{ top: "var(--app-vt, 0px)", height: "var(--app-vh, 100dvh)" }}
    >
      {children}
    </div>
  );
}
