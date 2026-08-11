"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  UserCheck,
  CalendarPlus,
  Users,
  FileBarChart,
  ArrowUpRight,
} from "lucide-react";

const ACTIONS = [
  {
    label: "Approuver inscriptions",
    description: "Examiner les demandes",
    href: "/admin/users?status=pending",
    icon: UserCheck,
    color: "text-[#486B46]",
    bg: "bg-[#486B46]/8",
  },
  {
    label: "Créer un Meet",
    description: "Nouvel événement",
    href: "/admin/events/new",
    icon: CalendarPlus,
    color: "text-[#4F7DF3]",
    bg: "bg-[#4F7DF3]/8",
  },
  {
    label: "Gérer les utilisateurs",
    description: "Voir tous les comptes",
    href: "/admin/users",
    icon: Users,
    color: "text-[#486B46]",
    bg: "bg-[#486B46]/8",
  },
  {
    label: "Voir les rapports",
    description: "Signalements en cours",
    href: "/admin/reports",
    icon: FileBarChart,
    color: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]/8",
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-[#E8E5E0] p-4 sm:p-6"
    >
      <h2
        className="text-base sm:text-lg font-semibold text-[#2F2F2F] tracking-tight mb-4 sm:mb-5"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
      >
        Actions rapides
      </h2>
      <div className="space-y-2.5 sm:space-y-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex items-center gap-3 sm:gap-3.5 p-3 sm:p-3.5 rounded-xl border border-[#E8E5E0] hover:border-[#486B46]/30 hover:bg-gradient-to-r hover:from-[#486B46]/[0.02] hover:to-[#6E8B63]/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(72,107,70,0.06)]"
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${action.bg} flex items-center justify-center flex-shrink-0`}
            >
              <action.icon
                className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] ${action.color}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] sm:text-[13px] font-semibold text-[#2F2F2F]">
                {action.label}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#9CA3AF] font-medium">
                {action.description}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#486B46] transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}