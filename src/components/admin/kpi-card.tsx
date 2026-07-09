"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  accentColor: string;
  iconBg: string;
  trend?: { value: string; positive?: boolean };
  status?: string;
  index?: number;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  accentColor,
  iconBg,
  trend,
  status,
  index = 0,
}: KPICardProps) {
  const accentBorderMap: Record<string, string> = {
    blue: "border-l-[#4F7DF3]",
    orange: "border-l-[#38C172]",
    green: "border-l-[#38C172]",
    red: "border-l-[#F56565]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className={cn(
        "bg-white rounded-[20px] border border-[#E5E7EB] p-5 border-l-[3px] transition-all duration-300",
        "hover:border-[#86EFAC] hover:shadow-[0_4px_24px_rgba(56,193,114,0.08)] hover:-translate-y-0.5",
        accentBorderMap[accentColor] || "border-l-[#E5E7EB]"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-11 h-11 rounded-[14px] flex items-center justify-center",
            iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", accentColor === "blue" ? "text-[#4F7DF3]" : accentColor === "orange" ? "text-[#38C172]" : accentColor === "green" ? "text-[#38C172]" : "text-[#F56565]")} />
        </div>
        {trend && (
          <span
            className={cn(
              "text-[11px] font-bold px-2 py-0.5 rounded-full",
              trend.positive !== false
                ? "bg-[#38C172]/10 text-[#38C172]"
                : "bg-[#F56565]/10 text-[#F56565]"
            )}
          >
            {trend.value}
          </span>
        )}
        {status && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#38C172]/10 text-[#38C172]">
            {status}
          </span>
        )}
      </div>
      <p
        className="text-[36px] sm:text-[42px] font-bold text-[#1a1a1a] leading-none tracking-tight"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
      >
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="text-[13px] text-[#9CA3AF] font-medium mt-1.5">{title}</p>
    </motion.div>
  );
}