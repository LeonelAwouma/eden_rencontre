"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Étoiles en lecture seule (la dernière peut être partielle : 4,3 → 4 pleines + 30 %). */
export function Stars({ value, className, size = "w-4 h-4" }: { value: number; className?: string; size?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block", size)} aria-hidden="true">
            <Star className={cn("absolute inset-0 w-full h-full text-primary/25")} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("w-full h-full fill-amber-400 text-amber-400")} style={{ minWidth: "100%" }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Saisie d'une note : groupe de boutons radio (clavier : flèches, tactile : grandes zones). */
export function StarInput({
  value, onChange, labels, ariaLabel,
}: { value: number; onChange: (v: number) => void; labels: string[]; ariaLabel: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); }
  };

  return (
    <div>
      <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKey} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} / 5 — ${labels[i - 1]}`}
            tabIndex={value === i || (!value && i === 1) ? 0 : -1}
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            className="p-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-transform active:scale-90"
          >
            <Star className={cn("w-9 h-9 sm:w-10 sm:h-10 transition-colors", i <= shown ? "fill-amber-400 text-amber-400" : "text-primary/25")} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-medium text-primary" aria-live="polite">{shown ? labels[shown - 1] : ""}</p>
    </div>
  );
}

/** Répartition des notes : une barre par étoile, la plus haute en premier. */
export function Distribution({ distribution, count }: { distribution: Record<1 | 2 | 3 | 4 | 5, number>; count: number }) {
  return (
    <ul className="space-y-1.5 w-full">
      {([5, 4, 3, 2, 1] as const).map((n) => {
        const pct = count ? Math.round((distribution[n] / count) * 100) : 0;
        return (
          <li key={n} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-6 tabular-nums text-right">{n} ★</span>
            <span className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden" role="presentation">
              <span className="block h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 tabular-nums">{distribution[n]}</span>
          </li>
        );
      })}
    </ul>
  );
}
