"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Portraits 3:4, tous recadrés au même gabarit pour que la rotation reste stable. */
const PHOTOS = [
  "/couple-01.webp",
  "/couple-02.webp",
  "/couple-03.webp",
  "/couple-04.webp",
  "/couple-05.webp",
  "/couple-06.webp",
  "/couple-07.webp",
  "/couple-08.webp",
  "/couple-09.webp",
  "/couple-10.webp",
];

const BASE_DELAY = 4200;
const JITTER = 1600;

type Deck = {
  faces: [string, string];
  rotation: number;
  count: number;
};

function pickOther(exclude: readonly string[]): string {
  const pool = PHOTOS.filter((p) => !exclude.includes(p));
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Carte qui pivote sur elle-même pour révéler une photo tirée au hasard.
 *
 * Deux faces seulement : la face cachée reçoit la photo suivante *avant* la
 * rotation, ce qui la précharge et évite tout clignotement. La rotation
 * s'accumule (±180° à chaque tour) au lieu d'alterner entre 0 et 180 : le sens
 * peut ainsi changer d'un tour à l'autre sans saut de transformation.
 *
 * Un seul axe (Y) : combiner rotateX et rotateY laisserait la carte à l'envers
 * quand les deux atteignent 180°.
 */
export function HeroFlipCard({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [deck, setDeck] = useState<Deck>(() => ({
    faces: [PHOTOS[0], PHOTOS[1]],
    rotation: 0,
    count: 0,
  }));
  const paused = useRef(false);

  const advance = useCallback(() => {
    setDeck((d) => {
      const hidden = d.count % 2 === 1 ? 0 : 1;
      const faces: [string, string] = [d.faces[0], d.faces[1]];
      faces[hidden] = pickOther(d.faces);
      const dir = Math.random() < 0.5 ? 1 : -1;
      return { faces, rotation: d.rotation + 180 * dir, count: d.count + 1 };
    });
  }, []);

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        // On saute le tour si l'onglet est en arrière-plan ou au survol.
        if (!paused.current && !document.hidden) advance();
        schedule();
      }, BASE_DELAY + Math.random() * JITTER);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [advance, reduced]);

  // L'ombre et les arrondis vivent sur les faces, jamais sur le conteneur :
  // sinon on aperçoit un panneau vide derrière la carte pendant la rotation.
  const frame =
    "absolute inset-0 overflow-hidden rounded-[22px] sm:rounded-[28px] ring-1 ring-deep-eden/10 shadow-2xl shadow-deep-eden/20";
  const sizes = "(max-width: 1023px) 100vw, 50vw";

  if (reduced) {
    return (
      <div className={cn("relative", className)} role="img" aria-label={label}>
        <div className={frame}>
          <Image
            src={PHOTOS[0]}
            alt=""
            fill
            priority
            quality={86}
            sizes={sizes}
            className="object-cover object-center"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative", className)}
      style={{ perspective: 2400 }}
      role="img"
      aria-label={label}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* `absolute inset-0` et non `h-full` : la hauteur de la carte vient d'un
          min-height, contre lequel un pourcentage ne peut pas se résoudre (il
          retomberait à 0 et la carte disparaîtrait sur mobile). */}
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: deck.rotation }}
        transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {deck.faces.map((src, i) => (
          <div
            key={i}
            className={frame}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: i === 1 ? "rotateY(180deg)" : undefined,
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={i === 0}
              quality={86}
              sizes={sizes}
              className="object-cover object-center"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
