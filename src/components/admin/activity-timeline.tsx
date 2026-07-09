"use client";

import { motion } from "framer-motion";
import {
  UserCheck,
  UserMinus,
  CalendarPlus,
  LogIn,
  Trash2,
} from "lucide-react";

interface AuditEntry {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof UserCheck; color: string; bg: string }> = {
  admin_login: { label: "Connexion admin", icon: LogIn, color: "text-[#4F7DF3]", bg: "bg-[#4F7DF3]/10" },
  user_approved: { label: "Approbation utilisateur", icon: UserCheck, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
  user_rejected: { label: "Rejet utilisateur", icon: UserMinus, color: "text-[#F56565]", bg: "bg-[#F56565]/10" },
  user_suspended: { label: "Suspension utilisateur", icon: UserMinus, color: "text-[#F56565]", bg: "bg-[#F56565]/10" },
  event_created: { label: "Création événement", icon: CalendarPlus, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
  event_updated: { label: "Modification événement", icon: CalendarPlus, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
  event_deleted: { label: "Suppression événement", icon: Trash2, color: "text-[#F56565]", bg: "bg-[#F56565]/10" },
};

interface ActivityTimelineProps {
  entries: AuditEntry[];
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
      className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-[#F3F4F6]">
        <h2
          className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        >
          Journal d'activité
        </h2>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-medium">
          Actions récentes sur la plateforme
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#F9FAFB] flex items-center justify-center mb-3">
            <LogIn className="w-6 h-6 text-[#D1D5DB]" />
          </div>
          <p className="text-[14px] font-medium text-[#6B7280]">Aucune activité récente</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Les actions seront enregistrées ici</p>
        </div>
      ) : (
        <div className="px-6 py-4 space-y-0 max-h-[360px] overflow-y-auto custom-scrollbar">
          {entries.map((entry, i) => {
            const config = ACTION_CONFIG[entry.action] || {
              label: entry.action,
              icon: LogIn,
              color: "text-[#6B7280]",
              bg: "bg-[#F3F4F6]",
            };
            const Icon = config.icon;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
                className="eden-timeline-connector flex items-start gap-3.5 py-3.5"
              >
                <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 z-10 bg-white`}>
                  <Icon className={`w-[16px] h-[16px] ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-[13px] font-medium text-[#374151]">
                    {config.label}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5 font-medium">
                    {entry.admin_email} ·{" "}
                    {new Date(entry.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}