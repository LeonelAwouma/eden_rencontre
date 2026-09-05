/**
 * Faune du Jardin — silhouettes d'oiseaux SVG, légères et vectorielles.
 *
 * Règles de l'atelier (cf. direction artistique Eden) :
 *  · silhouettes en `currentColor` → la couleur vient du parent (forest / sage / olive)
 *  · opacités basses : ce sont des ornements, jamais des illustrations principales
 *  · tout est `aria-hidden` — aucun oiseau ne porte de sens
 *  · trois oiseaux maximum par écran, sinon on encombre
 */

/** Colombe de profil, ailes déployées — l'emblème du jardin. */
export function Dove({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 72" fill="none" className={className} aria-hidden="true">
      {/* Corps + tête + queue, d'un seul trait */}
      <path
        d="M62 34
           C 68 26, 78 22, 88 24
           C 94 25, 98 28, 100 32
           L 112 30
           L 101 38
           C 100 48, 92 56, 80 58
           C 68 60, 54 56, 44 48
           L 20 54
           L 36 40
           L 14 38
           L 40 32
           C 46 30, 55 30, 62 34 Z"
        fill="currentColor"
      />
      {/* Aile haute, plus claire — donne le volume sans surcharger */}
      <path
        d="M60 36
           C 62 26, 58 14, 46 6
           C 56 10, 68 18, 74 30
           C 72 36, 66 38, 60 36 Z"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Œil, creusé dans la silhouette */}
      <circle cx="90" cy="31" r="1.6" fill="hsl(42 35% 97%)" />
    </svg>
  );
}

/** Colombe portant un rameau d'olivier — clin d'œil à l'alliance. */
export function DoveWithOliveBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 76" fill="none" className={className} aria-hidden="true">
      <g fill="currentColor">
        <path
          d="M62 36
             C 68 28, 78 24, 88 26
             C 94 27, 98 30, 100 34
             L 112 32
             L 101 40
             C 100 50, 92 58, 80 60
             C 68 62, 54 58, 44 50
             L 20 56
             L 36 42
             L 14 40
             L 40 34
             C 46 32, 55 32, 62 36 Z"
        />
        <path d="M60 38 C 62 28, 58 16, 46 8 C 56 12, 68 20, 74 32 C 72 38, 66 40, 60 38 Z" opacity="0.55" />
      </g>
      <circle cx="90" cy="33" r="1.6" fill="hsl(42 35% 97%)" />
      {/* Rameau tenu au bec */}
      <path d="M112 32 Q 128 28 144 20" stroke="hsl(95 28% 38%)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="124" cy="27" rx="6" ry="2.6" fill="hsl(145 22% 62%)" opacity="0.75" transform="rotate(-22 124 27)" />
      <ellipse cx="134" cy="24" rx="5.5" ry="2.4" fill="hsl(152 22% 48%)" opacity="0.7" transform="rotate(-28 134 24)" />
      <ellipse cx="130" cy="31" rx="5" ry="2.2" fill="hsl(145 22% 62%)" opacity="0.6" transform="rotate(14 130 31)" />
      <circle cx="142" cy="21" r="2.2" fill="hsl(95 28% 38%)" opacity="0.55" />
    </svg>
  );
}

/** Petit passereau posé sur une brindille feuillue. */
export function PerchedBird({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 130 110"
      fill="none"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
    >
      {/* Brindille */}
      <path d="M2 94 C 34 88, 68 90, 128 82" stroke="hsl(152 22% 42%)" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <ellipse cx="24" cy="88" rx="9" ry="4" fill="hsl(152 22% 48%)" opacity="0.4" transform="rotate(-28 24 88)" />
      <ellipse cx="104" cy="85" rx="8" ry="3.6" fill="hsl(95 28% 38%)" opacity="0.32" transform="rotate(-18 104 85)" />

      {/* Queue */}
      <ellipse cx="28" cy="60" rx="21" ry="5" fill="currentColor" opacity="0.75" transform="rotate(22 28 60)" />
      {/* Corps */}
      <ellipse cx="58" cy="54" rx="23" ry="17" fill="currentColor" transform="rotate(-14 58 54)" />
      {/* Aile repliée */}
      <ellipse cx="55" cy="57" rx="15" ry="7.5" fill="currentColor" opacity="0.45" transform="rotate(16 55 57)" />
      {/* Tête */}
      <circle cx="80" cy="36" r="12" fill="currentColor" />
      {/* Bec */}
      <path d="M91 33 L 105 37 L 91 41 Z" fill="hsl(38 45% 55%)" />
      {/* Œil */}
      <circle cx="84" cy="33" r="1.9" fill="hsl(42 35% 97%)" />
      {/* Pattes */}
      <path d="M60 70 L 59 87 M69 69 L 71 86" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** Hirondelle en vol plané, ailes en flèche. */
export function Swallow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 54" fill="none" className={className} aria-hidden="true">
      <path
        d="M50 30
           C 44 20, 30 10, 6 4
           C 20 16, 34 24, 46 30
           C 34 28, 20 30, 4 36
           C 22 34, 38 36, 48 42
           L 44 52 L 54 44 L 62 50 L 58 40
           C 68 34, 82 30, 98 28
           C 82 24, 66 24, 54 30 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Oiseaux lointains — la nuée qu'on devine dans le ciel.
 * Deux arcs par oiseau, rien de plus : c'est ce qui se lit le mieux en très petit.
 */
export function DistantBirds({ className, count = 5 }: { className?: string; count?: number }) {
  const flock = [
    { x: 6, y: 30, s: 1, o: 0.9 },
    { x: 34, y: 14, s: 0.78, o: 0.7 },
    { x: 58, y: 38, s: 0.62, o: 0.6 },
    { x: 82, y: 20, s: 0.5, o: 0.5 },
    { x: 104, y: 44, s: 0.42, o: 0.4 },
    { x: 126, y: 28, s: 0.34, o: 0.32 },
  ].slice(0, Math.max(1, Math.min(count, 6)));

  return (
    <svg viewBox="0 0 150 60" fill="none" className={className} aria-hidden="true">
      {flock.map((b, i) => (
        <path
          key={i}
          d="M0 6 C4 -1 8 -1 11 5 C14 -1 18 -1 22 6"
          transform={`translate(${b.x} ${b.y}) scale(${b.s})`}
          stroke="currentColor"
          strokeWidth={1.6 / b.s}
          strokeLinecap="round"
          opacity={b.o}
        />
      ))}
    </svg>
  );
}

/** Un seul oiseau lointain — pour glisser un accent dans un titre ou un coin. */
export function DistantBird({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M1 8 C5 0 9 0 12 7 C15 0 19 0 23 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Nid tressé avec deux œufs — la promesse du foyer. */
export function Nest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" fill="none" className={className} aria-hidden="true">
      {/* Œufs */}
      <ellipse cx="38" cy="32" rx="8" ry="10" fill="hsl(42 40% 92%)" />
      <ellipse cx="52" cy="34" rx="7.5" ry="9.5" fill="hsl(38 30% 88%)" />
      {/* Coupe du nid */}
      <path
        d="M8 30 C 8 48, 26 58, 45 58 C 64 58, 82 48, 82 30 C 70 40, 58 43, 45 43 C 32 43, 20 40, 8 30 Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Brins tressés */}
      <path d="M12 34 C 28 44, 62 44, 78 34" stroke="hsl(42 35% 97%)" strokeWidth="1" opacity="0.3" fill="none" />
      <path d="M16 42 C 30 50, 60 50, 74 42" stroke="hsl(42 35% 97%)" strokeWidth="0.8" opacity="0.22" fill="none" />
    </svg>
  );
}
