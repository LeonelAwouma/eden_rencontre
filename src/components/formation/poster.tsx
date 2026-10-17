"use client";

import Image from "next/image";
import { Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Poster } from "@/lib/formation/types";
import { useFormationLocale } from "@/lib/formation/ui";

/**
 * Affiche illustrée d'une leçon ou d'un pilier : le texte fait partie de
 * l'image, elle est donc toujours montrée entière (jamais recadrée) et
 * s'ouvre en grand au clic pour être lue confortablement.
 */
export function PosterFigure({ poster, sizes, priority = false, className }: {
  poster: Poster; sizes: string; priority?: boolean; className?: string;
}) {
  const { ui } = useFormationLocale();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={ui.openPoster}
          className={cn("group relative block w-full overflow-hidden rounded-2xl border border-border bg-[#F6F3EA] shadow-[0_10px_40px_rgba(38,70,52,0.10)] cursor-zoom-in", className)}>
          <Image src={poster.src} alt={poster.alt} width={poster.width} height={poster.height} sizes={sizes} priority={priority}
            className="block w-full h-auto" />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/95 text-[12.5px] font-semibold text-foreground shadow-sm opacity-90 group-hover:opacity-100">
            <Expand className="w-3.5 h-3.5 text-primary" /> {ui.openPoster}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(96vw,1000px)] max-h-[94vh] overflow-y-auto p-2 sm:p-3 bg-[#FBF8F1]">
        <DialogTitle className="sr-only">{poster.alt}</DialogTitle>
        <Image src={poster.src} alt={poster.alt} width={poster.width} height={poster.height} sizes="(min-width: 1040px) 1000px, 96vw"
          className="block w-full h-auto rounded-lg" />
      </DialogContent>
    </Dialog>
  );
}
