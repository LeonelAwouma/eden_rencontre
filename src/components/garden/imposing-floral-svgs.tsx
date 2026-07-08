/**
 * Compositions florales imposantes — style bouquet en coin,
 * avec gradients SVG pour un rendu botanique réaliste et raffiné.
 * Palette Eden : or doux, rose pâle, vert sauge & forêt, lavande.
 */

type Corner = "tl" | "tr" | "bl" | "br";

/** Shared SVG gradient definitions for all floral components */
function FloralDefs() {
  return (
    <defs>
      {/* Petal gradients */}
      <radialGradient id="petal-rose" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="hsl(345 55% 92%)" />
        <stop offset="40%" stopColor="hsl(345 48% 82%)" />
        <stop offset="100%" stopColor="hsl(345 42% 72%)" />
      </radialGradient>
      <radialGradient id="petal-gold" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="hsl(42 55% 88%)" />
        <stop offset="50%" stopColor="hsl(42 48% 74%)" />
        <stop offset="100%" stopColor="hsl(38 50% 62%)" />
      </radialGradient>
      <radialGradient id="petal-deep" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor="hsl(38 55% 85%)" />
        <stop offset="100%" stopColor="hsl(38 55% 58%)" />
      </radialGradient>
      <radialGradient id="petal-blush" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="hsl(345 40% 94%)" />
        <stop offset="100%" stopColor="hsl(345 50% 80%)" />
      </radialGradient>

      {/* Center gradients */}
      <radialGradient id="flower-center" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="hsl(42 52% 52%)" />
        <stop offset="60%" stopColor="hsl(38 52% 38%)" />
        <stop offset="100%" stopColor="hsl(38 52% 28%)" />
      </radialGradient>

      {/* Leaf gradients */}
      <linearGradient id="leaf-forest" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(158 32% 32%)" />
        <stop offset="100%" stopColor="hsl(158 32% 22%)" />
      </linearGradient>
      <linearGradient id="leaf-sage" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(152 22% 44%)" />
        <stop offset="100%" stopColor="hsl(152 22% 32%)" />
      </linearGradient>
      <linearGradient id="leaf-light" x1="0%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="hsl(152 18% 52%)" />
        <stop offset="100%" stopColor="hsl(152 18% 40%)" />
      </linearGradient>
      <linearGradient id="stem-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(152 22% 36%)" />
        <stop offset="100%" stopColor="hsl(152 22% 26%)" />
      </linearGradient>

      {/* Berry gradients */}
      <radialGradient id="berry-rose" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="hsl(345 48% 84%)" />
        <stop offset="100%" stopColor="hsl(345 48% 68%)" />
      </radialGradient>
      <radialGradient id="berry-lav" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="hsl(265 35% 86%)" />
        <stop offset="100%" stopColor="hsl(265 35% 70%)" />
      </radialGradient>
    </defs>
  );
}

/** Realistic flower with curved Bézier petals */
function ImposingFlower({
  cx,
  cy,
  scale = 1,
  rot = 0,
  variant = "rose",
}: {
  cx: number;
  cy: number;
  scale?: number;
  rot?: number;
  variant?: "rose" | "gold" | "blush";
}) {
  const petalGrad = variant === "gold" ? "url(#petal-gold)" : variant === "blush" ? "url(#petal-blush)" : "url(#petal-rose)";

  // Curved petal paths — each petal is a natural Bézier shape
  const petalPaths = [
    "M0 0 C-8 -14 -18 -28 -10 -42 C-4 -50 4 -50 10 -42 C18 -28 8 -14 0 0Z",
    "M0 0 C-8 -14 -18 -28 -10 -42 C-4 -50 4 -50 10 -42 C18 -28 8 -14 0 0Z",
    "M0 0 C-8 -14 -18 -28 -10 -42 C-4 -50 4 -50 10 -42 C18 -28 8 -14 0 0Z",
    "M0 0 C-8 -14 -18 -28 -10 -42 C-4 -50 4 -50 10 -42 C18 -28 8 -14 0 0Z",
    "M0 0 C-8 -14 -18 -28 -10 -42 C-4 -50 4 -50 10 -42 C18 -28 8 -14 0 0Z",
  ];
  const rotations = [0, 72, 144, 216, 288];

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${scale})`}>
      {/* Outer petals — larger, more translucent */}
      {rotations.map((angle, i) => (
        <path
          key={`outer-${angle}`}
          d="M0 0 C-10 -16 -22 -32 -12 -48 C-5 -56 5 -56 12 -48 C22 -32 10 -16 0 0Z"
          fill={petalGrad}
          opacity={0.35 + (i % 2) * 0.1}
          transform={`rotate(${angle + 36})`}
        />
      ))}

      {/* Main petals */}
      {petalPaths.map((d, i) => (
        <g key={`petal-${i}`} transform={`rotate(${rotations[i]})`}>
          <path d={d} fill={petalGrad} opacity={0.85 - i * 0.03} />
          {/* Petal vein */}
          <path
            d="M0 -4 Q0 -20 0 -35"
            stroke={variant === "gold" ? "hsl(38 50% 55%)" : "hsl(345 42% 65%)"}
            strokeWidth="0.6"
            fill="none"
            opacity="0.25"
          />
          {/* Inner highlight */}
          <path
            d="M0 -8 C-3 -18 -5 -28 -2 -36 C0 -38 2 -38 4 -36 C7 -28 5 -18 2 -8Z"
            fill="hsl(0 0% 100%)"
            opacity="0.08"
          />
        </g>
      ))}

      {/* Inner petals — tighter spiral */}
      {[0, 90, 180, 270].map((angle) => (
        <path
          key={`inner-${angle}`}
          d="M0 0 C-4 -8 -8 -16 -4 -22 C-1 -25 1 -25 4 -22 C8 -16 4 -8 0 0Z"
          fill={variant === "gold" ? "url(#petal-deep)" : "url(#petal-rose)"}
          opacity="0.6"
          transform={`rotate(${angle + 45})`}
        />
      ))}

      {/* Flower center */}
      <circle cx="0" cy="0" r="10" fill="url(#flower-center)" />

      {/* Stamen dots — organic arrangement */}
      {[0, 50, 100, 150, 200, 250, 300, 340].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const stamenR = 5.5;
        const sx = parseFloat((Math.cos(rad) * stamenR).toFixed(4));
        const sy = parseFloat((Math.sin(rad) * stamenR).toFixed(4));
        return (
          <circle
            key={`stamen-${angle}`}
            cx={sx}
            cy={sy}
            r="1.6"
            fill="hsl(42 52% 55%)"
            opacity="0.7"
          />
        );
      })}

      {/* Center highlight */}
      <circle cx="-2" cy="-2" r="3" fill="hsl(0 0% 100%)" opacity="0.12" />
    </g>
  );
}

/** Single botanical leaf with vein detail */
function BotanicalLeaf({
  cx,
  cy,
  rx,
  ry,
  rot = 0,
  gradient = "leaf-sage",
  opacity = 0.8,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
  gradient?: "leaf-forest" | "leaf-sage" | "leaf-light";
  opacity?: number;
}) {
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradient})`} opacity={opacity} />
      {/* Central vein */}
      <line
        x1={cx}
        y1={cy - ry * 0.8}
        x2={cx}
        y2={cy + ry * 0.7}
        stroke="hsl(158 32% 22%)"
        strokeWidth="0.5"
        opacity="0.2"
      />
      {/* Side veins */}
      {[-0.4, -0.1, 0.2].map((pos, i) => (
        <path
          key={i}
          d={`M${cx} ${cy + ry * pos} Q${cx - rx * 0.6} ${cy + ry * (pos - 0.15)} ${cx - rx * 0.8} ${cy + ry * (pos - 0.1)}`}
          stroke="hsl(158 32% 22%)"
          strokeWidth="0.3"
          fill="none"
          opacity="0.15"
        />
      ))}
    </g>
  );
}

/** Bouquet en L — coin inférieur gauche du viewBox */
function FloralBouquetBL() {
  return (
    <g>
      {/* === ARRIÈRE-PLAN : Grandes feuilles allongées === */}
      <path
        d="M8 310 C30 280 20 220 45 170 C60 135 35 90 55 50 C65 30 50 15 40 8"
        fill="url(#leaf-forest)"
        opacity="0.9"
      />
      {/* Vein detail */}
      <path
        d="M35 280 C45 240 40 180 52 120 C58 80 50 40 45 15"
        stroke="hsl(158 32% 18%)"
        strokeWidth="0.6"
        fill="none"
        opacity="0.15"
      />

      <path
        d="M0 290 C25 260 15 200 50 155 C70 120 45 75 65 35"
        fill="url(#leaf-sage)"
        opacity="0.85"
      />
      <path
        d="M30 320 C55 290 40 240 75 195 C95 165 80 120 100 70 C108 50 90 30 80 12"
        fill="url(#leaf-forest)"
        opacity="0.75"
      />
      <path
        d="M60 330 C90 300 75 250 110 210 C125 185 115 145 130 100"
        fill="url(#leaf-sage)"
        opacity="0.8"
      />

      {/* === FEUILLES RONDUES — avec veines === */}
      <BotanicalLeaf cx={120} cy={280} rx={22} ry={14} rot={-25} gradient="leaf-light" />
      <BotanicalLeaf cx={95} cy={240} rx={18} ry={12} rot={15} gradient="leaf-light" opacity={0.85} />
      <BotanicalLeaf cx={175} cy={220} rx={20} ry={13} rot={-10} gradient="leaf-light" />
      <BotanicalLeaf cx={200} cy={175} rx={16} ry={11} rot={20} gradient="leaf-light" opacity={0.8} />
      <BotanicalLeaf cx={155} cy={130} rx={18} ry={12} rot={-30} gradient="leaf-light" />
      <BotanicalLeaf cx={220} cy={120} rx={15} ry={10} rot={10} gradient="leaf-light" opacity={0.75} />

      {/* === PETITES FEUILLES D'ACCENT === */}
      <ellipse cx={55} cy={250} rx={8} ry={5} fill="url(#leaf-sage)" opacity="0.6" transform="rotate(-40 55 250)" />
      <ellipse cx={140} cy={260} rx={7} ry={4.5} fill="url(#leaf-forest)" opacity="0.55" transform="rotate(30 140 260)" />
      <ellipse cx={185} cy={145} rx={6} ry={4} fill="url(#leaf-sage)" opacity="0.5" transform="rotate(-15 185 145)" />

      {/* === TIGES & BRANCHES === */}
      <path d="M240 85 C255 65 265 45 270 20" stroke="url(#stem-grad)" strokeWidth="1.4" fill="none" opacity="0.6" />
      <path d="M255 110 C270 85 280 60 288 35" stroke="url(#stem-grad)" strokeWidth="1" fill="none" opacity="0.45" />
      <path d="M225 135 Q240 115 250 95" stroke="url(#stem-grad)" strokeWidth="0.8" fill="none" opacity="0.35" />

      {/* === BAIES — avec gradient réaliste === */}
      {[
        [270, 18, "berry-rose", 4.5],
        [262, 38, "berry-lav", 3.8],
        [280, 52, "berry-rose", 4],
        [290, 30, "berry-lav", 3.2],
        [275, 68, "berry-rose", 3.5],
        [255, 55, "berry-lav", 2.8],
        [248, 78, "berry-rose", 3],
      ].map(([x, y, grad, r], i) => (
        <g key={`berry-${i}`}>
          <circle cx={x as number} cy={y as number} r={r as number} fill={`url(#${grad})`} opacity="0.88" />
          {/* Berry highlight */}
          <circle cx={(x as number) - 1} cy={(y as number) - 1} r={(r as number) * 0.35} fill="hsl(0 0% 100%)" opacity="0.15" />
        </g>
      ))}

      {/* === PETIT BOURGEON (rosebud) === */}
      <g transform="translate(245 90) rotate(-15) scale(0.8)">
        <ellipse cx="0" cy="0" rx="5" ry="8" fill="url(#petal-blush)" opacity="0.7" />
        <path d="M-2 4 C-1 6 1 6 2 4" stroke="hsl(152 22% 36%)" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M0 -8 L0 -14" stroke="url(#stem-grad)" strokeWidth="0.8" opacity="0.4" />
      </g>

      {/* === FLEURS IMPOSANTES — premier plan === */}
      <ImposingFlower cx={88} cy={268} scale={1.15} rot={-8} variant="rose" />
      <ImposingFlower cx={168} cy={188} scale={0.92} rot={12} variant="gold" />
      <ImposingFlower cx={238} cy={108} scale={0.72} rot={-5} variant="blush" />

      {/* === FEUILLES DEVANT (premier plan) === */}
      <path
        d="M110 300 C130 275 125 250 145 230 C155 218 140 205 135 195"
        fill="url(#leaf-sage)"
        opacity="0.7"
      />
      <BotanicalLeaf cx={195} cy={250} rx={14} ry={9} rot={35} gradient="leaf-light" opacity={0.65} />
    </g>
  );
}

const cornerTransform: Record<Corner, string> = {
  bl: "",
  br: "scale(-1, 1) translate(-340, 0)",
  tl: "scale(1, -1) translate(0, -340)",
  tr: "scale(-1, -1) translate(-340, -340)",
};

export function ImposingFloralCorner({
  className,
  position = "bl",
  style,
}: {
  className?: string;
  position?: Corner;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 340 340"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
      preserveAspectRatio="xMinYMax meet"
    >
      <FloralDefs />
      <g transform={cornerTransform[position]}>
        <FloralBouquetBL />
      </g>
    </svg>
  );
}

/** Accent latéral — composition verticale pour sidebar / bords */
export function ImposingFloralSide({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 400"
      fill="none"
      className={className}
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <FloralDefs />

      {/* Long trailing leaves */}
      <path d="M30 390 C50 340 20 280 55 220 C75 175 40 120 70 60 C85 30 60 10 45 4" fill="url(#leaf-forest)" opacity="0.35" />
      <path d="M10 370 C35 310 15 250 50 190 C65 150 35 95 60 40" fill="url(#leaf-sage)" opacity="0.3" />

      {/* Vein detail on trailing leaf */}
      <path d="M40 360 C50 300 35 230 60 160 C72 110 50 60 55 20" stroke="hsl(158 32% 22%)" strokeWidth="0.4" fill="none" opacity="0.1" />

      {/* Flowers at intervals */}
      <ImposingFlower cx={75} cy={310} scale={0.85} rot={-5} variant="rose" />
      <ImposingFlower cx={55} cy={175} scale={0.65} rot={10} variant="gold" />
      <ImposingFlower cx={90} cy={70} scale={0.5} rot={-8} variant="blush" />

      {/* Accent leaves */}
      <BotanicalLeaf cx={120} cy={250} rx={16} ry={10} rot={-20} gradient="leaf-light" opacity={0.4} />
      <BotanicalLeaf cx={100} cy={130} rx={14} ry={9} rot={15} gradient="leaf-light" opacity={0.35} />

      {/* Berries */}
      <circle cx={130} cy={45} r={3.5} fill="url(#berry-rose)" opacity="0.65" />
      <circle cx={145} cy={60} r={3} fill="url(#berry-lav)" opacity="0.6" />
      <circle cx={115} cy={50} r={2.5} fill="url(#berry-rose)" opacity="0.5" />

      {/* Small buds */}
      <g transform="translate(110 95) rotate(-20) scale(0.6)">
        <ellipse cx="0" cy="0" rx="4" ry="7" fill="url(#petal-blush)" opacity="0.55" />
      </g>
    </svg>
  );
}

/** Fleur isolée grande — pour accents ponctuels */
export function ImposingSingleFlower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <FloralDefs />
      <ImposingFlower cx={60} cy={65} scale={1.2} rot={0} variant="rose" />
      <BotanicalLeaf cx={30} cy={90} rx={18} ry={10} rot={-30} gradient="leaf-sage" opacity={0.5} />
      <BotanicalLeaf cx={95} cy={85} rx={15} ry={9} rot={25} gradient="leaf-light" opacity={0.45} />
    </svg>
  );
}