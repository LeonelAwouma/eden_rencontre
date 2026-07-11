"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

interface CharterAcceptance {
  authorize_verification: boolean;
  commit_respectful_conversations: boolean;
  accept_full_charter: boolean;
  all_accepted: boolean;
  accepted_at: string | null;
  charter_version: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender: string;
  status: string;
  city: string;
  country: string;
  region: string;
  civil_status: string;
  profession: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  birth_date: string;
  charter_accepted?: boolean;
  charter_accepted_at?: string | null;
  charter_acceptances?: CharterAcceptance | CharterAcceptance[] | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous", icon: Users },
  { value: "pending", label: "En attente", icon: Clock },
  { value: "approved", label: "Approuvés", icon: CheckCircle2 },
  { value: "rejected", label: "Rejetés", icon: XCircle },
  { value: "suspended", label: "Suspendus", icon: Ban },
];

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

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleQuickAction = async (
    userId: string,
    action: "approve" | "reject" | "suspend"
  ) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
    }
  };

  return (
    <>
      <DashboardHeader
        adminName="Administrateur"
        onMenuClick={() => {}}
      />

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1
            className="text-[24px] font-bold text-[#1a1a1a] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Utilisateurs
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium">
            {total} utilisateur{total !== 1 ? "s" : ""} au total
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-[#F9FAFB] rounded-xl p-1 border border-[#E5E7EB] overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-200",
                statusFilter === opt.value
                  ? "bg-white text-[#1a1a1a] shadow-sm border border-[#E5E7EB]"
                  : "text-[#9CA3AF] hover:text-[#6B7280]"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1D5DB]" />
            <input
              placeholder="Rechercher nom, email, ville…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all font-medium"
            />
          </div>
        </form>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center mb-4">
              <UserCheck className="w-7 h-7 text-[#D1D5DB]" />
            </div>
            <p className="text-[15px] font-semibold text-[#6B7280]">Aucun utilisateur trouvé</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Modifiez vos filtres pour voir plus de résultats</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">
                      Utilisateur
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">
                      Localisation
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">
                      Statut
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">
                      Charte
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">
                      Inscrit le
                    </th>
                    <th className="text-right text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {users.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#38C172]/20 to-[#86EFAC]/30 flex items-center justify-center text-[13px] font-bold text-[#38C172] shrink-0">
                            {(user.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#1a1a1a]">
                              {user.name || "Sans nom"}
                            </p>
                            <p className="text-[11px] text-[#9CA3AF] font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] text-[#6B7280] font-medium">
                          {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                            STATUS_CLASSES[user.status] || "bg-gray-100 text-gray-500"
                          )}
                        >
                          {STATUS_LABELS[user.status] || user.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {(() => {
                          const ca = Array.isArray(user.charter_acceptances)
                            ? user.charter_acceptances[0]
                            : user.charter_acceptances;
                          const accepted = ca?.all_accepted || user.charter_accepted;
                          if (accepted) {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#38C172]/10 text-[#38C172]">
                                  <ShieldCheck className="w-3 h-3 inline mr-1" /> Acceptée
                                </span>
                                {ca?.accepted_at && (
                                  <span className="text-[10px] text-[#9CA3AF]">
                                    {new Date(ca.accepted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706]">
                              En attente
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] text-[#9CA3AF] font-medium">
                          {new Date(user.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D1D5DB] hover:text-[#38C172] hover:bg-[#38C172]/5 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {user.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleQuickAction(user.id, "approve")}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D1D5DB] hover:text-[#38C172] hover:bg-[#38C172]/5 transition-all"
                                title="Approuver"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAction(user.id, "reject")}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D1D5DB] hover:text-[#F56565] hover:bg-[#F56565]/5 transition-all"
                                title="Rejeter"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#F9FAFB]">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#38C172]/20 to-[#86EFAC]/30 flex items-center justify-center text-[13px] font-bold text-[#38C172]">
                      {(user.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">
                        {user.name || "Sans nom"}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] truncate font-medium">{user.email}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                        STATUS_CLASSES[user.status] || "bg-gray-100 text-gray-500"
                      )}
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </div>
                  {/* Charter acceptance badge — mobile */}
                  <div className="mb-3">
                    {(() => {
                      const ca = Array.isArray(user.charter_acceptances)
                        ? user.charter_acceptances[0]
                        : user.charter_acceptances;
                      const accepted = ca?.all_accepted || user.charter_accepted;
                      if (accepted) {
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#38C172]/10 text-[#38C172]">
                              <ShieldCheck className="w-3 h-3 inline mr-1" /> Charte acceptée
                            </span>
                            {ca?.accepted_at && (
                              <span className="text-[10px] text-[#9CA3AF]">
                                {new Date(ca.accepted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706]">
                          Charte en attente
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex-1 text-center text-[12px] font-semibold text-[#38C172] bg-[#38C172]/5 py-2.5 rounded-xl hover:bg-[#38C172]/10 transition-colors"
                    >
                      Voir le profil
                    </Link>
                    {user.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleQuickAction(user.id, "approve")}
                          className="flex-1 text-center text-[12px] font-semibold text-[#38C172] bg-[#38C172]/5 py-2.5 rounded-xl hover:bg-[#38C172]/10 transition-colors"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleQuickAction(user.id, "reject")}
                          className="flex-1 text-center text-[12px] font-semibold text-[#F56565] bg-[#F56565]/5 py-2.5 rounded-xl hover:bg-[#F56565]/10 transition-colors"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#F3F4F6]">
                <p className="text-[12px] text-[#9CA3AF] font-medium">
                  Page {page} sur {totalPages}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}