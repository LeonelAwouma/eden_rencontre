"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DoveInFlight } from "./botanical-svgs";

interface FlyingDoveProps {
  className?: string;
  delay?: number;
}

/** Une colombe qui glisse très lentement à travers la scène, en clin d'œil discret au Jardin d'Éden. */
export function FlyingDove({ className, delay = 0 }: FlyingDoveProps) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div
      className={cn("absolute w-10 sm:w-12 text-forest animate-dove-flight will-change-transform", className)}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden="true"
    >
      <DoveInFlight className="w-full h-auto" />
    </div>
  );
}
