"use client";

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

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F8F5F2] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#D1D5DB]" />
      </div>
      <p className="text-sm sm:text-base font-semibold text-[#777777] text-center">{title}</p>
      <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1.5 font-medium text-center max-w-[280px]">
        {description}
      </p>
    </div>
  );
}