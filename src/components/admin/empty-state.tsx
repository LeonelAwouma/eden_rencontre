"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F8F5F2] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
      </div>
      <p className="text-sm sm:text-base font-semibold text-[#777777] text-center">{title}</p>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium text-center max-w-[280px]">
        {description}
      </p>
      {action && (
        <Link href={action.href}
          className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-[#3A5A38] transition-all shadow-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}