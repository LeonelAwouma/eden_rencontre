"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
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
      className={cn(
        "group relative p-8 sm:p-10 rounded-2xl",
        "garden-card",
        "hover:-translate-y-1",
        "transition-[border-color,box-shadow,transform] duration-500",
        className
      )}
    >
      {/* Decorative leaf corner */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
          <ellipse cx="20" cy="15" rx="12" ry="6" fill="hsl(145 22% 62% / 0.12)" transform="rotate(-30 20 15)" />
          <ellipse cx="25" cy="25" rx="10" ry="5" fill="hsl(95 28% 38% / 0.08)" transform="rotate(20 25 25)" />
        </svg>
      </div>

      <div className="relative z-10">
        {/* Icon container — botanical glow */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-deep-eden/8 flex items-center justify-center mb-6 sm:mb-8 group-hover:bg-deep-eden/12 transition-colors duration-500 ring-1 ring-deep-eden/8">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-deep-eden group-hover:text-olive transition-colors duration-500" />
        </div>

        <h3 className="font-headline text-xl sm:text-2xl font-bold mb-4 sm:mb-5 text-foreground tracking-tight">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-base sm:text-lg font-body">{description}</p>
      </div>

      {/* Bottom sage accent line on hover */}
      <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-sage/0 to-transparent group-hover:via-sage/30 transition-all duration-700" aria-hidden="true" />
    </motion.article>
  );
}