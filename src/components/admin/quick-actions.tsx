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
    color: "text-[#38C172]",
    bg: "bg-[#38C172]/8",
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
    color: "text-[#38C172]",
    bg: "bg-[#38C172]/8",
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
      className="bg-white rounded-[20px] border border-[#E5E7EB] p-6"
    >
      <h2
        className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight mb-5"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
      >
        Actions rapides
      </h2>
      <div className="space-y-3">
        {ACTIONS.map((action, i) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex items-center gap-3.5 p-3.5 rounded-2xl border border-[#E5E7EB] hover:border-[#38C172]/40 hover:bg-gradient-to-r hover:from-[#38C172]/[0.03] hover:to-[#86EFAC]/[0.05] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(56,193,114,0.08)]"
          >
            <div className={`w-10 h-10 rounded-[12px] ${action.bg} flex items-center justify-center flex-shrink-0`}>
              <action.icon className={`w-[18px] h-[18px] ${action.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">{action.label}</p>
              <p className="text-[11px] text-[#9CA3AF] font-medium">{action.description}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#38C172] transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}