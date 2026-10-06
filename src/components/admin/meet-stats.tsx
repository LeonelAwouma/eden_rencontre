"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, CalendarClock, Users, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetStatsProps {
  publishedEvents: number;
  totalEvents: number;
  totalUsers: number;
  approvedUsers: number;
  className?: string;
}

export function MeetStats({ publishedEvents, totalEvents, totalUsers, approvedUsers, className }: MeetStatsProps) {
  const fillRate = totalUsers > 0 ? Math.round((approvedUsers / totalUsers) * 100) : 0;

  const stats = [
    { label: "Meets publiés", value: publishedEvents, icon: Calendar },
    { label: "Meets à venir", value: Math.max(0, totalEvents - publishedEvents), icon: CalendarClock },
    { label: "Participants total", value: approvedUsers, icon: Users },
    { label: "Taux de remplissage", value: fillRate, suffix: " %", icon: TrendingUp },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.3, ease: "easeOut" }}
      aria-labelledby="meet-stats-title"
      className={cn("bg-white rounded-2xl border border-[#E8E5E0] p-5 sm:p-6", className)}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="meet-stats-title" className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            Statistiques Meet
          </h2>
          <p className="text-[13px] text-[#5F6B63] mt-0.5">Vue d&apos;ensemble des événements</p>
        </div>
        <Link href="/admin/meets" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/[0.06] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          Gérer <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-[#F1EEE9] bg-[#FCFBF9] p-3 sm:p-4">
            <span className="w-9 h-9 rounded-lg bg-primary/[0.08] text-primary flex items-center justify-center shrink-0">
              <stat.icon className="w-[18px] h-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dd className="text-[20px] sm:text-[22px] font-bold text-[#1F2A23] leading-none tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                {stat.value}{stat.suffix || ""}
              </dd>
              <dt className="text-[12px] text-[#5F6B63] mt-1 leading-tight">{stat.label}</dt>
            </div>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}
