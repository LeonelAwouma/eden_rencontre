"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  accentColor: string;
  trend?: { value: string; positive?: boolean };
  status?: string;
  index?: number;
}

const accentConfig: Record<
  string,
  { border: string; iconText: string; iconBg: string; trendBg: string; trendText: string }
> = {
  blue: {
    border: "border-l-[#4F7DF3]",
    iconText: "text-[#4F7DF3]",
    iconBg: "bg-[#4F7DF3]/8",
    trendBg: "bg-[#4F7DF3]/8",
    trendText: "text-[#4F7DF3]",
  },
  orange: {
    border: "border-l-[#F59E0B]",
    iconText: "text-[#F59E0B]",
    iconBg: "bg-[#F59E0B]/8",
    trendBg: "bg-[#F59E0B]/8",
    trendText: "text-[#F59E0B]",
  },
  green: {
    border: "border-l-[#486B46]",
    iconText: "text-primary",
    iconBg: "bg-primary/8",
    trendBg: "bg-primary/8",
    trendText: "text-primary",
  },
  red: {
    border: "border-l-[#F56565]",
    iconText: "text-destructive",
    iconBg: "bg-destructive/8",
    trendBg: "bg-destructive/8",
    trendText: "text-destructive",
  },
};

export function KPICard({
  title,
  value,
  icon: Icon,
  accentColor,
  trend,
  status,
  index = 0,
}: KPICardProps) {
  const config = accentConfig[accentColor] || accentConfig.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className={cn(
        "bg-white rounded-2xl border border-border p-4 sm:p-5 border-l-[3px] transition-all duration-300",
        "hover:border-border hover:shadow-[0_4px_24px_rgba(72,107,70,0.08)] hover:-translate-y-0.5",
        config.border
      )}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div
          className={cn(
            "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center",
            config.iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", config.iconText)} />
        </div>
        {trend && (
          <span
            className={cn(
              "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full",
              trend.positive !== false ? config.trendBg : "bg-destructive/8",
              trend.positive !== false ? config.trendText : "text-destructive"
            )}
          >
            {trend.value}
          </span>
        )}
        {status && (
          <span
            className={cn(
              "text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full",
              config.trendBg,
              config.trendText
            )}
          >
            {status}
          </span>
        )}
      </div>
      <p
        className="text-[28px] sm:text-[36px] md:text-[42px] font-bold text-foreground leading-none tracking-tight"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
      >
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="text-[12px] sm:text-[13px] text-muted-foreground font-medium mt-1.5">
        {title}
      </p>
    </motion.div>
  );
}