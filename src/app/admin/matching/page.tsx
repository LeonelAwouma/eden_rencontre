"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

interface MatchProfile {
  id: string;
  name: string;
  email: string;
  gender: string;
  city: string;
  country: string;
  avatar_url: string | null;
  subscription_plan: string;
}

interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  match_score: number | null;
  initiated_by: string;
  admin_notes: string | null;
  mentor_id: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  user_a: MatchProfile;
  user_b: MatchProfile;
  mentor: { id: string; name: string; email: string } | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous", icon: Heart },
  { value: "pending", label: "En attente", icon: Clock },
  { value: "accepted", label: "Acceptés", icon: CheckCircle2 },
  { value: "declined", label: "Refusés", icon: XCircle },
  { value: "expired", label: "Expirés", icon: AlertTriangle },
  { value: "blocked", label: "Bloqués", icon: Ban },
];

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-[#FF9E45]/10 text-[#FF9E45]",
  accepted: "bg-[#38C172]/10 text-[#38C172]",
  declined: "bg-[#F56565]/10 text-[#F56565]",
  expired: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
  blocked: "bg-[#F56565]/10 text-[#F56565]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Refusé",
  expired: "Expiré",
  blocked: "Bloqué",
};

const INITIATOR_LABELS: Record<string, string> = {
  system: "Système",
  user_a: "Utilisateur A",
  user_b: "Utilisateur B",
  admin: "Admin",
  mentor: "Mentor",
};

export default function MatchingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, declined: 0, expired: 0, blocked: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [noteText, setNoteText] = useState("");
  const limit = 20;

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        search,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/matching?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch matches:", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const handleAction = async (matchId: string, status: string) => {
    setActionLoading(matchId);
    try {
      const res = await fetch("/api/admin/matching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: matchId, status, admin_notes: noteText || undefined }),
      });
      if (res.ok) {
        await fetchMatches();
        setSelectedMatch(null);
        setNoteText("");
      }
    } catch (e) {
      console.error("Failed to update match:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardHeader adminName="Admin" onMenuClick={() => {}} />

      {/* Page Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Gestion du Matching
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-1">Suivez et gérez tous les appariements de la plateforme</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "#486B46" },
          { label: "En attente", value: stats.pending, color: "#FF9E45" },
          { label: "Acceptés", value: stats.accepted, color: "#38C172" },
          { label: "Refusés", value: stats.declined, color: "#F56565" },
          { label: "Expirés", value: stats.expired, color: "#9CA3AF" },
          { label: "Bloqués", value: stats.blocked, color: "#F56565" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center"
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-[#374151] placeholder:text-[#D1D5DB] outline-none w-full font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                statusFilter === opt.value
                  ? "bg-[#486B46] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#38C172] animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
          <Heart className="w-12 h-12 text-[#E5E7EB] mx-auto mb-3" />
          <p className="text-[#9CA3AF] font-medium">Aucun match trouvé</p>
          <p className="text-[#9CA3AF] text-sm mt-1">Les appariements apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:border-[#C6D4C0] transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* User A */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {match.user_a?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/admin/users/${match.user_a_id}`} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#486B46] truncate block">
                      {match.user_a?.name || "Utilisateur inconnu"}
                    </Link>
                    <p className="text-xs text-[#9CA3AF] truncate">{match.user_a?.city}, {match.user_a?.country}</p>
                  </div>
                </div>

                {/* Heart */}
                <div className="flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-[#F56565] fill-[#F56565]/20" />
                </div>

                {/* User B */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#86EFAC] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {match.user_b?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/admin/users/${match.user_b_id}`} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#486B46] truncate block">
                      {match.user_b?.name || "Utilisateur inconnu"}
                    </Link>
                    <p className="text-xs text-[#9CA3AF] truncate">{match.user_b?.city}, {match.user_b?.country}</p>
                  </div>
                </div>

                {/* Score & Status */}
                <div className="flex items-center gap-3 shrink-0">
                  {match.match_score !== null && (
                    <div className="text-center px-3">
                      <p className="text-lg font-bold text-[#486B46]">{match.match_score}%</p>
                      <p className="text-[10px] text-[#9CA3AF]">Score</p>
                    </div>
                  )}
                  <span className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold", STATUS_CLASSES[match.status] || "bg-[#E5E7EB] text-[#6B7280]")}>
                    {STATUS_LABELS[match.status] || match.status}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF] shrink-0">
                  <span>Initié par: {INITIATOR_LABELS[match.initiated_by] || match.initiated_by}</span>
                  <span>·</span>
                  <span>{new Date(match.created_at).toLocaleDateString("fr-FR")}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedMatch(match)}
                    className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151] transition-all"
                    title="Voir détails"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {match.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleAction(match.id, "accepted")}
                        disabled={actionLoading === match.id}
                        className="w-8 h-8 rounded-lg bg-[#38C172]/10 flex items-center justify-center text-[#38C172] hover:bg-[#38C172]/20 transition-all disabled:opacity-50"
                        title="Accepter"
                      >
                        {actionLoading === match.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleAction(match.id, "declined")}
                        disabled={actionLoading === match.id}
                        className="w-8 h-8 rounded-lg bg-[#F56565]/10 flex items-center justify-center text-[#F56565] hover:bg-[#F56565]/20 transition-all disabled:opacity-50"
                        title="Refuser"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {match.admin_notes && (
                <div className="mt-3 p-3 bg-[#F9FAFB] rounded-lg text-xs text-[#6B7280]">
                  <span className="font-semibold">Note admin:</span> {match.admin_notes}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
          <p className="text-sm text-[#9CA3AF]">
            Page {page} sur {totalPages} · {total} résultats
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMatch(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Détails du Match
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center text-white font-bold">
                  {selectedMatch.user_a?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{selectedMatch.user_a?.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{selectedMatch.user_a?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Heart className="w-6 h-6 text-[#F56565]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#86EFAC] flex items-center justify-center text-white font-bold">
                  {selectedMatch.user_b?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{selectedMatch.user_b?.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{selectedMatch.user_b?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-[#F9FAFB] rounded-xl text-sm">
                <div>
                  <p className="text-[#9CA3AF] text-xs">Statut</p>
                  <span className={cn("inline-block px-2 py-1 rounded-md text-xs font-semibold mt-1", STATUS_CLASSES[selectedMatch.status])}>
                    {STATUS_LABELS[selectedMatch.status]}
                  </span>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs">Score</p>
                  <p className="font-semibold">{selectedMatch.match_score ? `${selectedMatch.match_score}%` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs">Initié par</p>
                  <p className="font-semibold">{INITIATOR_LABELS[selectedMatch.initiated_by]}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs">Créé le</p>
                  <p className="font-semibold">{new Date(selectedMatch.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                {selectedMatch.mentor && (
                  <div className="col-span-2">
                    <p className="text-[#9CA3AF] text-xs">Mentor assigné</p>
                    <p className="font-semibold">{selectedMatch.mentor.name}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-[#374151] mb-1 block">Note admin</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ajouter une note…"
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm text-[#374151] outline-none focus:border-[#486B46] resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              {selectedMatch.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(selectedMatch.id, "accepted")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#38C172] text-white font-semibold text-sm hover:bg-[#2FA860] transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accepter
                  </button>
                  <button
                    onClick={() => handleAction(selectedMatch.id, "declined")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F56565] text-white font-semibold text-sm hover:bg-[#E04E4E] transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Refuser
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedMatch(null)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium text-sm hover:bg-[#F9FAFB] transition-all"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}