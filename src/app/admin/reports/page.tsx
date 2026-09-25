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
  MessageCircle,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  /** 'messages' quand le membre a signalé depuis une conversation (migration 20260925). */
  source?: string | null;
  conversation_id?: string | null;
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
  pending: "bg-warning/10 text-warning",
  investigating: "bg-[#4F7DF3]/10 text-[#4F7DF3]",
  resolved: "bg-success/10 text-success",
  dismissed: "bg-muted-foreground/10 text-muted-foreground",
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: "bg-border text-muted-foreground",
  normal: "bg-[#4F7DF3]/10 text-[#4F7DF3]",
  high: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
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
    { label: "Total signalements", value: stats.total, icon: FileText, color: "text-[#4B5563]", bg: "bg-border" },
    { label: "En attente", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Résolus", value: stats.resolved, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Critiques", value: stats.critical, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <>
      

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[24px] font-bold text-foreground tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Signalements
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5 font-medium mb-6">{total} signalement{total !== 1 ? "s" : ""} au total</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bg-white rounded-[20px] border border-border p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-[28px] font-bold text-foreground leading-none">{card.value}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-1">{card.label}</p>
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
        <div className="flex gap-1 bg-muted rounded-xl p-1 border border-border overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all",
                statusFilter === opt.value
                  ? "bg-white text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-border rounded-xl text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-success/20"
        >
          <option value="all">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchReports(); }} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all font-medium"
            />
          </div>
        </form>
      </motion.div>

      {/* Reports Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-[20px] border border-border overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-success/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-muted-foreground mt-3 font-medium">Chargement…</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-[15px] font-semibold text-muted-foreground">Aucun signalement</p>
            <p className="text-[13px] text-muted-foreground mt-1">La plateforme est en sécurité</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Signalé par", "Utilisateur signalé", "Type", "Raison", "Priorité", "Statut", "Date", "Actions"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {reports.map((report, i) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }}
                    >
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-medium text-foreground">{report.reporter?.name || "Anonyme"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-medium text-foreground">{report.reported_user?.name || "Inconnu"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{TYPE_LABELS[report.report_type] || report.report_type}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[12px] text-muted-foreground max-w-[200px] truncate">{report.description || "—"}</p>
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
                        <p className="text-[12px] text-muted-foreground font-medium">
                          {new Date(report.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-success hover:bg-success/5 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-muted">
              {reports.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-5 cursor-pointer hover:bg-muted"
                  onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-foreground">{report.reported_user?.name || "Inconnu"}</p>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", STATUS_CLASSES[report.status])}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{TYPE_LABELS[report.report_type]}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{report.description || "Pas de description"}</p>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-[12px] text-muted-foreground font-medium">Page {page} sur {totalPages}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border disabled:opacity-30 transition-all">
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
              className="bg-white rounded-[24px] border border-border shadow-[0_24px_80px_rgba(0,0,0,0.08)] w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-[18px] font-bold text-foreground">Détails du signalement</h3>
                <button onClick={() => setSelectedReport(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Signalé par</p>
                    <p className="text-[13px] font-semibold text-foreground">{selectedReport.reporter?.name || "Anonyme"}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedReport.reporter?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Utilisateur signalé</p>
                    <p className="text-[13px] font-semibold text-foreground">{selectedReport.reported_user?.name || "Inconnu"}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedReport.reported_user?.email || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type</p>
                    <span className="text-[12px] font-medium text-muted-foreground">{TYPE_LABELS[selectedReport.report_type]}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Priorité</p>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", PRIORITY_CLASSES[selectedReport.priority])}>{selectedReport.priority}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Statut</p>
                    <span className={cn("text-[10px] font-bold uppercase px-2.5 py-1 rounded-full", STATUS_CLASSES[selectedReport.status])}>{STATUS_LABELS[selectedReport.status]}</span>
                  </div>
                </div>

                {(selectedReport.source === "messages" || selectedReport.reported_user_id) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedReport.source === "messages" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF5EC] text-[11px] font-semibold text-[#486B46]">
                        <MessageCircle className="w-3.5 h-3.5" /> Signalé depuis la messagerie
                      </span>
                    )}
                    {selectedReport.reported_user_id && (
                      <>
                        <Link href={`/admin/users/${selectedReport.reported_user_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
                          <UserRound className="w-3.5 h-3.5" /> Profil signalé
                        </Link>
                        <Link href={`/admin/chat-monitoring?user=${selectedReport.reported_user_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
                          <MessageCircle className="w-3.5 h-3.5" /> Ses conversations
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {selectedReport.description && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <p className="text-[13px] text-foreground leading-relaxed bg-muted rounded-xl p-4">{selectedReport.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes internes</p>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajouter des notes internes..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success resize-none h-24 transition-all"
                  />
                  <button
                    onClick={() => saveNotes(selectedReport.id)}
                    disabled={actionLoading}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-border text-[12px] font-semibold text-[#4B5563] hover:bg-border transition-all"
                  >
                    <Save className="w-3.5 h-3.5" /> Sauvegarder les notes
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  {selectedReport.status !== "resolved" && (
                    <button
                      onClick={() => handleAction(selectedReport.id, "resolved")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 text-[12px] font-semibold text-success hover:bg-success/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marquer résolu
                    </button>
                  )}
                  {selectedReport.status !== "dismissed" && (
                    <button
                      onClick={() => handleAction(selectedReport.id, "dismissed")}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted-foreground/10 text-[12px] font-semibold text-muted-foreground hover:bg-muted-foreground/20 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeter
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(selectedReport.id, "delete")}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-[12px] font-semibold text-destructive hover:bg-destructive/20 transition-all"
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