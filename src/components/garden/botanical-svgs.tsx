/** Illustrations botaniques SVG — légères, vectorielles, optimisées GPU */

export function RoseBloom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <circle cx="40" cy="40" r="8" fill="hsl(345 45% 82%)" opacity="0.9" />
      {[0, 72, 144, 216, 288].map((rot) => (
        <ellipse
          key={rot}
          cx="40"
          cy="22"
          rx="10"
          ry="16"
          fill="hsl(345 50% 88%)"
          transform={`rotate(${rot} 40 40)`}
        />
      ))}
      <ellipse cx="40" cy="18" rx="7" ry="12" fill="hsl(345 55% 85%)" />
      <ellipse cx="52" cy="26" rx="7" ry="12" fill="hsl(345 48% 87%)" transform="rotate(72 40 40)" />
      <ellipse cx="48" cy="40" rx="7" ry="12" fill="hsl(345 52% 86%)" transform="rotate(144 40 40)" />
      <ellipse cx="32" cy="40" rx="7" ry="12" fill="hsl(345 50% 88%)" transform="rotate(216 40 40)" />
      <ellipse cx="28" cy="26" rx="7" ry="12" fill="hsl(345 47% 89%)" transform="rotate(288 40 40)" />
      <circle cx="40" cy="40" r="5" fill="hsl(38 45% 55%)" opacity="0.5" />
    </svg>
  );
}

export function LavenderSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 100" fill="none" className={className} aria-hidden="true">
      <path d="M24 95 Q22 60 24 30 Q26 10 24 2" stroke="hsl(152 22% 42%)" strokeWidth="1.5" strokeLinecap="round" />
      {[8, 22, 36, 50, 64, 78].map((y, i) => (
        <g key={y}>
          <ellipse cx={i % 2 === 0 ? 16 : 32} cy={y} rx="5" ry="8" fill="hsl(265 30% 82%)" opacity="0.85" />
          <ellipse cx={i % 2 === 0 ? 32 : 16} cy={y + 6} rx="4" ry="7" fill="hsl(265 28% 86%)" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

export function SageLeaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 90" fill="none" className={className} aria-hidden="true">
      <path
        d="M30 88 C10 70 4 45 8 22 C12 8 22 2 30 4 C38 2 48 8 52 22 C56 45 50 70 30 88 Z"
        fill="hsl(152 22% 48%)"
        opacity="0.85"
      />
      <path d="M30 12 V82" stroke="hsl(158 32% 28%)" strokeWidth="1" opacity="0.4" />
      <path d="M30 20 Q20 30 14 38 M30 32 Q40 42 46 50 M30 48 Q18 58 12 66" stroke="hsl(158 32% 28%)" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

export function DelicateFlower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 50" fill="none" className={className} aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((rot) => (
        <ellipse key={rot} cx="25" cy="14" rx="6" ry="11" fill="hsl(42 40% 92%)" transform={`rotate(${rot} 25 25)`} />
      ))}
      <circle cx="25" cy="25" r="5" fill="hsl(38 50% 60%)" opacity="0.6" />
    </svg>
  );
}

export function VineCurve({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 80" fill="none" className={className} aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path
        d="M4 60 C30 55 50 20 90 18 C120 16 150 40 196 12"
        stroke="hsl(152 22% 42%)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <ellipse cx="50" cy="38" rx="8" ry="5" fill="hsl(152 22% 48%)" opacity="0.6" transform="rotate(-30 50 38)" />
      <ellipse cx="90" cy="18" rx="7" ry="4" fill="hsl(152 25% 45%)" opacity="0.55" transform="rotate(20 90 18)" />
      <ellipse cx="140" cy="28" rx="8" ry="5" fill="hsl(152 20% 50%)" opacity="0.5" transform="rotate(-15 140 28)" />
      <circle cx="170" cy="16" r="4" fill="hsl(345 45% 85%)" opacity="0.7" />
    </svg>
  );
}

export function FloralCorner({ className, position, style }: { className?: string; position: "tl" | "tr" | "bl" | "br"; style?: React.CSSProperties }) {
  const transforms: Record<string, string> = {
    tl: "",
    tr: "scaleX(-1)",
    bl: "scaleY(-1)",
    br: "scale(-1)",
  };
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} style={{ ...style, transform: transforms[position] }} aria-hidden="true">
      <path d="M4 80 Q4 4 80 4" stroke="hsl(152 22% 42%)" strokeWidth="1" opacity="0.35" fill="none" />
      <path d="M8 60 Q20 30 55 12" stroke="hsl(152 22% 42%)" strokeWidth="0.8" opacity="0.25" fill="none" />
      <ellipse cx="70" cy="18" rx="10" ry="6" fill="hsl(152 22% 48%)" opacity="0.5" transform="rotate(-25 70 18)" />
      <ellipse cx="22" cy="55" rx="9" ry="5" fill="hsl(152 25% 45%)" opacity="0.45" transform="rotate(40 22 55)" />
      <circle cx="85" cy="8" r="6" fill="hsl(345 48% 86%)" opacity="0.75" />
      <circle cx="12" cy="75" r="5" fill="hsl(265 28% 86%)" opacity="0.65" />
      <ellipse cx="45" cy="8" rx="5" ry="9" fill="hsl(42 40% 90%)" opacity="0.6" transform="rotate(15 45 8)" />
    </svg>
  );
}

export function OrganicDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 24" fill="none" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path d="M0 12 H140" stroke="hsl(152 18% 52%)" strokeWidth="0.8" opacity="0.35" />
      <path d="M260 12 H400" stroke="hsl(152 18% 52%)" strokeWidth="0.8" opacity="0.35" />
      <ellipse cx="175" cy="12" rx="6" ry="10" fill="hsl(345 45% 88%)" opacity="0.8" transform="rotate(-20 175 12)" />
      <ellipse cx="200" cy="12" rx="5" ry="9" fill="hsl(152 22% 55%)" opacity="0.7" />
      <ellipse cx="225" cy="12" rx="6" ry="10" fill="hsl(265 28% 86%)" opacity="0.75" transform="rotate(20 225 12)" />
      <circle cx="188" cy="8" r="3" fill="hsl(38 50% 55%)" opacity="0.4" />
      <circle cx="212" cy="8" r="3" fill="hsl(38 50% 55%)" opacity="0.4" />
    </svg>
  );
}

export function GardenFoliageCluster({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 400" fill="none" className={className} aria-hidden="true">
      <path d="M150 380 Q130 280 145 180 Q155 100 150 20" stroke="hsl(152 22% 38%)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <ellipse cx="120" cy="120" rx="35" ry="55" fill="hsl(152 22% 42%)" opacity="0.35" transform="rotate(-35 120 120)" />
      <ellipse cx="185" cy="160" rx="30" ry="50" fill="hsl(158 28% 32%)" opacity="0.3" transform="rotate(25 185 160)" />
      <ellipse cx="110" cy="220" rx="28" ry="48" fill="hsl(152 20% 48%)" opacity="0.32" transform="rotate(-20 110 220)" />
      <ellipse cx="190" cy="280" rx="32" ry="52" fill="hsl(152 25% 40%)" opacity="0.28" transform="rotate(30 190 280)" />
      <circle cx="165" cy="90" r="14" fill="hsl(345 48% 86%)" opacity="0.65" />
      <circle cx="95" cy="180" r="11" fill="hsl(265 28% 86%)" opacity="0.55" />
      <circle cx="200" cy="240" r="12" fill="hsl(42 40% 90%)" opacity="0.6" />
      <circle cx="130" cy="310" r="10" fill="hsl(345 45% 88%)" opacity="0.5" />
    </svg>
  );
}

/** Colombe stylisée, ailes déployées — clin d'œil discret au Jardin d'Éden. */
export function DoveInFlight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 56" fill="none" className={className} aria-hidden="true">
      <path
        d="M50 30
           C 42 12, 22 6, 2 12
           C 20 18, 34 26, 46 34
           C 34 30, 20 32, 6 38
           C 22 38, 36 40, 48 46
           C 60 40, 74 38, 90 38
           C 76 32, 62 30, 50 34
           C 62 26, 76 18, 94 12
           C 74 6, 54 12, 50 30 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LianeVertical({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 200" fill="none" className={className} aria-hidden="true">
      <path d="M20 200 Q25 150 18 100 Q12 50 20 4" stroke="hsl(152 22% 42%)" strokeWidth="1" opacity="0.3" />
      <ellipse cx="28" cy="60" rx="6" ry="4" fill="hsl(152 22% 48%)" opacity="0.45" transform="rotate(30 28 60)" />
      <ellipse cx="12" cy="110" rx="5" ry="3" fill="hsl(152 25% 45%)" opacity="0.4" transform="rotate(-25 12 110)" />
      <ellipse cx="26" cy="155" rx="6" ry="4" fill="hsl(152 20% 50%)" opacity="0.4" transform="rotate(20 26 155)" />
      <circle cx="18" cy="40" r="4" fill="hsl(345 45% 86%)" opacity="0.6" />
      <circle cx="24" cy="130" r="3.5" fill="hsl(265 28% 86%)" opacity="0.55" />
    </svg>
  );
}
