"use client";

import { VerifiedBadgeIcon } from "./icons/VerifiedBadgeIcon";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export function VerifiedBadge({ size = 16, className = "" }: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center shrink-0 ${className}`}
      title="Profil vérifié"
      aria-label="Profil vérifié"
    >
      <VerifiedBadgeIcon size={size} />
    </span>
  );
}
