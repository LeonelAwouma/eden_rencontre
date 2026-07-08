"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GardenSectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "muted" | "garden";
  id?: string;
  showVines?: boolean;
}

export function GardenSection({
  children,
  className,
  variant = "default",
  id,
  showVines = false,
}: GardenSectionProps) {
  const reduced = useReducedMotion();

  const bgMap = {
    default: "bg-background",
    muted: "garden-section-muted",
    garden: "garden-section-garden",
  };

  return (
    <motion.section
      id={id}
      initial={reduced ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative overflow-hidden py-20 sm:py-32", bgMap[variant], className)}
    >
      {/* Subtle vine decorations */}
      {showVines && (
        <>
          <div className="absolute left-4 sm:left-12 top-0 bottom-0 w-6 opacity-20 pointer-events-none hidden md:block" aria-hidden="true">
            <svg viewBox="0 0 24 800" fill="none" className="h-full w-full">
              <path d="M12 0 Q8 100 12 200 Q16 300 12 400 Q8 500 12 600 Q16 700 12 800" stroke="hsl(145 22% 62% / 0.3)" strokeWidth="1" fill="none" />
              <ellipse cx="6" cy="150" rx="5" ry="3" fill="hsl(145 22% 62% / 0.08)" transform="rotate(-30 6 150)" />
              <ellipse cx="18" cy="350" rx="5" ry="3" fill="hsl(95 28% 38% / 0.06)" transform="rotate(25 18 350)" />
              <ellipse cx="6" cy="550" rx="4" ry="2.5" fill="hsl(145 22% 62% / 0.07)" transform="rotate(-20 6 550)" />
            </svg>
          </div>
          <div className="absolute right-4 sm:right-12 top-0 bottom-0 w-6 opacity-20 pointer-events-none hidden md:block" aria-hidden="true">
            <svg viewBox="0 0 24 800" fill="none" className="h-full w-full" style={{ transform: "scaleX(-1)" }}>
              <path d="M12 0 Q8 100 12 200 Q16 300 12 400 Q8 500 12 600 Q16 700 12 800" stroke="hsl(145 22% 62% / 0.3)" strokeWidth="1" fill="none" />
              <ellipse cx="6" cy="250" rx="5" ry="3" fill="hsl(145 22% 62% / 0.08)" transform="rotate(-30 6 250)" />
              <ellipse cx="18" cy="450" rx="5" ry="3" fill="hsl(95 28% 38% / 0.06)" transform="rotate(25 18 450)" />
              <ellipse cx="6" cy="650" rx="4" ry="2.5" fill="hsl(145 22% 62% / 0.07)" transform="rotate(-20 6 650)" />
            </svg>
          </div>
        </>
      )}

      {/* Organic top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sage/20 to-transparent" aria-hidden="true" />

      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}