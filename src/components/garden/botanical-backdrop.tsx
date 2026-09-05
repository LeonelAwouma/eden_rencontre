import { cn } from "@/lib/utils";
import { GardenFoliageCluster, LianeVertical } from "./botanical-svgs";
import { DistantBirds } from "./birds";

interface BotanicalBackdropProps {
  className?: string;
  variant?: "hero" | "section" | "footer";
}

/**
 * Décor de fond : feuillages en filigrane et oiseaux lointains.
 *
 * Les opacités restent sous 0.09 — c'est un fond, pas une illustration.
 * Rien n'est interactif, rien n'est annoncé aux lecteurs d'écran.
 */
export function BotanicalBackdrop({ className, variant = "section" }: BotanicalBackdropProps) {
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none z-0", className)}
      aria-hidden="true"
    >
      {variant === "hero" && (
        <>
          <div className="absolute -top-[8%] -left-[6%] w-[46%] sm:w-[30%] opacity-[0.07] animate-breathe">
            <GardenFoliageCluster className="w-full h-auto" />
          </div>
          <div className="absolute top-[14%] -right-[8%] w-[52%] sm:w-[34%] opacity-[0.05] rotate-12 animate-sway-slow">
            <GardenFoliageCluster className="w-full h-auto" />
          </div>
          <div className="absolute top-[16%] left-[38%] w-40 sm:w-56 opacity-[0.11] text-forest animate-flock-drift">
            <DistantBirds count={4} className="w-full h-auto" />
          </div>
        </>
      )}

      {variant === "section" && (
        <>
          <div className="absolute top-0 right-[3%] w-24 sm:w-32 opacity-[0.09] -scale-x-100">
            <LianeVertical className="w-full h-auto" />
          </div>
          <div className="absolute bottom-0 left-[2%] w-20 sm:w-28 opacity-[0.07]">
            <LianeVertical className="w-full h-auto" />
          </div>
          <div className="absolute top-[8%] right-[14%] w-28 sm:w-36 opacity-[0.1] text-forest">
            <DistantBirds count={3} className="w-full h-auto" />
          </div>
        </>
      )}

      {variant === "footer" && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between opacity-[0.06]">
          <GardenFoliageCluster className="w-1/4 h-auto -rotate-12 origin-bottom-left" />
          <GardenFoliageCluster className="w-1/5 h-auto rotate-12 origin-bottom-right -scale-x-100" />
        </div>
      )}
    </div>
  );
}
