"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RoseBloom, SageLeaf, DelicateFlower, LavenderSprig } from "./botanical-svgs";

type BotanicalType = "rose" | "leaf" | "flower" | "lavender";

const components: Record<BotanicalType, React.FC<{ className?: string }>> = {
  rose: RoseBloom,
  leaf: SageLeaf,
  flower: DelicateFlower,
  lavender: LavenderSprig,
};

interface FloatingBotanicalProps {
  type: BotanicalType;
  className?: string;
  size?: "sm" | "md" | "lg";
  animation?: "sway" | "wind" | "float";
  delay?: number;
}

const sizeMap = { sm: "w-8 h-8", md: "w-14 h-14", lg: "w-20 h-20" };
const animMap = {
  sway: "animate-gentle-sway",
  wind: "animate-wind-drift",
  float: "animate-float-up",
};

export function FloatingBotanical({
  type,
  className,
  size = "md",
  animation = "sway",
  delay = 0,
}: FloatingBotanicalProps) {
  const reduced = useReducedMotion();
  const Component = components[type];

  return (
    <div
      className={cn(
        "pointer-events-none select-none will-change-transform",
        sizeMap[size],
        !reduced && animMap[animation],
        className
      )}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden="true"
    >
      <Component className="w-full h-full" />
    </div>
  );
}
