import { cn } from "@/lib/utils";
import { DecorSprig } from "./decor-sprig";

type Corner = "tl" | "tr" | "bl" | "br";
type Size = "sm" | "md" | "lg" | "xl";

interface GardenFrameProps {
  children: React.ReactNode;
  className?: string;
  corners?: Corner[] | "all";
  size?: Size;
  opacity?: number;
}

const sizeMap: Record<Size, string> = {
  sm: "w-24 h-24 sm:w-32 sm:h-32",
  md: "w-32 h-32 sm:w-44 sm:h-44",
  lg: "w-40 h-40 sm:w-56 sm:h-56",
  xl: "w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72",
};

// Décalés par la position, pas par translate : DecorSprig occupe déjà `transform`.
const cornerPos: Record<Corner, string> = {
  tl: "-top-3 -left-3",
  tr: "-top-3 -right-3",
  bl: "-bottom-3 -left-3",
  br: "-bottom-3 -right-3",
};

export function GardenFrame({
  children,
  className,
  corners = "all",
  size = "lg",
  opacity = 0.92,
}: GardenFrameProps) {
  const activeCorners: Corner[] =
    corners === "all" ? ["tl", "tr", "bl", "br"] : corners;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {activeCorners.map((pos) => (
          <DecorSprig
            key={pos}
            position={pos}
            className={cn("absolute", sizeMap[size], cornerPos[pos])}
            style={{ opacity }}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Coins imposants sans wrapper — pour sections existantes */
export function ImposingFloralCorners({
  className,
  size = "lg",
  corners = "all",
  opacity = 0.88,
}: {
  className?: string;
  size?: Size;
  corners?: Corner[] | "all";
  opacity?: number;
}) {
  const activeCorners: Corner[] =
    corners === "all" ? ["tl", "tr", "bl", "br"] : corners;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-visible", className)} aria-hidden="true">
      {activeCorners.map((pos) => (
        <DecorSprig
          key={pos}
          position={pos}
          className={cn("absolute", sizeMap[size], cornerPos[pos])}
          style={{ opacity }}
        />
      ))}
    </div>
  );
}
