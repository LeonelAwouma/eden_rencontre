"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Marque « Nouveau » d'une entrée de menu.
 *
 * Toujours un `<span>` (le `<div>` de `ui/badge` est invalide dans un bouton ou un
 * lien). Accent doré de la charte : jamais `secondary`, qui est un gris quasi blanc.
 *
 *  - `pill` : pastille de texte (sidebar, tiroir, admin) ;
 *  - `dot`  : simple point doré pour les emplacements étroits (barre inférieure,
 *    sidebar admin réduite) — à positionner par l'appelant, le texte reste lu par
 *    les lecteurs d'écran.
 */
export function NewBadge({ variant = "pill", className }: { variant?: "pill" | "dot"; className?: string }) {
  const { t } = useI18n();

  if (variant === "dot") {
    return (
      <>
        <span aria-hidden="true" className={cn("block w-2.5 h-2.5 rounded-full bg-[#C6A15B] ring-2 ring-white", className)} />
        <span className="sr-only"> {t("whatsNew.new")}</span>
      </>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-[#C6A15B]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-[#8A6B2F]",
        className,
      )}
    >
      {t("whatsNew.new")}
    </span>
  );
}
