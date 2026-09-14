"use client";

import Image from "next/image";
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

/**
 * Séparateur floral — deux traits fins encadrant le médaillon "alliance"
 * (bouquet, anneaux, cœur) recadré depuis decor.png.
 */
export function OliveBirdDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 sm:gap-3 w-48 sm:w-64", className)} aria-hidden="true">
      <span className="h-px flex-1" style={{ backgroundColor: "#617863", opacity: 0.5 }} />
      <div
        className="relative shrink-0 w-16 sm:w-20"
        style={{ aspectRatio: "495 / 170" }}
      >
        <Image
          src="/decor.png"
          alt=""
          fill
          sizes="80px"
          className="object-cover"
          style={{ objectPosition: "50% 48.8%" }}
        />
      </div>
      <span className="h-px flex-1" style={{ backgroundColor: "#617863", opacity: 0.5 }} />
    </div>
  );
}
