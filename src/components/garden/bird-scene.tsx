"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dove, DistantBirds, PerchedBird, Swallow } from "./birds";

/**
 * Scènes d'oiseaux animées.
 *
 * Le mouvement est toujours en deux couches : le parent porte la trajectoire,
 * l'enfant porte le battement d'ailes. Ça évite d'écraser une transform par l'autre.
 * Tout se désactive sous `prefers-reduced-motion`.
 */

/** Nuée lointaine, immobile ou dérivant très lentement dans le ciel d'une section. */
export function SkyFlock({
  className,
  count = 4,
  drift = true,
}: {
  className?: string;
  count?: number;
  drift?: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("pointer-events-none select-none", className)} aria-hidden="true">
      <DistantBirds
        count={count}
        className={cn("w-full h-auto text-forest", !reduced && drift && "animate-flock-drift")}
      />
    </div>
  );
}

/** Une colombe qui traverse la scène, très lentement, une seule fois par cycle. */
export function GlidingDove({
  className,
  delay = 0,
  duration = 46,
}: {
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      className={cn("absolute w-12 xl:w-14 text-forest animate-dove-flight will-change-transform", className)}
      style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      aria-hidden="true"
    >
      <div className="animate-wing-beat origin-center">
        <Dove className="w-full h-auto" />
      </div>
    </div>
  );
}

/** Une hirondelle qui file dans l'autre sens — plus vive, plus discrète. */
export function GlidingSwallow({
  className,
  delay = 0,
  duration = 34,
}: {
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      className={cn("absolute w-8 xl:w-10 text-forest/70 animate-swallow-flight will-change-transform", className)}
      style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      aria-hidden="true"
    >
      <div className="animate-wing-beat-quick origin-center">
        <Swallow className="w-full h-auto" />
      </div>
    </div>
  );
}

/** Oiseau posé sur sa brindille, avec un léger balancement de la branche. */
export function PerchOrnament({
  className,
  flip,
  sway = true,
}: {
  className?: string;
  flip?: boolean;
  sway?: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("pointer-events-none select-none", className)} aria-hidden="true">
      <PerchedBird
        flip={flip}
        className={cn("w-full h-auto text-forest", !reduced && sway && "animate-perch-sway")}
      />
    </div>
  );
}
