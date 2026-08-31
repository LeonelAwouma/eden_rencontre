"use client";

export function VerifiedBadgeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 260 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Scalloped rosette shape */}
      <path
        d="M130 10 L148 30 L172 18 L178 44 L206 46 L200 72 L224 86 L210 108
           L228 128 L208 142 L218 166 L194 170 L194 196 L170 190 L158 214
           L138 200 L130 226 L122 200 L102 214 L90 190 L66 196 L66 170
           L42 166 L52 142 L32 128 L50 108 L36 86 L60 72 L54 46 L82 44
           L88 18 L112 30 Z"
        fill="#486B46"
      />
      {/* White checkmark */}
      <path
        d="M108 132 L128 152 L164 108"
        stroke="white"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
