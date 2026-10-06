"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { UserCheck, CalendarPlus, Users, FileBarChart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { key: "pending", label: "Approuver les inscriptions", description: "Examiner les demandes en attente", href: "/admin/users?status=pending", icon: UserCheck },
  { key: "meet", label: "Créer un Meet", description: "Planifier un nouvel événement", href: "/admin/events/new", icon: CalendarPlus },
  { key: "users", label: "Gérer les utilisateurs", description: "Voir et modifier tous les comptes", href: "/admin/users", icon: Users },
  { key: "reports", label: "Voir les rapports", description: "Signalements en cours", href: "/admin/reports", icon: FileBarChart },
] as const;

export function QuickActions({ pendingUsers = 0, className }: { pendingUsers?: number; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15, ease: "easeOut" }}
      aria-labelledby="quick-actions-title"
      className={cn("bg-white rounded-2xl border border-[#E8E5E0] p-5 sm:p-6", className)}
    >
      <h2 id="quick-actions-title" className="text-[18px] font-semibold text-[#1F2A23] tracking-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
        Actions rapides
      </h2>
      <ul className="space-y-2">
        {ACTIONS.map((action) => {
          // Les demandes en attente réclament l'attention : action mise en avant.
          const urgent = action.key === "pending" && pendingUsers > 0;
          const Icon = action.icon;
          return (
            <li key={action.key}>
              <Link
                href={action.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  urgent
                    ? "border-[#F59E0B]/40 bg-[#FFF8EC] hover:bg-[#FFF2DB]"
                    : "border-[#EEEBE6] hover:border-primary/30 hover:bg-[#F7F9F6]"
                )}
              >
                <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  urgent ? "bg-[#F59E0B]/15 text-[#9A5A06]" : "bg-primary/[0.08] text-primary")}>
                  <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#1F2A23]">{action.label}</span>
                    {urgent && (
                      <span className="rounded-full bg-[#F59E0B] px-1.5 min-w-[20px] h-5 inline-flex items-center justify-center text-[11px] font-bold text-white tabular-nums">
                        {pendingUsers > 99 ? "99+" : pendingUsers}
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] text-[#5F6B63] mt-0.5">
                    {urgent ? `${pendingUsers} demande${pendingUsers > 1 ? "s" : ""} à examiner` : action.description}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-[#9AA39D] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
