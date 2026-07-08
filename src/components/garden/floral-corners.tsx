import { cn } from "@/lib/utils";
import { FloralCorner } from "./botanical-svgs";
import { ImposingFloralCorner } from "./imposing-floral-svgs";

type Variant = "delicate" | "imposing";
type Corner = "tl" | "tr" | "bl" | "br";

interface FloralCornersProps {
  className?: string;
  intensity?: "subtle" | "normal";
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "xl";
  corners?: Corner[] | "all";
}

const imposingSize = {
  sm: "w-28 h-28 sm:w-36 sm:h-36",
  md: "w-36 h-36 sm:w-48 sm:h-48",
  lg: "w-44 h-44 sm:w-60 sm:h-60",
  xl: "w-52 h-52 sm:w-72 sm:h-72",
};

const delicateSize = {
  sm: "w-16 h-16 sm:w-20 sm:h-20",
  md: "w-16 h-16 sm:w-24 sm:h-24",
  lg: "w-20 h-20 sm:w-28 sm:h-28",
  xl: "w-24 h-24 sm:w-32 sm:h-32",
};

const cornerPos: Record<Corner, string> = {
  tl: "absolute -top-2 -left-2 sm:-top-3 sm:-left-3",
  tr: "absolute -top-2 -right-2 sm:-top-3 sm:-right-3",
  bl: "absolute -bottom-2 -left-2 sm:-bottom-3 sm:-left-3",
  br: "absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3",
};

export function FloralCorners({
  className,
  intensity = "normal",
  variant = "delicate",
  size = "md",
  corners = "all",
}: FloralCornersProps) {
  const opacity = intensity === "subtle" ? 0.45 : variant === "imposing" ? 0.9 : 0.7;
  const activeCorners: Corner[] = corners === "all" ? ["tl", "tr", "bl", "br"] : corners;
  const sizes = variant === "imposing" ? imposingSize : delicateSize;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-visible", className)} aria-hidden="true">
      {activeCorners.map((pos) =>
        variant === "imposing" ? (
          <ImposingFloralCorner
            key={pos}
            position={pos}
            className={cn(cornerPos[pos], sizes[size])}
            style={{ opacity }}
          />
        ) : (
          <FloralCorner
            key={pos}
            position={pos}
            className={cn(cornerPos[pos], sizes[size])}
            style={{ opacity }}
          />
        )
      )}
    </div>
  );
}
