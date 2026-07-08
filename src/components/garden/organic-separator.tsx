import { cn } from "@/lib/utils";

interface OrganicSeparatorProps {
  className?: string;
}

export function OrganicSeparator({ className }: OrganicSeparatorProps) {
  return (
    <div className={cn("w-full max-w-md mx-auto py-2 flex items-center justify-center", className)} aria-hidden="true">
      <svg viewBox="0 0 200 24" className="w-full h-6 opacity-35" fill="none">
        {/* Left line */}
        <path d="M0 12 L60 12" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
        {/* Center olive leaf */}
        <ellipse cx="100" cy="12" rx="24" ry="8" fill="hsl(145 22% 62% / 0.2)" transform="rotate(-8 100 12)" />
        <ellipse cx="100" cy="12" rx="5" ry="11" fill="hsl(95 28% 38% / 0.1)" />
        {/* Small berries */}
        <circle cx="82" cy="10" r="2" fill="hsl(95 28% 38% / 0.15)" />
        <circle cx="118" cy="10" r="2" fill="hsl(95 28% 38% / 0.15)" />
        {/* Right line */}
        <path d="M140 12 L200 12" stroke="hsl(155 42% 18%)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}