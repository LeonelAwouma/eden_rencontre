"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[#D1D5DB]" />
      </div>
      <p className="text-[15px] font-semibold text-[#6B7280]">{title}</p>
      <p className="text-[13px] text-[#9CA3AF] mt-1 text-center max-w-xs">{description}</p>
    </motion.div>
  );
}