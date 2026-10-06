"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Copy, UserCheck, UserPlus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecentUser {
  id: string;
  name: string;
  pseudo?: string | null;
  email: string;
  status: string;
  created_at: string;
  city: string;
  country: string;
  avatar_url: string | null;
}

/** Badges de statut communs au tableau de bord. */
export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: "Approuvé", className: "bg-primary/[0.08] text-primary ring-primary/20" },
  pending: { label: "En attente", className: "bg-[#F59E0B]/[0.12] text-[#8A4F05] ring-[#F59E0B]/30" },
  suspended: { label: "Suspendu", className: "bg-[#D64545]/[0.08] text-[#B83333] ring-[#D64545]/20" },
  rejected: { label: "Rejeté", className: "bg-[#6B746E]/10 text-[#4A534D] ring-[#6B746E]/20" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] || { label: status, className: "bg-muted text-muted-foreground ring-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset", s.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {s.label}
    </span>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function UserActions({ user }: { user: RecentUser }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions pour ${user.name || user.email}`}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6B63] hover:text-[#1F2A23] hover:bg-[#F3F1EC] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => router.push(`/admin/users/${user.id}`)}>
          <Eye className="w-4 h-4 mr-2" /> Voir le profil
        </DropdownMenuItem>
        {user.status === "pending" && (
          <DropdownMenuItem onSelect={() => router.push(`/admin/users/${user.id}`)}>
            <UserCheck className="w-4 h-4 mr-2" /> Examiner la demande
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => { navigator.clipboard?.writeText(user.email).catch(() => {}); }}>
          <Copy className="w-4 h-4 mr-2" /> Copier l&apos;e-mail
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserIdentity({ user }: { user: RecentUser }) {
  const name = user.name || user.pseudo || "Sans nom";
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={avatarSrc(user.avatar_url, 64)} alt="" />
        <AvatarFallback className="bg-primary/10 text-primary text-[13px] font-semibold">{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <Link href={`/admin/users/${user.id}`} className="min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <span className="block text-[14px] font-semibold text-[#1F2A23] truncate hover:text-primary transition-colors duration-150">{name}</span>
        <span className="block text-[12px] text-[#5F6B63] truncate md:hidden">{user.email}</span>
      </Link>
    </div>
  );
}

export function RecentUsers({ users, className }: { users: RecentUser[]; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2, ease: "easeOut" }}
      aria-labelledby="recent-users-title"
      className={cn("bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden min-w-0", className)}
    >
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#F1EEE9]">
        <div>
          <h2 id="recent-users-title" className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            Dernières inscriptions
          </h2>
          <p className="text-[13px] text-[#5F6B63] mt-0.5">Nouveaux membres récents</p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/[0.06] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Voir tout <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F2EC] flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5 text-[#6B746E]" aria-hidden="true" />
          </div>
          <p className="text-[14px] font-medium text-[#3A443E]">Aucune inscription récente</p>
          <p className="text-[13px] text-[#5F6B63] mt-1">Les nouveaux membres apparaîtront ici</p>
        </div>
      ) : (
        <>
          {/* Tableau (tablette et ordinateur) */}
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="text-[12px] font-semibold uppercase tracking-wide text-[#5F6B63] bg-[#FAF8F5]">
                  <th scope="col" className="px-6 py-2.5 font-semibold w-[30%]">Membre</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">E-mail</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold hidden xl:table-cell w-[16%]">Localisation</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold w-[14%]">Inscription</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold w-[120px]">Statut</th>
                  <th scope="col" className="px-3 py-2.5 w-[52px]"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EEE9]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#FAF8F5] transition-colors duration-150">
                    <td className="px-6 py-3"><UserIdentity user={user} /></td>
                    <td className="px-3 py-3 text-[14px] text-[#3A443E] truncate" title={user.email}>{user.email}</td>
                    <td className="px-3 py-3 text-[13px] text-[#5F6B63] truncate hidden xl:table-cell">
                      {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#5F6B63] whitespace-nowrap">{formatDate(user.created_at)}</td>
                    <td className="px-3 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-3 py-3 text-right"><UserActions user={user} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Liste (mobile) */}
          <ul className="md:hidden divide-y divide-[#F1EEE9]">
            {users.map((user) => (
              <li key={user.id} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><UserIdentity user={user} /></div>
                  <UserActions user={user} />
                </div>
                <div className="mt-2 pl-12 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <StatusBadge status={user.status} />
                  <span className="text-[12px] text-[#5F6B63]">
                    {formatDate(user.created_at)}
                    {(user.city || user.country) && ` · ${[user.city, user.country].filter(Boolean).join(", ")}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.section>
  );
}
