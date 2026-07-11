"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  AlertTriangle,
  Shield,
  Eye,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  subscription_plan: string;
}

interface Conversation {
  id: string;
  user_a_id: string;
  user_b_id: string;
  match_id: string | null;
  status: string;
  restricted_reason: string | null;
  restricted_at: string | null;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
  user_a: ChatUser;
  user_b: ChatUser;
}

interface ChatAlert {
  id: string;
  conversation_id: string;
  reported_user_id: string;
  alert_type: string;
  severity: string;
  description: string;
  snippet: string | null;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  conversation: { id: string; user_a_id: string; user_b_id: string; status: string; last_message_at: string | null };
  reported_user: ChatUser;
}

const CONV_STATUS_OPTIONS = [
  { value: "all", label: "Toutes", icon: MessageCircle },
  { value: "active", label: "Actives", icon: CheckCircle2 },
  { value: "restricted", label: "Restreintes", icon: Lock },
  { value: "blocked", label: "Bloquées", icon: Ban },
  { value: "archived", label: "Archivées", icon: Clock },
];

const ALERT_STATUS_OPTIONS = [
  { value: "all", label: "Toutes", icon: AlertTriangle },
  { value: "open", label: "Ouvertes", icon: AlertCircle },
  { value: "investigating", label: "En cours", icon: Eye },
  { value: "resolved", label: "Résolues", icon: CheckCircle2 },
  { value: "dismissed", label: "Rejetées", icon: XCircle },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "low", label: "Faible" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "critical", label: "Critique" },
];

const SEVERITY_CLASSES: Record<string, string> = {
  low: "bg-[#E5E7EB] text-[#6B7280]",
  medium: "bg-[#FF9E45]/10 text-[#FF9E45]",
  high: "bg-[#F56565]/10 text-[#F56565]",
  critical: "bg-[#F56565] text-white",
};

const CONV_STATUS_CLASSES: Record<string, string> = {
  active: "bg-[#38C172]/10 text-[#38C172]",
  restricted: "bg-[#FF9E45]/10 text-[#FF9E45]",
  blocked: "bg-[#F56565]/10 text-[#F56565]",
  archived: "bg-[#9CA3AF]/10 text-[#9CA3AF]",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  keyword_trigger: "Mot-clé détecté",
  report_received: "Signalement reçu",
  spam_detected: "Spam détecté",
  harassment: "Harcèlement",
  inappropriate_content: "Contenu inapproprié",
  other: "Autre",
};

const MODERATION_ACTIONS = [
  { value: "warning", label: "Avertissement", color: "#FF9E45" },
  { value: "mute", label: "Mute", color: "#9CA3AF" },
  { value: "restrict", label: "Restreindre", color: "#FF9E45" },
  { value: "temporary_ban", label: "Ban temporaire", color: "#F56565" },
  { value: "permanent_ban", label: "Ban permanent", color: "#F56565" },
  { value: "account_suspension", label: "Suspension", color: "#F56565" },
  { value: "note", label: "Note", color: "#4F7DF3" },
];

export default function ChatMonitoringPage() {
  const [tab, setTab] = useState<"conversations" | "alerts">("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [alerts, setAlerts] = useState<ChatAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [convStats, setConvStats] = useState({ active: 0, restricted: 0 });
  const [alertStats, setAlertStats] = useState({ open: 0, critical: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [modAction, setModAction] = useState({ type: "warning", reason: "", target_user_id: "" });
  const [showModModal, setShowModModal] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        status: statusFilter,
        severity: severityFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/chat-monitoring?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (tab === "conversations") {
          setConversations(data.conversations || []);
          if (data.stats) setConvStats(data.stats);
        } else {
          setAlerts(data.alerts || []);
          if (data.stats) setAlertStats(data.stats);
        }
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, severityFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConversationAction = async (convId: string, status: string, restricted_reason?: string) => {
    setActionLoading(convId);
    try {
      await fetch("/api/admin/chat-monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "conversation", id: convId, status, restricted_reason }),
      });
      await fetchData();
      setSelectedConv(null);
    } catch (e) {
      console.error("Failed to update conversation:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAlertAction = async (alertId: string, status: string, admin_notes?: string) => {
    setActionLoading(alertId);
    try {
      await fetch("/api/admin/chat-monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "alert", id: alertId, status, admin_notes }),
      });
      await fetchData();
    } catch (e) {
      console.error("Failed to update alert:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleModeration = async () => {
    if (!modAction.reason || !modAction.target_user_id) return;
    setActionLoading("mod");
    try {
      await fetch("/api/admin/chat-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: modAction.type,
          target_user_id: modAction.target_user_id,
          conversation_id: selectedConv?.id,
          reason: modAction.reason,
        }),
      });
      setShowModModal(false);
      setModAction({ type: "warning", reason: "", target_user_id: "" });
    } catch (e) {
      console.error("Failed to create moderation action:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardHeader adminName="Admin" onMenuClick={() => {}} />

      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          Chat Monitoring
        </h2>
        <p className="text-sm text-[#9CA3AF] mt-1">Surveillez les conversations et gérez les alertes de sécurité</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab("conversations"); setStatusFilter("all"); setPage(1); }}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            tab === "conversations"
              ? "bg-[#486B46] text-white"
              : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Conversations
        </button>
        <button
          onClick={() => { setTab("alerts"); setStatusFilter("all"); setPage(1); }}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative",
            tab === "alerts"
              ? "bg-[#486B46] text-white"
              : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Alertes
          {alertStats.open > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F56565] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {alertStats.open}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {tab === "conversations" ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
              <p className="text-2xl font-bold text-[#38C172]">{convStats.active}</p>
              <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">Actives</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
              <p className="text-2xl font-bold text-[#FF9E45]">{convStats.restricted}</p>
              <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">Restreintes/Bloquées</p>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
              <p className="text-2xl font-bold text-[#FF9E45]">{alertStats.open}</p>
              <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">Ouvertes</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center">
              <p className="text-2xl font-bold text-[#F56565]">{alertStats.critical}</p>
              <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">Critiques</p>
            </motion.div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(tab === "conversations" ? CONV_STATUS_OPTIONS : ALERT_STATUS_OPTIONS).map((opt) => (
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
        {tab === "alerts" && (
          <>
            <span className="w-px h-8 bg-[#E5E7EB] mx-1 self-center" />
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSeverityFilter(opt.value); setPage(1); }}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all",
                  severityFilter === opt.value
                    ? "bg-[#374151] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#38C172] animate-spin" />
        </div>
      ) : tab === "conversations" ? (
        conversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
            <MessageCircle className="w-12 h-12 text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[#9CA3AF] font-medium">Aucune conversation trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:border-[#C6D4C0] transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex -space-x-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center text-white text-xs font-bold border-2 border-white z-10">
                        {conv.user_a?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#86EFAC] flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                        {conv.user_b?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/users/${conv.user_a_id}`} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#486B46] truncate">
                          {conv.user_a?.name || "?"}
                        </Link>
                        <span className="text-[#9CA3AF]">&</span>
                        <Link href={`/admin/users/${conv.user_b_id}`} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#486B46] truncate">
                          {conv.user_b?.name || "?"}
                        </Link>
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {conv.message_count} messages · Dernier: {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("fr-FR") : "N/A"}
                      </p>
                    </div>
                  </div>

                  <span className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0", CONV_STATUS_CLASSES[conv.status])}>
                    {conv.status === "active" ? "Active" : conv.status === "restricted" ? "Restreinte" : conv.status === "blocked" ? "Bloquée" : "Archivée"}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {conv.status === "active" && (
                      <>
                        <button
                          onClick={() => handleConversationAction(conv.id, "restricted")}
                          disabled={actionLoading === conv.id}
                          className="w-8 h-8 rounded-lg bg-[#FF9E45]/10 flex items-center justify-center text-[#FF9E45] hover:bg-[#FF9E45]/20 transition-all disabled:opacity-50"
                          title="Restreindre"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleConversationAction(conv.id, "blocked")}
                          disabled={actionLoading === conv.id}
                          className="w-8 h-8 rounded-lg bg-[#F56565]/10 flex items-center justify-center text-[#F56565] hover:bg-[#F56565]/20 transition-all disabled:opacity-50"
                          title="Bloquer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {(conv.status === "restricted" || conv.status === "blocked") && (
                      <button
                        onClick={() => handleConversationAction(conv.id, "active")}
                        disabled={actionLoading === conv.id}
                        className="w-8 h-8 rounded-lg bg-[#38C172]/10 flex items-center justify-center text-[#38C172] hover:bg-[#38C172]/20 transition-all disabled:opacity-50"
                        title="Réactiver"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedConv(conv); setShowModModal(true); }}
                      className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151] transition-all"
                      title="Modérer"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {conv.restricted_reason && (
                  <div className="mt-3 p-3 bg-[#FF9E45]/5 rounded-lg text-xs text-[#6B7280]">
                    <span className="font-semibold">Raison:</span> {conv.restricted_reason}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )
      ) : (
        alerts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
            <Shield className="w-12 h-12 text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[#9CA3AF] font-medium">Aucune alerte trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:border-[#C6D4C0] transition-all"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase", SEVERITY_CLASSES[alert.severity])}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-[#6B7280]">{ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
                    </div>
                    <p className="text-sm text-[#374151] mb-2">{alert.description}</p>
                    {alert.snippet && (
                      <p className="text-xs text-[#9CA3AF] italic p-2 bg-[#F9FAFB] rounded-lg">"{alert.snippet}"</p>
                    )}
                    <p className="text-xs text-[#9CA3AF] mt-2">
                      Utilisateur signalé: <Link href={`/admin/users/${alert.reported_user_id}`} className="font-semibold text-[#486B46] hover:underline">{alert.reported_user?.name || "Inconnu"}</Link>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold",
                      alert.status === "open" ? "bg-[#FF9E45]/10 text-[#FF9E45]" :
                      alert.status === "investigating" ? "bg-[#4F7DF3]/10 text-[#4F7DF3]" :
                      alert.status === "resolved" ? "bg-[#38C172]/10 text-[#38C172]" :
                      "bg-[#9CA3AF]/10 text-[#9CA3AF]"
                    )}>
                      {alert.status === "open" ? "Ouverte" : alert.status === "investigating" ? "En cours" : alert.status === "resolved" ? "Résolue" : "Rejetée"}
                    </span>
                    <p className="text-[10px] text-[#9CA3AF]">{new Date(alert.created_at).toLocaleDateString("fr-FR")}</p>
                    <div className="flex gap-2">
                      {alert.status === "open" && (
                        <>
                          <button
                            onClick={() => handleAlertAction(alert.id, "investigating")}
                            disabled={actionLoading === alert.id}
                            className="px-3 py-1.5 rounded-lg bg-[#4F7DF3]/10 text-[#4F7DF3] text-xs font-medium hover:bg-[#4F7DF3]/20 transition-all disabled:opacity-50"
                          >
                            Investiguer
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, "resolved")}
                            disabled={actionLoading === alert.id}
                            className="px-3 py-1.5 rounded-lg bg-[#38C172]/10 text-[#38C172] text-xs font-medium hover:bg-[#38C172]/20 transition-all disabled:opacity-50"
                          >
                            Résoudre
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, "dismissed")}
                            disabled={actionLoading === alert.id}
                            className="px-3 py-1.5 rounded-lg bg-[#9CA3AF]/10 text-[#9CA3AF] text-xs font-medium hover:bg-[#9CA3AF]/20 transition-all disabled:opacity-50"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      {alert.status === "investigating" && (
                        <button
                          onClick={() => handleAlertAction(alert.id, "resolved")}
                          disabled={actionLoading === alert.id}
                          className="px-3 py-1.5 rounded-lg bg-[#38C172]/10 text-[#38C172] text-xs font-medium hover:bg-[#38C172]/20 transition-all disabled:opacity-50"
                        >
                          Résoudre
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
          <p className="text-sm text-[#9CA3AF]">Page {page} sur {totalPages} · {total} résultats</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {showModModal && selectedConv && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Action de Modération
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#374151] mb-2 block">Utilisateur cible</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModAction((a) => ({ ...a, target_user_id: selectedConv.user_a_id }))}
                    className={cn("flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                      modAction.target_user_id === selectedConv.user_a_id
                        ? "border-[#486B46] bg-[#486B46]/5 text-[#486B46]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    )}
                  >
                    {selectedConv.user_a?.name}
                  </button>
                  <button
                    onClick={() => setModAction((a) => ({ ...a, target_user_id: selectedConv.user_b_id }))}
                    className={cn("flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                      modAction.target_user_id === selectedConv.user_b_id
                        ? "border-[#486B46] bg-[#486B46]/5 text-[#486B46]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                    )}
                  >
                    {selectedConv.user_b?.name}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#374151] mb-2 block">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODERATION_ACTIONS.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => setModAction((a) => ({ ...a, type: action.value }))}
                      className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                        modAction.type === action.value
                          ? "border-current"
                          : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                      )}
                      style={modAction.type === action.value ? { color: action.color, borderColor: action.color, backgroundColor: `${action.color}10` } : {}}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#374151] mb-1 block">Raison *</label>
                <textarea
                  value={modAction.reason}
                  onChange={(e) => setModAction((a) => ({ ...a, reason: e.target.value }))}
                  placeholder="Décrivez la raison de cette action…"
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm text-[#374151] outline-none focus:border-[#486B46] resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleModeration}
                  disabled={!modAction.reason || !modAction.target_user_id || !!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#486B46] text-white font-semibold text-sm hover:bg-[#3A5A3A] transition-all disabled:opacity-50"
                >
                  {actionLoading === "mod" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Confirmer
                </button>
                <button
                  onClick={() => setShowModModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium text-sm hover:bg-[#F9FAFB] transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}