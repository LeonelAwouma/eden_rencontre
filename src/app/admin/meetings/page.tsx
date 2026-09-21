"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  X,
  ExternalLink,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Trash2,
  Ban,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────────────────────── Types ──────────────────────────── */

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  city: string | null;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  user_one_id: string;
  user_two_id: string;
  admin_id: string;
  google_event_id: string | null;
  google_meet_url: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  user_one: Profile;
  user_two: Profile;
  admin: { id: string; name: string; email: string };
}

interface MeetingStats {
  total_meetings: number;
  scheduled_meetings: number;
  completed_meetings: number;
  cancelled_meetings: number;
  upcoming_meetings: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Planifié", color: "#38C172", bg: "#38C172/10" },
  upcoming: { label: "À venir", color: "#3B82F6", bg: "#3B82F6/10" },
  in_progress: { label: "En cours", color: "#F59E0B", bg: "#F59E0B/10" },
  completed: { label: "Terminé", color: "#6B7280", bg: "#6B7280/10" },
  cancelled: { label: "Annulé", color: "#EF4444", bg: "#EF4444/10" },
  rescheduled: { label: "Reprogrammé", color: "#8B5CF6", bg: "#8B5CF6/10" },
  expired: { label: "Expiré", color: "#9CA3AF", bg: "#9CA3AF/10" },
};

const STATUS_TABS = [
  { key: "all", label: "Tous" },
  { key: "scheduled", label: "Planifiés" },
  { key: "upcoming", label: "À venir" },
  { key: "completed", label: "Terminés" },
  { key: "cancelled", label: "Annulés" },
  { key: "rescheduled", label: "Reprogrammés" },
];

/* ───────────────────────── Page ───────────────────────────── */

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleModalId, setRescheduleModalId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [googleWarning, setGoogleWarning] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: activeTab, limit: "100" });
      const res = await fetch(`/api/admin/meetings?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMeetings(data.meetings || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching meetings:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  /* ── Cancel Meeting ── */
  const handleCancel = async (meetingId: string) => {
    setProcessing(meetingId);
    try {
      const res = await fetch(`/api/admin/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", cancellation_reason: cancelReason }),
      });
      if (res.ok) {
        setCancelModalId(null);
        setCancelReason("");
        fetchMeetings();
      }
    } finally {
      setProcessing(null);
    }
  };

  /* ── Reschedule Meeting ── */
  const handleReschedule = async (meetingId: string) => {
    if (!rescheduleDate || !rescheduleTime) return;
    setProcessing(meetingId);
    try {
      const start_time = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
      const res = await fetch(`/api/admin/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", start_time }),
      });
      if (res.ok) {
        setRescheduleModalId(null);
        setRescheduleDate("");
        setRescheduleTime("");
        fetchMeetings();
      }
    } finally {
      setProcessing(null);
    }
  };

  /* ── Delete Meeting ── */
  const handleDelete = async (meetingId: string) => {
    if (!confirm("Supprimer définitivement ce rendez-vous ?")) return;
    setProcessing(meetingId);
    try {
      const res = await fetch(`/api/admin/meetings/${meetingId}`, { method: "DELETE" });
      if (res.ok) fetchMeetings();
    } finally {
      setProcessing(null);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <>
      

      {/* Title + Create Button */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            Rendez-vous vidéo
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium">Planifiez et gérez les rencontres Google Meet</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#38C172] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(56,193,114,0.3)] hover:shadow-[0_6px_24px_rgba(56,193,114,0.4)] hover:-translate-y-0.5 transition-all">
          <Plus className="w-4 h-4" /> Nouveau rendez-vous
        </button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: stats.total_meetings, color: "#1a1a1a" },
            { label: "Planifiés", value: stats.scheduled_meetings, color: "#38C172" },
            { label: "À venir", value: stats.upcoming_meetings, color: "#3B82F6" },
            { label: "Terminés", value: stats.completed_meetings, color: "#6B7280" },
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

      {/* Meetings List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-12 text-center">
          <Video className="w-12 h-12 text-[#E5E7EB] mx-auto mb-4" />
          <p className="text-[15px] font-semibold text-[#374151]">Aucun rendez-vous</p>
          <p className="text-[13px] text-[#9CA3AF] mt-1">Créez un premier rendez-vous vidéo pour deux participants</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-4 px-5 py-2.5 rounded-xl bg-[#38C172] text-white text-[13px] font-semibold">
            <Plus className="w-4 h-4 inline mr-1.5" /> Nouveau rendez-vous
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting, i) => {
            const { date, time } = formatDateTime(meeting.start_time);
            const statusCfg = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;

            return (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-[18px] border border-[#E5E7EB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Date & Time Block */}
                  <div className="flex-shrink-0 w-[80px] text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col items-center justify-center mx-auto">
                      <Calendar className="w-4 h-4 text-[#9CA3AF] mb-0.5" />
                      <span className="text-[10px] font-bold text-[#374151] uppercase">{date.split(" ")[0]}</span>
                      <span className="text-[16px] font-bold text-[#1a1a1a]">{date.split(" ")[1]}</span>
                    </div>
                  </div>

                  {/* Meeting Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold text-[#1a1a1a] truncate">{meeting.title}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ color: statusCfg.color, backgroundColor: `color-mix(in srgb, ${statusCfg.color} 10%, transparent)` }}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {meeting.description && <p className="text-[12px] text-[#9CA3AF] mb-2 line-clamp-1">{meeting.description}</p>}

                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#6B7280]">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {time} · {meeting.duration_minutes} min</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {meeting.user_one?.name || "—"} ↔ {meeting.user_two?.name || "—"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {meeting.google_meet_url && meeting.status !== "cancelled" && (
                      <a href={meeting.google_meet_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#38C172] text-white text-[12px] font-semibold hover:bg-[#2DA861] transition-all">
                        <Video className="w-3.5 h-3.5" /> Rejoindre
                      </a>
                    )}

                    <div className="relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === meeting.id ? null : meeting.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {actionMenuId === meeting.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-[#E5E7EB] shadow-[0_8px_32px_rgba(0,0,0,0.08)] py-1.5 z-20"
                          >
                            {meeting.status !== "cancelled" && meeting.status !== "completed" && (
                              <>
                                <button
                                  onClick={() => { setRescheduleModalId(meeting.id); setActionMenuId(null); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-all"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-[#9CA3AF]" /> Reprogrammer
                                </button>
                                <button
                                  onClick={() => { setCancelModalId(meeting.id); setActionMenuId(null); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#EF4444] hover:bg-red-50 transition-all"
                                >
                                  <Ban className="w-3.5 h-3.5" /> Annuler
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => { handleDelete(meeting.id); setActionMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[#EF4444] hover:bg-red-50 transition-all"
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

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModalId && (
          <Modal onClose={() => { setCancelModalId(null); setCancelReason(""); }} title="Annuler le rendez-vous">
            <p className="text-[13px] text-[#6B7280] mb-4">Les participants seront notifiés de l'annulation.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Raison de l'annulation (optionnel)"
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[13px] text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] resize-none h-24 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setCancelModalId(null); setCancelReason(""); }} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">Annuler</button>
              <button onClick={() => handleCancel(cancelModalId)} disabled={processing === cancelModalId} className="flex-1 px-4 py-2.5 rounded-xl bg-[#EF4444] text-white text-[13px] font-semibold hover:bg-[#DC2626] transition-all disabled:opacity-50">
                {processing === cancelModalId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer l'annulation"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleModalId && (
          <Modal onClose={() => { setRescheduleModalId(null); setRescheduleDate(""); setRescheduleTime(""); }} title="Reprogrammer le rendez-vous">
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Nouvelle date</label>
                <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Nouvelle heure</label>
                <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172]" />
              </div>
            </div>
            <p className="text-[12px] text-[#9CA3AF] mb-4">L'événement Google Calendar sera automatiquement mis à jour.</p>
            <div className="flex gap-3">
              <button onClick={() => { setRescheduleModalId(null); setRescheduleDate(""); setRescheduleTime(""); }} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">Annuler</button>
              <button onClick={() => handleReschedule(rescheduleModalId)} disabled={!rescheduleDate || !rescheduleTime || processing === rescheduleModalId} className="flex-1 px-4 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-[13px] font-semibold hover:bg-[#7C3AED] transition-all disabled:opacity-50">
                {processing === rescheduleModalId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reprogrammer"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Create Meeting Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateMeetingModal
            onClose={() => { setShowCreateModal(false); setGoogleWarning(null); }}
            onCreated={(warning) => { setShowCreateModal(false); setGoogleWarning(warning); fetchMeetings(); }}
          />
        )}
      </AnimatePresence>

      {/* Google Warning Banner */}
      <AnimatePresence>
        {googleWarning && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] max-w-md">
            <p className="text-[13px] font-semibold text-amber-800 mb-1">⚠ Google Calendar non configuré</p>
            <p className="text-[12px] text-amber-700">{googleWarning}</p>
            <button onClick={() => setGoogleWarning(null)} className="absolute top-3 right-3 text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────────────────── Modal Wrapper ──────────────────────── */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-6 w-full max-w-md">
        <h2 className="text-[18px] font-bold text-[#1a1a1a] mb-4">{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────── Create Meeting Modal ───────────────── */

function CreateMeetingModal({ onClose, onCreated }: { onClose: () => void; onCreated: (warning: string | null) => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    title: "Première rencontre guidée",
    description: "",
    user_one_id: "",
    user_two_id: "",
    extra_participants: [] as string[],
    date: "",
    time: "18:00",
    duration_minutes: 60,
  });
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users?limit=500");
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

  const allSelectedIds = [form.user_one_id, form.user_two_id, ...form.extra_participants].filter(Boolean);
  const availableUsers = users.filter((u) => !allSelectedIds.includes(u.id));

  const addExtraParticipant = () => {
    setForm((f) => ({ ...f, extra_participants: [...f.extra_participants, ""] }));
  };

  const removeExtraParticipant = (index: number) => {
    setForm((f) => ({
      ...f,
      extra_participants: f.extra_participants.filter((_, i) => i !== index),
    }));
  };

  const updateExtraParticipant = (index: number, userId: string) => {
    setForm((f) => {
      const updated = [...f.extra_participants];
      updated[index] = userId;
      return { ...f, extra_participants: updated };
    });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.user_one_id || !form.user_two_id || !form.date || !form.time) return;
    if (form.user_one_id === form.user_two_id) return;

    setLoading(true);
    try {
      const start_time = new Date(`${form.date}T${form.time}`).toISOString();
      const validExtras = form.extra_participants.filter(Boolean);

      const res = await fetch("/api/admin/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          user_one_id: form.user_one_id,
          user_two_id: form.user_two_id,
          participant_ids: validExtras,
          admin_id: "current",
          start_time,
          duration_minutes: form.duration_minutes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCreated(data.google_error || null);
      }
    } finally {
      setLoading(false);
    }
  };

  const UserSelector = ({ label, value, onChange, excludeIds }: { label: string; value: string; onChange: (id: string) => void; excludeIds?: string[] }) => {
    const excluded = excludeIds || [];
    const options = users.filter((u) => !excluded.includes(u.id) || u.id === value);
    return (
      <div>
        <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all">
          <option value="">Sélectionner un participant</option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#1a1a1a]">Nouveau rendez-vous vidéo</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">Un lien Google Meet sera automatiquement généré</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Titre</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Première rencontre guidée" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172]" />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description du rendez-vous (optionnel)" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] resize-none h-20" />
          </div>

          {/* Primary participants */}
          <div className="space-y-3">
            <UserSelector
              label="Participant 1"
              value={form.user_one_id}
              onChange={(id) => setForm((f) => ({ ...f, user_one_id: id }))}
              excludeIds={[form.user_two_id, ...form.extra_participants]}
            />
            <UserSelector
              label="Participant 2"
              value={form.user_two_id}
              onChange={(id) => setForm((f) => ({ ...f, user_two_id: id }))}
              excludeIds={[form.user_one_id, ...form.extra_participants]}
            />
          </div>

          {form.user_one_id === form.user_two_id && form.user_one_id && (
            <p className="text-[12px] text-[#EF4444] font-medium">Les deux participants principaux doivent être différents</p>
          )}

          {/* Additional participants */}
          {form.extra_participants.map((pid, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                  Participant {index + 3}
                </label>
                <select
                  value={pid}
                  onChange={(e) => updateExtraParticipant(index, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all"
                >
                  <option value="">Sélectionner un participant</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeExtraParticipant(index)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#EF4444] hover:bg-red-50 border border-[#E5E7EB] transition-all shrink-0"
                title="Retirer ce participant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addExtraParticipant}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#D1D5DB] text-[13px] font-medium text-[#6B7280] hover:text-[#38C172] hover:border-[#38C172] hover:bg-[#38C172]/5 transition-all w-full justify-center"
          >
            <Plus className="w-4 h-4" /> Ajouter un participant
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Heure</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172]" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">Durée</label>
            <select value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))} className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172]">
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 heure</option>
              <option value={90}>1h30</option>
              <option value={120}>2 heures</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={!form.title || !form.user_one_id || !form.user_two_id || !form.date || !form.time || form.user_one_id === form.user_two_id || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#38C172] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(56,193,114,0.3)] hover:shadow-[0_6px_24px_rgba(56,193,114,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Video className="w-4 h-4" /> Créer le rendez-vous</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
