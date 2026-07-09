"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: string;
  description: string;
  status: string;
  priority: string;
  admin_notes: string;
  resolved_at: string | null;
  created_at: string;
  reporter?: { id: string; name: string; email: string };
  reported_user?: { id: string; name: string; email: string; status: string };
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "investigating", label: "En cours" },
  { value: "resolved", label: "Résolus" },
  { value: "dismissed", label: "Rejetés" },
];

const TYPE_LABELS: Record<string, string> = {
  inappropriate_content: "Contenu inapproprié",
  harassment: "Harcèlement",
  fake_profile: "Faux profil",
  spam: "Spam",
  other: "Autre",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-[#FF9E45]/10 text-[#FF9E45]",
  investigating: "bg-[#4F7DF3]/10 text-[#4F7DF3]",
  resolved: "bg-[#38C172]/10 text-[#38C172]",
  dismissed: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: "bg-[#E5E7EB] text-[#6B7280]",
  normal: "bg-[#4F7DF3]/10 text-[#4F7DF3]",
  high: "bg-[#FF9E45]/10 text-[#FF9E45]",
  critical: "bg-[#F56565]/10 text-[#F56565]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  investigating: "En cours",
  resolved: "Résolu",
  dismissed: "Rejeté",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, critical: 0 });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReports(data.reports);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (reportId: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      if (action === "delete") {
        await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/admin/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action, ...extra }),
        });
      }
      setSelectedReport(null);
      setAdminNotes("");
      fetchReports();
    } catch (err) {
      console.error("Report action error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const saveNotes = async (reportId: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      fetchReports();
    } catch (err) {
      console.error("Notes save error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const statCards = [
    { label: "Total signalements", value: stats.total, icon: FileText, color: "text-[#4B5563]", bg: "bg-[#F3F4F6]" },
    { label: "En attente", value: stats.pending, icon: Clock, color: "text-[#FF9E45]", bg: "bg-[#FF9E45]/10" },
    { label: "Résolus", value: stats.resolved, icon: CheckCircle2, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
    { label: "Critiques", value: stats.critical, icon: AlertTriangle, color: "text-[#F56565]", bg: "bg-[#F56565]/10" },
  ];

  return (
    <>
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Signalements
        </h1>
        <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium mb-6">{total} signalement{total !== 1 ? "s" : ""} au total</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bg-white rounded-[20px] border border-[#E5E7EB] p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-[28px] font-bold text-[#1a1a1a] leading-none">{card.value}</p>
            <p className="text-[12px] text-[#9CA3AF] font-medium mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="flex gap-1 bg-[#F9FAFB] rounded-xl p-1 border border-[#E5E7EB] overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all",
                statusFilter === opt.value
                  ? "bg-white text-[#1a1a1a] shadow-sm border border-[#E5E7EB]"
                  : "text-[#9CA3AF] hover:text-[#6B7280]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20"
        >
          <option value="all">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchReports(); }} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1D5DB]" />
            <input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all font-medium"
            />
          </div>
        </form>
      </motion.div>

      {/* Reports Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-[#D1D5DB]" />
            </div>
            <p className="text-[15px] font-semibold text-[#6B7280]">Aucun signalement</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">La plateforme est en sécurité</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {["Signalé par", "Utilisateur signalé", "Type", "Raison", "Priorité", "Statut", "Date", "Actions"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {reports.map((report, i) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }}
                    >
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-medium text-[#374151]">{report.reporter?.name || "Anonyme"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-medium text-[#374151]">{report.reported_user?.name || "Inconnu"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[11px] font-medium text-[#6B7280]">{TYPE_LABELS[report.report_type] || report.report_type}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[12px] text-[#9CA3AF] max-w-[200px] truncate">{report.description || "—"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", PRIORITY_CLASSES[report.priority])}>
                          {report.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full", STATUS_CLASSES[report.status])}>
                          {STATUS_LABELS[report.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[12px] text-[#9CA3AF] font-medium">
                          {new Date(report.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D1D5DB] hover:text-[#38C172] hover:bg-[#38C172]/5 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#F9FAFB]">
              {reports.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-5 cursor-pointer hover:bg-[#FAFAFA]"
                  onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-[#1a1a1a]">{report.reported_user?.name || "Inconnu"}</p>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", STATUS_CLASSES[report.status])}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6B7280]">{TYPE_LABELS[report.report_type]}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">{report.description || "Pas de description"}</p>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#F3F4F6]">
                <p className="text-[12px] text-[#9CA3AF] font-medium">Page {page} sur {totalPages}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-[0_24px_80px_rgba(0,0,0,0.08)] w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F3F4F6]">
                <h3 className="text-[18px] font-bold text-[#1a1a1a]">Détails du signalement</h3>
                <button onClick={() => setSelectedReport(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Signalé par</p>
                    <p className="text-[13px] font-semibold text-[#1a1a1a]">{selectedReport.reporter?.name || "Anonyme"}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{selectedReport.reporter?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Utilisateur signalé</p>
                    <p className="text-[13px] font-semibold text-[#1a1a1a]">{selectedReport.reported_user?.name || "Inconnu"}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{selectedReport.reported_user?.email || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Type</p>
                    <span className="text-[12px] font-medium text-[#6B7280]">{TYPE_LABELS[selectedReport.report_type]}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Priorité</p>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", PRIORITY_CLASSES[selectedReport.priority])}>{selectedReport.priority}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Statut</p>
                    <span className={cn("text-[10px] font-bold uppercase px-2.5 py-1 rounded-full", STATUS_CLASSES[selectedReport.status])}>{STATUS_LABELS[selectedReport.status]}</span>
                  </div>
                </div>

                {selectedReport.description && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Description</p>
                    <p className="text-[13px] text-[#374151] leading-relaxed bg-[#F9FAFB] rounded-xl p-4">{selectedReport.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2">Notes internes</p>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajouter des notes internes..."
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-[13px] text-[#1a1a1a] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] resize-none h-24 transition-all"
                  />
                  <button
                    onClick={() => saveNotes(selectedReport.id)}
                    disabled={actionLoading}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F3F4F6] text-[12px] font-semibold text-[#4B5563] hover:bg-[#E5E7EB] transition-all"
                  >
                    <Save className="w-3.5 h-3.5" /> Sauvegarder les notes
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-[#F3F4F6]">
                  {selectedReport.status !== "resolved" && (
                    <button
                      onClick={() => handleAction(selectedReport.id, "resolved")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#38C172]/10 text-[12px] font-semibold text-[#38C172] hover:bg-[#38C172]/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marquer résolu
                    </button>
                  )}
                  {selectedReport.status !== "dismissed" && (
                    <button
                      onClick={() => handleAction(selectedReport.id, "dismissed")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#9CA3AF]/10 text-[12px] font-semibold text-[#6B7280] hover:bg-[#9CA3AF]/20 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeter
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(selectedReport.id, "delete")}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F56565]/10 text-[12px] font-semibold text-[#F56565] hover:bg-[#F56565]/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}