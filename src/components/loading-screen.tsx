import { cn } from "@/lib/utils";

/**
 * Écran de chargement commun (espace membre, connexion, inscription, Académie…).
 * Le monogramme — deux alliances et la croix — se dessine trait par trait, un
 * arc tourne autour et une barre indéterminée court dessous. Sans JavaScript :
 * uniquement du SVG et des animations CSS (globals.css, « eden-loader-* »),
 * figées si l'utilisateur a demandé à réduire les animations.
 */
export function LoadingScreen({ label, fullScreen = true, className }: {
  /** Message sous la marque (ex. « Ouverture de l'Académie… »). */
  label?: string;
  /** false : s'insère dans une zone existante au lieu d'occuper tout l'écran. */
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true"
      className={cn("flex flex-col items-center justify-center bg-background px-6",
        fullScreen ? "min-h-screen" : "py-24", className)}>
      <div className="eden-loader-fade flex flex-col items-center">
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Halo doux */}
          <span aria-hidden className="eden-loader-halo absolute inset-2 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(145 30% 55% / 0.22) 0%, transparent 70%)" }} />
          {/* Anneau + arc en rotation */}
          <svg aria-hidden viewBox="0 0 112 112" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="eden-loader-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#486B46" stopOpacity="0" />
                <stop offset="100%" stopColor="#486B46" />
              </linearGradient>
            </defs>
            <circle cx="56" cy="56" r="52" fill="none" stroke="#486B46" strokeOpacity="0.1" strokeWidth="2" />
            <g className="eden-loader-orbit">
              <circle cx="56" cy="56" r="52" fill="none" stroke="url(#eden-loader-arc)" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="90 237" />
            </g>
          </svg>
          {/* Monogramme dessiné */}
          <svg aria-hidden viewBox="0 0 56 48" fill="none" className="relative w-14 h-12 text-primary">
            <circle cx="22" cy="29" r="13" stroke="currentColor" strokeWidth="1.6"
              className="eden-loader-stroke" style={{ "--len": 82 } as React.CSSProperties} />
            <circle cx="34" cy="29" r="13" stroke="currentColor" strokeWidth="1.6"
              className="eden-loader-stroke" style={{ "--len": 82, animationDelay: "0.18s" } as React.CSSProperties} />
            <path d="M28 3 V15 M22.5 8 H33.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
              className="eden-loader-stroke" style={{ "--len": 23, animationDelay: "0.36s" } as React.CSSProperties} />
          </svg>
        </div>

        <p className="mt-6 font-headline text-[19px] font-bold tracking-tight text-foreground">
          Garden <span className="italic font-normal text-primary">of Alliance</span>
        </p>
        {label && <p className="mt-1.5 text-[13px] text-[#56615A] text-center">{label}</p>}

        {/* Barre indéterminée */}
        <div aria-hidden className="mt-5 w-40 h-[3px] rounded-full bg-primary/10 overflow-hidden">
          <div className="eden-loader-bar h-full w-2/5 rounded-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
        </div>
        <span className="sr-only">{label || "Chargement…"}</span>
      </div>
    </div>
  );
}
