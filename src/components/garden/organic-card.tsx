import { cn } from "@/lib/utils";

interface OrganicCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function OrganicCard({ children, className, innerClassName }: OrganicCardProps) {
  return (
    <article className={cn("organic-card", className)}>
      <div className={cn("organic-card__inner", innerClassName)}>{children}</div>
    </article>
  );
}

interface OrganicPanelProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function OrganicPanel({ children, className, innerClassName }: OrganicPanelProps) {
  return (
    <div className={cn("organic-panel", className)}>
      <div className={cn("organic-panel__inner", innerClassName)}>{children}</div>
    </div>
  );
}
