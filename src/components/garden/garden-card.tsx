"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DistantBird } from "./birds";

interface GardenCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
  index?: number;
}

export function GardenCard({ icon: Icon, title, description, className, index = 0 }: GardenCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative p-8 sm:p-10 eden-leaf-card", className)}
    >
      {/* Un oiseau minuscule se pose dans le coin au survol */}
      <div
        className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        aria-hidden="true"
      >
        <DistantBird className="w-5 h-auto text-sage" />
      </div>

      <div className="relative z-10">
        {/* Médaillon de l'icône */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-6 sm:mb-8 ring-1 ring-primary/12 group-hover:bg-primary/12 group-hover:ring-primary/20 transition-colors duration-500">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary transition-colors duration-500" />
        </div>

        <h3 className="font-headline text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed text-base sm:text-lg font-body">{description}</p>
      </div>

      {/* Filet végétal qui s'allume en bas de carte */}
      <div
        className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-sage/0 to-transparent group-hover:via-sage/45 transition-all duration-700"
        aria-hidden="true"
      />
    </motion.article>
  );
}
