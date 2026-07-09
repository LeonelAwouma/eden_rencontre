"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentUser {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  city: string;
  country: string;
  avatar_url: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  suspended: "Suspendu",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "eden-badge-pending",
  approved: "eden-badge-approved",
  rejected: "eden-badge-rejected",
  suspended: "eden-badge-suspended",
};

interface RecentUsersProps {
  users: RecentUser[];
}

export function RecentUsers({ users }: RecentUsersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
      className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
        <div>
          <h2
            className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Dernières inscriptions
          </h2>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-medium">
            Nouveaux membres récents
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-[12px] font-semibold text-[#38C172] hover:text-[#22C55E] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#38C172]/5"
        >
          Voir tout →
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#F9FAFB] flex items-center justify-center mb-3">
            <Eye className="w-6 h-6 text-[#D1D5DB]" />
          </div>
          <p className="text-[14px] font-medium text-[#6B7280]">Aucune inscription récente</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Les nouveaux membres apparaîtront ici</p>
        </div>
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.05 }}
              className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#38C172]/20 to-[#86EFAC]/30 flex items-center justify-center text-[13px] font-bold text-[#38C172] flex-shrink-0">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">
                  {user.name || "Sans nom"}
                </p>
                <p className="text-[11px] text-[#9CA3AF] truncate font-medium">
                  {user.city ? `${user.city}, ` : ""}{user.email}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0",
                  STATUS_CLASSES[user.status] || "bg-gray-100 text-gray-500"
                )}
              >
                {STATUS_LABELS[user.status] || user.status}
              </span>
              <Link
                href={`/admin/users/${user.id}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D1D5DB] hover:text-[#38C172] hover:bg-[#38C172]/5 transition-all flex-shrink-0"
              >
                <Eye className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}