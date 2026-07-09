"use client";

import { motion } from "framer-motion";
import { Calendar, CalendarClock, Users, TrendingUp } from "lucide-react";

interface MeetStatsProps {
  publishedEvents: number;
  totalEvents: number;
  totalUsers: number;
  approvedUsers: number;
}

export function MeetStats({ publishedEvents, totalEvents, totalUsers, approvedUsers }: MeetStatsProps) {
  const fillRate = totalUsers > 0 ? Math.round((approvedUsers / totalUsers) * 100) : 0;
  
  const stats = [
    {
      label: "Meets publiés",
      value: publishedEvents,
      icon: Calendar,
      color: "text-[#38C172]",
      bg: "bg-[#38C172]/8",
    },
    {
      label: "Meets à venir",
      value: Math.max(0, totalEvents - publishedEvents),
      icon: CalendarClock,
      color: "text-[#4F7DF3]",
      bg: "bg-[#4F7DF3]/8",
    },
    {
      label: "Participants total",
      value: approvedUsers,
      icon: Users,
      color: "text-[#8B5CF6]",
      bg: "bg-[#8B5CF6]/8",
    },
    {
      label: "Taux de remplissage",
      value: fillRate,
      suffix: "%",
      icon: TrendingUp,
      color: "text-[#38C172]",
      bg: "bg-[#38C172]/8",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65, ease: "easeOut" }}
      className="bg-white rounded-[20px] border border-[#E5E7EB] p-6"
    >
      <div className="mb-5">
        <h2
          className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          Meet Statistics
        </h2>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-medium">
          Vue d'ensemble des événements
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.7 + i * 0.06 }}
            className="p-4 rounded-2xl border border-[#F3F4F6] hover:border-[#E5E7EB] transition-all"
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-[16px] h-[16px] ${stat.color}`} />
            </div>
            <p
              className="text-[24px] font-bold text-[#1a1a1a] leading-none tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
            >
              {stat.value}{stat.suffix || ""}
            </p>
            <p className="text-[11px] text-[#9CA3AF] font-medium mt-1.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}