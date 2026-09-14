"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * En-tête commun aux pages publiques.
 *
 * Toutes les pages répétaient le même bloc (sur-titre, titre, séparateur, chapô)
 * avec de légères dérives. Ce composant fixe le rythme vertical une bonne fois.
 */
export function PageHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  children,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  children?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const centered = align === "center";

  return (
    <div className={cn("relative", className)}>
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
              <span className="w-7 h-px bg-deep-eden/25" aria-hidden="true" />
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

const oliveBirdSizes = {
  sm: { wrap: "w-60 sm:w-72", emblem: "w-24 sm:w-28", sizes: "112px" },
  md: { wrap: "w-72 sm:w-96", emblem: "w-32 sm:w-36", sizes: "144px" },
  lg: { wrap: "w-80 sm:w-[26rem]", emblem: "w-44 sm:w-52", sizes: "208px" },
} as const;

/**
 * Séparateur floral — l'emblème "alliance" (bouquet, anneaux, cœur) découpé de
 * decor.webp, posé sur un filet qui s'étire avec le conteneur.
 *
 * Le filet court derrière l'emblème et non jusqu'à ses bords : le feuillage
 * l'occulte en passant, comme dans l'illustration d'origine. L'emblème est
 * recadré pour que le filet tombe pile sur son axe.
 */
export function OliveBirdDivider({
  className,
  size = "sm",
}: {
  className?: string;
  size?: keyof typeof oliveBirdSizes;
}) {
  const s = oliveBirdSizes[size];
  return (
    <div
      className={cn("relative flex items-center justify-center", s.wrap, className)}
      aria-hidden="true"
    >
      <span
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{ backgroundColor: "#5b715d", opacity: 0.55 }}
      />
      <Image
        src="/decor-emblem.webp"
        alt=""
        width={502}
        height={203}
        sizes={s.sizes}
        className={cn("relative shrink-0 h-auto", s.emblem)}
      />
    </div>
  );
}
