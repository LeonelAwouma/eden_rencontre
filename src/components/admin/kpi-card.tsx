"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  accentColor: string;
  trend?: { value: string; positive?: boolean };
  status?: string;
  /** Information secondaire sous la valeur (ex. « 72 % des inscrits »). */
  hint?: string;
  index?: number;
}

// Accents discrets : la couleur ne touche que la pastille de l'icône et le badge.
const accentConfig: Record<string, { iconText: string; iconBg: string; badge: string }> = {
  blue: { iconText: "text-[#3B6FD9]", iconBg: "bg-[#3B6FD9]/[0.08]", badge: "bg-[#3B6FD9]/[0.08] text-[#2F5DBF]" },
  orange: { iconText: "text-[#C9730A]", iconBg: "bg-[#F59E0B]/[0.10]", badge: "bg-[#F59E0B]/[0.12] text-[#9A5A06]" },
  green: { iconText: "text-primary", iconBg: "bg-primary/[0.08]", badge: "bg-primary/[0.08] text-primary" },
  red: { iconText: "text-[#D64545]", iconBg: "bg-[#D64545]/[0.08]", badge: "bg-[#D64545]/[0.08] text-[#B83333]" },
};

export function KPICard({ title, value, icon: Icon, accentColor, trend, status, hint, index = 0 }: KPICardProps) {
  const config = accentConfig[accentColor] || accentConfig.green;
  const TrendIcon = trend?.positive === false ? TrendingDown : TrendingUp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-[#E8E5E0] p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#D9D4CC] hover:shadow-[0_2px_12px_rgba(31,51,40,0.05)]"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", config.iconBg)}>
          <Icon className={cn("w-[18px] h-[18px]", config.iconText)} aria-hidden="true" />
        </div>
        <p className="text-[13px] font-medium text-[#56615A] leading-snug min-w-0">{title}</p>
      </div>

      <p
        className="mt-4 text-[32px] sm:text-[36px] font-bold text-[#1F2A23] leading-none tracking-tight tabular-nums"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
      >
        {value.toLocaleString("fr-FR")}
      </p>

      {(trend || status || hint) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 min-h-[22px]">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full",
                trend.positive === false ? "bg-[#D64545]/[0.08] text-[#B83333]" : "bg-primary/[0.08] text-primary"
              )}
            >
              <TrendIcon className="w-3 h-3" aria-hidden="true" />
              {trend.value}
            </span>
          )}
          {status && <span className={cn("text-[12px] font-semibold px-2 py-0.5 rounded-full", config.badge)}>{status}</span>}
          {hint && <span className="text-[12px] text-[#5F6B63]">{hint}</span>}
        </div>
      )}
    </motion.div>
  );
}
