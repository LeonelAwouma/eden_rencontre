"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Search,
  X,
  ExternalLink,
  MoreHorizontal,
  Loader2,
  Trash2,
  Ban,
  CheckCircle,
  RefreshCw,
  Eye,
  Mail,
  AlertTriangle,
  Copy,
  ChevronLeft,
  UserPlus,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

/* ───────────────────────── Types ──────────────────────────── */

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface MeetSpace {
  id: string;
  title: string;
  description: string | null;
  meeting_uri: string | null;
  meeting_code: string | null;
  space_name: string | null;
  start_time: string;
  duration: number;
  created_by: string | null;
  created_at: string;
  status: string;
  invitation_stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

interface MeetInvitation {
  id: string;
  meet_id: string;
  user_id: string;
  email: string;
  status: string;
  invited_at: string;
  email_sent_at: string | null;
  error_message: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface MeetDetail extends MeetSpace {
  invitations: MeetInvitation[];
}

interface MeetStats {
  total_meets: number;
  active_meets: number;
  cancelled_meets: number;
  completed_meets: number;
  total_invitations: number;
  sent_invitations: number;
  pending_invitations: number;
  failed_invitations: number;
}

/* ───────────────────────── Config ─────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Actif", color: "#38C172" },
  cancelled: { label: "Annulé", color: "#EF4444" },
  completed: { label: "Terminé", color: "#6B7280" },
};

const INVITATION_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  sent: { label: "Envoyé", color: "#38C172", icon: "✓" },
  failed: { label: "Échoué", color: "#EF4444", icon: "✗" },
  pending: { label: "En attente", color: "#F59E0B", icon: "⏳" },
};

const STATUS_TABS = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "completed", label: "Terminés" },
  { key: "cancelled", label: "Annulés" },
];

/* ───────────────────────── Page ───────────────────────────── */

export default function AdminMeetsPage() {
  const [meets, setMeets] = useState<MeetSpace[]>([]);
  const [stats, setStats] = useState<MeetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailMeetId, setDetailMeetId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Google Meet connection status
  const [meetStatus, setMeetStatus] = useState<{
    connected: boolean;
    hasMeetScope: boolean;
    tokenExpired: boolean;
    googleEmail: string | null;
  } | null>(null);
  const [meetStatusLoading, setMeetStatusLoading] = useState(true);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  const fetchMeets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: activeTab, limit: "100" });
      const res = await fetch(`/api/admin/meets?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMeets(data.meets || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching meets:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchMeets(); }, [fetchMeets]);

  // Fetch Google Meet connection status
  const fetchMeetStatus = useCallback(async () => {
    setMeetStatusLoading(true);
    try {
      const res = await fetch("/api/admin/google-meet/status");
      if (res.ok) {
        const data = await res.json();
        setMeetStatus({
          connected: data.connected,
          hasMeetScope: data.hasMeetScope,
          tokenExpired: data.tokenExpired,
          googleEmail: data.googleEmail,
        });
      } else {
        setMeetStatus({ connected: false, hasMeetScope: false, tokenExpired: false, googleEmail: null });
      }
    } catch {
      setMeetStatus({ connected: false, hasMeetScope: false, tokenExpired: false, googleEmail: null });
    } finally {
      setMeetStatusLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetStatus(); }, [fetchMeetStatus]);

  // Handle OAuth callback URL params (after Google Meet redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meetSuccess = params.get("google_meet_success");
    const meetError = params.get("google_meet_error");

    if (meetSuccess === "1") {
      setSuccessBanner("Google Meet connecté avec succès ! Vous pouvez maintenant créer des meetings avec lien Google Meet.");
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status and meets
      setTimeout(() => {
        fetchMeetStatus();
        fetchMeets();
      }, 500);
    } else if (meetError) {
      setErrorBanner(decodeURIComponent(meetError));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchMeetStatus, fetchMeets]);

  // Initiate Google Meet OAuth connection
  const handleConnectGoogleMeet = async () => {
    setConnectingGoogle(true);
    try {
      const res = await fetch("/api/admin/google-meet/authorize", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setErrorBanner(data.error || "Erreur lors de la connexion à Google Meet.");
      }
    } catch {
      setErrorBanner("Erreur réseau lors de la connexion à Google Meet.");
    } finally {
      setConnectingGoogle(false);
    }
  };

  // Disconnect Google Meet (so admin can reconnect with a different account)
  const handleDisconnectGoogleMeet = async () => {
    if (!confirm("Déconnecter ce compte Google Meet ? Vous pourrez ensuite en connecter un autre.")) return;
    setDisconnectingGoogle(true);
    try {
      const res = await fetch("/api/admin/google-meet/disconnect", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessBanner("Google Meet déconnecté. Connectez un autre compte ci-dessous.");
        await fetchMeetStatus();
      } else {
        setErrorBanner(data.error || "Erreur lors de la déconnexion.");
      }
    } catch {
      setErrorBanner("Erreur réseau lors de la déconnexion.");
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  const googleMeetReady = meetStatus?.connected && meetStatus?.hasMeetScope && !meetStatus?.tokenExpired;

  const handleDelete = async (meetId: string) => {
    if (!confirm("Supprimer définitivement ce meeting et toutes ses invitations ?")) return;
    setProcessing(meetId);
    try {
      const res = await fetch(`/api/admin/meets/${meetId}`, { method: "DELETE" });
      if (res.ok) {
        fetchMeets();
        setSuccessBanner("Meeting supprimé avec succès.");
      }
    } finally {
      setProcessing(null);
      setActionMenuId(null);
    }
  };

  const handleStatusChange = async (meetId: string, newStatus: string) => {
    setProcessing(meetId);
    try {
      const res = await fetch(`/api/admin/meets/${meetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchMeets();
        setSuccessBanner(`Meeting marqué comme ${STATUS_CONFIG[newStatus]?.label || newStatus}.`);
      }
    } finally {
      setProcessing(null);
      setActionMenuId(null);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  // If viewing a detail, show the detail view
  if (detailMeetId) {
    return (
      <MeetDetailView
        meetId={detailMeetId}
        onBack={() => setDetailMeetId(null)}
        onResendSuccess={(msg) => setSuccessBanner(msg)}
      />
    );
  }

  return (
    <>
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />

      {/* Success/Error Banners */}
      <AnimatePresence>
        {successBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-green-800">✓ {successBanner}</p>
            <button onClick={() => setSuccessBanner(null)} className="text-green-400 hover:text-green-600"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {errorBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-red-800">⚠ {errorBanner}</p>
            <button onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Meet Connection Status Banner */}
      {!meetStatusLoading && meetStatus && !googleMeetReady && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-[20px] border-2 border-dashed p-5"
          style={{
            background: "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)",
            borderColor: "#F59E0B",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#FEF3C7" }}
            >
              <Video className="w-5 h-5" style={{ color: "#D97706" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-[#92400E] mb-1">
                Google Meet non connecté
              </h3>
              <p className="text-[13px] text-[#B45309] mb-3 leading-relaxed">
                {!meetStatus.connected
                  ? "Connectez votre compte Google pour créer des meetings avec un lien Google Meet. Les participants pourront rejoindre directement depuis l'invitation."
                  : meetStatus.tokenExpired
                  ? "Votre connexion Google a expiré. Veuillez vous reconnecter pour continuer à créer des Google Meets."
                  : "L'autorisation Google Meet est manquante. Veuillez vous reconnecter en accordant la permission Google Meet."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleConnectGoogleMeet}
                  disabled={connectingGoogle}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
                    boxShadow: "0 4px 16px rgba(217,119,6,0.3)",
                  }}
                >
                  {connectingGoogle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours…
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" /> Connecter Google Meet
                    </>
                  )}
                </button>
                {meetStatus.googleEmail && (
                  <span className="text-[12px] text-[#92400E]">
                    Compte : <span className="font-semibold">{meetStatus.googleEmail}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Google Meet Connected indicator with change account option */}
      {!meetStatusLoading && googleMeetReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl"
          style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#486B46" }} />
            <p className="text-[12px] font-medium truncate" style={{ color: "#2F5D2E" }}>
              Google Meet connecté
              {meetStatus.googleEmail && (
                <span className="text-[#486B46] font-semibold"> — {meetStatus.googleEmail}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleDisconnectGoogleMeet}
            disabled={disconnectingGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0 hover:bg-white/60 disabled:opacity-50"
            style={{ color: "#92400E", border: "1px solid #C6D4C0" }}
          >
            {disconnectingGoogle ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Unplug className="w-3 h-3" />
            )}
            Changer de compte
          </button>
        </motion.div>
      )}

      {/* Title + Create Button */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            Google Meets
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium">Créez des réunions Google Meet et envoyez des invitations par email</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5016] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(45,80,22,0.3)] hover:shadow-[0_6px_24px_rgba(45,80,22,0.4)] hover:-translate-y-0.5 transition-all">
          <Plus className="w-4 h-4" /> Créer un Google Meet
        </button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Meets", value: stats.total_meets, color: "#1a1a1a" },
            { label: "Actifs", value: stats.active_meets, color: "#38C172" },
            { label: "Emails envoyés", value: stats.sent_invitations, color: "#3B82F6" },
            { label: "Échecs email", value: stats.failed_invitations, color: "#EF4444" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-[16px] border border-[#E5E7EB] p-4">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{stat.label}</p>
              <p className="text-[22px] font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap",
              activeTab === tab.key ? "bg-[#1a1a1a] text-white" : "bg-white text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meets List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-[3px] border-[#2D5016]/20 border-t-[#2D5016] rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
        </div>
      ) : meets.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-12 text-center">
          <Video className="w-12 h-12 text-[#E5E7EB] mx-auto mb-4" />
          <p className="text-[15px] font-semibold text-[#374151]">Aucun Google Meet</p>
          <p className="text-[13px] text-[#9CA3AF] mt-1">Créez votre premier meeting Google Meet avec invitations automatiques</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-4 px-5 py-2.5 rounded-xl bg-[#2D5016] text-white text-[13px] font-semibold">
            <Plus className="w-4 h-4 inline mr-1.5" /> Créer un Google Meet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meets.map((meet, i) => {
            const { date, time } = formatDateTime(meet.start_time);
            const statusCfg = STATUS_CONFIG[meet.status] || STATUS_CONFIG.active;

            return (
              <motion.div
                key={meet.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-[18px] border border-[#E5E7EB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Date & Time Block */}
                  <div className="flex-shrink-0 w-[80px] text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#EEF5EC] border border-[#D4E8CF] flex flex-col items-center justify-center mx-auto">
                      <Calendar className="w-4 h-4 text-[#486B46] mb-0.5" />
                      <span className="text-[10px] font-bold text-[#374151] uppercase">{date.split(" ")[0]}</span>
                      <span className="text-[16px] font-bold text-[#2D5016]">{date.split(" ")[1]}</span>
                    </div>
                  </div>

                  {/* Meet Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold text-[#1a1a1a] truncate">{meet.title}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ color: statusCfg.color, backgroundColor: `color-mix(in srgb, ${statusCfg.color} 10%, transparent)` }}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {meet.description && <p className="text-[12px] text-[#9CA3AF] mb-2 line-clamp-1">{meet.description}</p>}

                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6B7280]">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {time} · {meet.duration} min</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {meet.invitation_stats.total} invité(s)</span>
                      {meet.invitation_stats.sent > 0 && (
                        <span className="flex items-center gap-1 text-[#38C172]"><Mail className="w-3.5 h-3.5" /> {meet.invitation_stats.sent} envoyé(s)</span>
                      )}
                      {meet.invitation_stats.failed > 0 && (
                        <span className="flex items-center gap-1 text-[#EF4444]"><AlertTriangle className="w-3.5 h-3.5" /> {meet.invitation_stats.failed} échoué(s)</span>
                      )}
                      {meet.meeting_code && (
                        <span className="flex items-center gap-1 text-[#9CA3AF]">Code: {meet.meeting_code}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {meet.meeting_uri && meet.status === "active" && (
                      <a href={meet.meeting_uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5016] text-white text-[12px] font-semibold hover:bg-[#3D6B1E] transition-all">
                        <Video className="w-3.5 h-3.5" /> Rejoindre
                      </a>
                    )}

                    <button
                      onClick={() => setDetailMeetId(meet.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151] transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> Détails
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === meet.id ? null : meet.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {actionMenuId === meet.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-[#E5E7EB] shadow-[0_8px_32px_rgba(0,0,0,0.08)] py-1.5 z-20"
                          >
                            {meet.meeting_uri && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(meet.meeting_uri!); setSuccessBanner("Lien copié !"); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" /> Copier le lien
                              </button>
                            )}
                            {meet.status === "active" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(meet.id, "completed")}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-[#9CA3AF]" /> Marquer terminé
                                </button>
                                <button
                                  onClick={() => handleStatusChange(meet.id, "cancelled")}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#EF4444] hover:bg-red-50 transition-all"
                                >
                                  <Ban className="w-3.5 h-3.5" /> Annuler
                                </button>
                              </>
                            )}
                            {meet.status !== "active" && (
                              <button
                                onClick={() => handleStatusChange(meet.id, "active")}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#38C172] hover:bg-green-50 transition-all"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Réactiver
                              </button>
                            )}
                            <div className="border-t border-[#F3F4F6] my-1" />
                            <button
                              onClick={() => handleDelete(meet.id)}
                              disabled={processing === meet.id}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#EF4444] hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Supprimer
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Meeting Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateMeetModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(result) => {
              setShowCreateModal(false);
              fetchMeets();
              if (result.google_error) {
                // Google Meet specific warning takes priority
                setErrorBanner(result.google_error + " Cliquez sur « Connecter Google Meet » ci-dessus pour autoriser l'accès.");
                fetchMeetStatus();
              } else if (result.error) {
                setErrorBanner(result.error);
              } else {
                const parts = [];
                if (result.emails_sent > 0) parts.push(`${result.emails_sent} invitation(s) envoyée(s)`);
                if (result.emails_failed > 0) parts.push(`${result.emails_failed} échec(s)`);
                setSuccessBanner(`Meeting créé avec succès ! ${parts.join(", ")}`);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Click outside action menu */}
      {actionMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
      )}
    </>
  );
}

/* ───────────────────── Create Meet Modal ──────────────────── */

function CreateMeetModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (result: { emails_sent: number; emails_failed: number; error?: string; google_error?: string }) => void;
}) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "18:00",
    duration: 60,
  });
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [step, setStep] = useState<"details" | "users">("details");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users?limit=1000");
        const data = await res.json();
        if (res.ok) setUsers(data.users || []);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setFetchingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUserIds([]);
      setSelectAll(false);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
      setSelectAll(true);
    }
  };

  const canProceed = step === "details"
    ? form.title.trim() && form.date && form.time
    : selectedUserIds.length > 0;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date || !form.time || selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const start_time = new Date(`${form.date}T${form.time}`).toISOString();

      const res = await fetch("/api/admin/meets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_time,
          duration: form.duration,
          user_ids: selectedUserIds,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCreated({
          emails_sent: data.emails_sent || 0,
          emails_failed: data.emails_failed || 0,
          google_error: data.google_error || undefined,
        });
      } else {
        onCreated({ emails_sent: 0, emails_failed: 0, error: data.error || "Erreur lors de la création" });
      }
    } catch {
      onCreated({ emails_sent: 0, emails_failed: 0, error: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-[0_20px_60px_rgba(0,0,0,0.1)] w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
          <div>
            <h2 className="text-[18px] font-bold text-[#1a1a1a]">Créer un Google Meet</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              {step === "details" ? "Étape 1/2 — Détails du meeting" : "Étape 2/2 — Sélectionner les participants"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6]"><X className="w-4 h-4" /></button>
        </div>

        {/* Step Indicator */}
        <div className="flex px-6 pt-3">
          <div className="flex-1 h-1 rounded-full bg-[#2D5016] mr-1" />
          <div className={cn("flex-1 h-1 rounded-full ml-1 transition-colors", step === "users" ? "bg-[#2D5016]" : "bg-[#E5E7EB]")} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "details" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Titre du meeting *</label>
                <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Réunion mensuelle communauté" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016]" />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Description / message pour les invités</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Message qui sera inclus dans l'email d'invitation…" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] resize-none h-20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016]" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Heure *</label>
                  <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016]" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Durée</label>
                <select value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016]">
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 heures</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1D5DB]" />
                <input
                  placeholder="Rechercher par nom ou email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] transition-all font-medium"
                />
              </div>

              {/* Select All */}
              <button
                onClick={toggleSelectAll}
                className={cn(
                  "flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all",
                  selectAll ? "bg-[#EEF5EC] border-[#2D5016] text-[#2D5016]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                )}
              >
                <UserPlus className="w-4 h-4" />
                {selectAll ? "Désélectionner tous" : "Sélectionner tous les utilisateurs"}
              </button>

              {/* Counter */}
              <div className="bg-[#EEF5EC] rounded-xl px-4 py-3 text-center">
                <p className="text-[14px] font-bold text-[#2D5016]">
                  {selectedUserIds.length} utilisateur{selectedUserIds.length !== 1 ? "s" : ""} sélectionné{selectedUserIds.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} invitation${selectedUserIds.length > 1 ? "s" : ""} sera envoyée${selectedUserIds.length > 1 ? "s" : ""} par email`
                    : "Sélectionnez au moins un utilisateur"}
                </p>
              </div>

              {/* User List */}
              {fetchingUsers ? (
                <div className="text-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#9CA3AF]" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-[13px] text-[#9CA3AF] py-4">Aucun utilisateur trouvé</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                  {filteredUsers.map((user) => {
                    const selected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-left transition-all",
                          selected ? "bg-[#EEF5EC] border border-[#2D5016]/30" : "hover:bg-[#F9FAFB] border border-transparent"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", selected ? "bg-[#2D5016] border-[#2D5016]" : "border-[#D1D5DB]")}>
                          {selected && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#374151] truncate">{user.name || "Sans nom"}</p>
                          <p className="text-[11px] text-[#9CA3AF] truncate">{user.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#F3F4F6] px-6 py-4 flex gap-3">
          {step === "users" && (
            <button onClick={() => setStep("details")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
          )}
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">Annuler</button>
          {step === "details" ? (
            <button
              onClick={() => setStep("users")}
              disabled={!canProceed}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#2D5016] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(45,80,22,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Suivant — Inviter des participants
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D5016] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(45,80,22,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Video className="w-4 h-4" /> Créer et envoyer ({selectedUserIds.length})</>}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────── Meet Detail View ───────────────────── */

function MeetDetailView({ meetId, onBack, onResendSuccess }: {
  meetId: string;
  onBack: () => void;
  onResendSuccess: (msg: string) => void;
}) {
  const [meet, setMeet] = useState<MeetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/admin/meets/${meetId}`);
        const data = await res.json();
        if (res.ok) setMeet(data.meet);
      } catch (err) {
        console.error("Error fetching meet detail:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [meetId]);

  const handleResend = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const res = await fetch(`/api/admin/meets/${meetId}/resend-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation_id: invitationId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onResendSuccess("Email renvoyé avec succès !");
        // Refresh detail
        const detailRes = await fetch(`/api/admin/meets/${meetId}`);
        const detailData = await detailRes.json();
        if (detailRes.ok) setMeet(detailData.meet);
      } else {
        onResendSuccess("Échec du renvoi de l'email.");
      }
    } catch {
      onResendSuccess("Erreur lors du renvoi.");
    } finally {
      setResendingId(null);
    }
  };

  const copyLink = () => {
    if (meet?.meeting_uri) {
      navigator.clipboard.writeText(meet.meeting_uri);
      onResendSuccess("Lien Google Meet copié !");
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-[3px] border-[#2D5016]/20 border-t-[#2D5016] rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
        </div>
      </>
    );
  }

  if (!meet) {
    return (
      <>
        <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
        <div className="p-12 text-center">
          <p className="text-[15px] font-semibold text-[#374151]">Meeting introuvable</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 rounded-xl bg-[#F3F4F6] text-[13px] font-medium">Retour</button>
        </div>
      </>
    );
  }

  const { date, time } = (() => {
    const d = new Date(meet.start_time);
    return {
      date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  })();
  const statusCfg = STATUS_CONFIG[meet.status] || STATUS_CONFIG.active;

  return (
    <>
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Back Button */}
        <button onClick={onBack} className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280] hover:text-[#374151] mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour aux meetings
        </button>

        {/* Meet Header */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-[22px] font-bold text-[#1a1a1a]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>{meet.title}</h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold" style={{ color: statusCfg.color, backgroundColor: `color-mix(in srgb, ${statusCfg.color} 10%, transparent)` }}>
                  {statusCfg.label}
                </span>
              </div>
              {meet.description && <p className="text-[13px] text-[#6B7280] max-w-lg">{meet.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-[#F9FAFB] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Date & Heure</p>
              <p className="text-[14px] font-semibold text-[#374151] capitalize">{date}</p>
              <p className="text-[13px] text-[#6B7280]">{time} · {meet.duration} min</p>
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Google Meet</p>
              {meet.meeting_uri ? (
                <a href={meet.meeting_uri} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-[#2D5016] hover:underline break-all">{meet.meeting_uri}</a>
              ) : (
                <p className="text-[13px] text-[#9CA3AF]">Non disponible</p>
              )}
              {meet.meeting_code && <p className="text-[12px] text-[#6B7280] mt-1">Code: <strong>{meet.meeting_code}</strong></p>}
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Invitations</p>
              <p className="text-[14px] font-semibold text-[#374151]">{meet.invitation_stats.total} au total</p>
              <div className="flex gap-3 mt-1 text-[12px]">
                <span className="text-[#38C172]">✓ {meet.invitation_stats.sent} envoyé(s)</span>
                <span className="text-[#EF4444]">✗ {meet.invitation_stats.failed} échoué(s)</span>
                {meet.invitation_stats.pending > 0 && <span className="text-[#F59E0B]">⏳ {meet.invitation_stats.pending} en attente</span>}
              </div>
            </div>
          </div>

          {meet.meeting_uri && (
            <div className="flex gap-2">
              <a href={meet.meeting_uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5016] text-white text-[13px] font-semibold hover:bg-[#3D6B1E] transition-all">
                <Video className="w-4 h-4" /> Rejoindre Google Meet
              </a>
              <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-all">
                <Copy className="w-4 h-4" /> Copier le lien
              </button>
            </div>
          )}
        </div>

        {/* Invitations List */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-6">
          <h2 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Invitations ({meet.invitations.length})</h2>

          {meet.invitations.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF] text-center py-6">Aucune invitation</p>
          ) : (
            <div className="space-y-2">
              {meet.invitations.map((inv) => {
                const invStatus = INVITATION_STATUS[inv.status] || INVITATION_STATUS.pending;
                const userName = inv.user?.name || "Utilisateur inconnu";
                const userEmail = inv.user?.email || inv.email || "Pas d'email";

                return (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#F3F4F6] hover:bg-[#FAFAFA] transition-all">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#486B46] to-[#6E8B63] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#374151] truncate">{userName}</p>
                      <p className="text-[11px] text-[#9CA3AF] truncate">{userEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ color: invStatus.color, backgroundColor: `color-mix(in srgb, ${invStatus.color} 10%, transparent)` }}>
                        {invStatus.icon} {invStatus.label}
                      </span>
                      {inv.status === "failed" && (
                        <button
                          onClick={() => handleResend(inv.id)}
                          disabled={resendingId === inv.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#2D5016] bg-[#EEF5EC] hover:bg-[#D4E8CF] transition-all disabled:opacity-50"
                        >
                          {resendingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Renvoyer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}