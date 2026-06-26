// Ornements de marque Eden — dessinés sur mesure (anneaux entrelacés + croix, fioritures).

export function Monogram({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 56 48" fill="none" className={className} style={style} aria-hidden="true">
      {/* Deux alliances entrelacées */}
      <circle cx="22" cy="29" r="13" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="34" cy="29" r="13" stroke="currentColor" strokeWidth="1.6" />
      {/* Croix au sommet */}
      <path d="M28 3 V15 M22.5 8 H33.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 14" fill="none" className={className} aria-hidden="true">
      <path d="M2 7 H86" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M134 7 H218" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M96 7 Q103 1 110 7 Q103 13 96 7 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M110 7 Q117 1 124 7 Q117 13 110 7 Z" stroke="currentColor" strokeWidth="1" />
      <circle cx="89" cy="7" r="1.4" fill="currentColor" />
      <circle cx="131" cy="7" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Motif de vitrail répétable (filigrane derrière un panneau / fond de chat)
export function VitrailPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" fill="none" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <pattern id="vitrail" width="44" height="60" patternUnits="userSpaceOnUse">
          <path d="M22 2 C35 14 35 24 22 30 C9 24 9 14 22 2 Z" stroke="currentColor" strokeWidth="0.9" fill="none" />
          <path d="M0 30 C13 42 13 52 0 58 M44 30 C31 42 31 52 44 58" stroke="currentColor" strokeWidth="0.9" fill="none" />
          <circle cx="22" cy="44" r="1.1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="600" height="600" fill="url(#vitrail)" />
    </svg>
  );
}
