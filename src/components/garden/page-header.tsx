"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SkyFlock } from "./bird-scene";
import { DistantBird } from "./birds";

/**
 * En-tête commun aux pages publiques.
 *
 * Toutes les pages répétaient le même bloc (sur-titre, titre, séparateur, chapô)
 * avec de légères dérives. Ce composant fixe le rythme vertical une bonne fois,
 * et pose la nuée d'oiseaux au même endroit partout.
 */
export function PageHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  children,
  align = "center",
  flock = true,
  className,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  children?: React.ReactNode;
  align?: "center" | "left";
  flock?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const centered = align === "center";

  return (
    <div className={cn("relative", className)}>
      {/* Nuée lointaine, calée en haut à droite — jamais devant le texte */}
      {flock && (
        <SkyFlock
          count={4}
          className="hidden sm:block absolute -top-6 right-0 lg:right-8 w-32 lg:w-44 opacity-[0.13]"
        />
      )}

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative z-10 max-w-3xl space-y-5 sm:space-y-6",
          centered ? "mx-auto text-center" : "text-left"
        )}
      >
        {eyebrow && (
          <div className={cn("flex", centered ? "justify-center" : "justify-start")}>
            <span className="eden-eyebrow">
              <span className="w-7 h-px bg-deep-eden/25" aria-hidden="true" />
              {eyebrow}
              <DistantBird className="w-3.5 h-auto text-deep-eden/35" />
            </span>
          </div>
        )}

        <h1 className="font-headline text-[2.15rem] leading-[1.1] sm:text-5xl lg:text-[3.4rem] font-bold text-foreground tracking-tight">
          {title}
          {highlight && <span className="italic text-primary"> {highlight}</span>}
        </h1>

        <OliveBirdDivider className={centered ? "mx-auto" : ""} />

        {subtitle && (
          <p
            className={cn(
              "text-base sm:text-lg text-muted-foreground leading-relaxed font-body",
              centered ? "max-w-2xl mx-auto" : "max-w-2xl"
            )}
          >
            {subtitle}
          </p>
        )}

        {children}
      </motion.div>
    </div>
  );
}

/** Rameau d'olivier centré, avec un oiseau minuscule posé dessus. */
export function OliveBirdDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 26"
      fill="none"
      className={cn("w-40 sm:w-52 h-6 opacity-40", className)}
      aria-hidden="true"
    >
      {/* Rameau */}
      <path d="M6 17 L86 17" stroke="hsl(155 42% 18%)" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M134 17 L214 17" stroke="hsl(155 42% 18%)" strokeWidth="0.6" strokeLinecap="round" />
      {/* Olives */}
      <ellipse cx="110" cy="17" rx="22" ry="6.5" fill="hsl(145 22% 62% / 0.28)" transform="rotate(-8 110 17)" />
      <ellipse cx="110" cy="17" rx="4.5" ry="9" fill="hsl(95 28% 38% / 0.14)" />
      <circle cx="92" cy="15" r="2" fill="hsl(95 28% 38% / 0.2)" />
      <circle cx="128" cy="15" r="2" fill="hsl(95 28% 38% / 0.2)" />
      {/* L'oiseau, posé au-dessus */}
      <path
        d="M100 7 C104 1 108 1 110 6 C112 1 116 1 120 7"
        stroke="hsl(155 42% 18%)"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}
