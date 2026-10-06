"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  AlertTriangle,
  Shield,
  Eye,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  Lock,
  Unlock,
  AlertCircle,
  Flag,
  Trash2,
  X,
  ArrowLeft,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import {
  AdminModal, Badge, Card, EmptyBlock, FilterTabs, LoadingBlock, MemberAvatar, Pagination, StatTile, Toast,
  btn, textareaClass, type Tone,
} from "@/components/admin/admin-ui";

interface ChatUser {
  id: string;
  name: string;
  pseudo: string | null;
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

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_flagged: boolean;
  flag_reason: string | null;
  is_deleted: boolean;
  created_at: string;
  sender: {
    id: string;
    name: string;
    pseudo: string | null;
    email: string;
    avatar_url: string | null;
  };
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

const SEVERITY_META: Record<string, { label: string; tone: Tone }> = {
  low: { label: "Faible", tone: "neutral" },
  medium: { label: "Moyenne", tone: "amber" },
  high: { label: "Haute", tone: "red" },
  critical: { label: "Critique", tone: "red" },
};

const CONV_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "green" },
  restricted: { label: "Restreinte", tone: "amber" },
  blocked: { label: "Bloquée", tone: "red" },
  archived: { label: "Archivée", tone: "neutral" },
};

const ALERT_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Ouverte", tone: "amber" },
  investigating: { label: "En cours", tone: "blue" },
  resolved: { label: "Résolue", tone: "green" },
  dismissed: { label: "Rejetée", tone: "neutral" },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  keyword_trigger: "Mot-clé détecté",
  report_received: "Signalement reçu",
  spam_detected: "Spam détecté",
  harassment: "Harcèlement",
  inappropriate_content: "Contenu inapproprié",
  other: "Autre",
};

const MODERATION_ACTIONS: { value: string; label: string; tone: "amber" | "red" | "green"; hint: string }[] = [
  { value: "warning", label: "Avertissement", tone: "amber", hint: "Le membre reçoit un message de l'équipe dans sa messagerie." },
  { value: "restrict", label: "Restreindre la conversation", tone: "amber", hint: "La conversation passe en lecture seule : plus aucun envoi." },
  { value: "block", label: "Bloquer la conversation", tone: "red", hint: "La conversation est fermée pour les deux membres." },
  { value: "account_suspension", label: "Suspendre le compte", tone: "red", hint: "Le membre ne peut plus se connecter et reçoit un e-mail." },
  { value: "note", label: "Note interne", tone: "green", hint: "Simple note dans le journal de modération, rien n'est envoyé." },
]

type Notice = { kind: "success" | "error"; text: string } | null;

/** Réponse d'API → message d'erreur lisible (ou null si tout va bien). */
async function apiError(res: Response): Promise<string | null> {
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.error || "L'action n'a pas pu être effectuée.";
}

// ─── Real-time Conversation Viewer Component ─────────────────────────
function ConversationViewer({
  conversationId,
  userA,
  userB,
  onClose,
  onNotice,
}: {
  conversationId: string;
  userA: ChatUser;
  userB: ChatUser;
  onClose: () => void;
  onNotice: (notice: Notice) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);

  const fetchMessages = useCallback(
    async (since?: string) => {
      try {
        const params = new URLSearchParams({
          conversation_id: conversationId,
          limit: "100",
        });
        if (since) params.set("since", since);

        const res = await fetch(`/api/admin/chat-monitoring/messages?${params}`);
        if (res.ok) {
          const data = await res.json();
          const newMsgs: ChatMessage[] = data.messages || [];

          if (since && newMsgs.length > 0) {
            // Append new messages
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const unique = newMsgs.filter((m) => !existingIds.has(m.id));
              return [...prev, ...unique];
            });
            setNewMessageCount((c) => c + newMsgs.length);
          } else if (!since) {
            setMessages(newMsgs);
          }

          // Update last message timestamp
          if (newMsgs.length > 0) {
            lastMessageTimeRef.current = newMsgs[newMsgs.length - 1].created_at;
          }
        }
      } catch (e) {
        console.error("Failed to fetch messages:", e);
      }
    },
    [conversationId]
  );

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMessages();
      setLoading(false);
    };
    load();
  }, [fetchMessages]);

  // Polling for new messages
  useEffect(() => {
    if (!isLive) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(() => {
      if (lastMessageTimeRef.current) {
        fetchMessages(lastMessageTimeRef.current);
      } else {
        fetchMessages();
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLive, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    if (isLive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewMessageCount(0);
    }
  }, [messages, isLive]);

  const handleFlagMessage = async (messageId: string, flag: boolean) => {
    try {
      const res = await fetch("/api/admin/chat-monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          id: messageId,
          status: flag ? "flagged" : "unflagged",
        }),
      });
      const err = await apiError(res);
      if (err) { onNotice({ kind: "error", text: err }); return; }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, is_flagged: flag, flag_reason: flag ? "Signalé par un administrateur" : null }
            : m
        )
      );
    } catch (e) {
      console.error("Failed to flag message:", e);
      onNotice({ kind: "error", text: "Le signalement n'a pas pu être enregistré." });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Supprimer ce message ? Il sera effacé pour les deux membres.")) return;
    try {
      const res = await fetch("/api/admin/chat-monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "message", id: messageId, status: "deleted" }),
      });
      const err = await apiError(res);
      if (err) { onNotice({ kind: "error", text: err }); return; }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true } : m))
      );
    } catch (e) {
      console.error("Failed to delete message:", e);
      onNotice({ kind: "error", text: "Le message n'a pas pu être supprimé." });
    }
  };

  const nameOf = (u?: ChatUser | null) => u?.pseudo || u?.name || "?";

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`Conversation entre ${nameOf(userA)} et ${nameOf(userB)}`}
      className="relative bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden flex flex-col h-[calc(100dvh-16rem)] min-h-[480px] lg:sticky lg:top-24"
    >
      {/* En-tête */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#F1EEE9] flex items-center gap-3 shrink-0">
        <button type="button" onClick={onClose} className={btn.ghostIcon} aria-label="Fermer la conversation">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex -space-x-2 shrink-0">
          <MemberAvatar name={nameOf(userA)} url={userA?.avatar_url} size={32} className="ring-2 ring-white" />
          <MemberAvatar name={nameOf(userB)} url={userB?.avatar_url} size={32} className="ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-[#1F2A23] truncate">
            {nameOf(userA)} &amp; {nameOf(userB)}
          </h3>
          <p className="text-[12px] text-[#5F6B63] truncate">
            {messages.length} message{messages.length > 1 ? "s" : ""}
            {(userA?.pseudo || userB?.pseudo) && <> · {userA?.name || "?"} &amp; {userB?.name || "?"}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsLive(!isLive)}
          aria-pressed={isLive}
          className={cn(btn.small, isLive && "border-primary/30 bg-primary/[0.06] text-primary hover:bg-primary/10")}
          title={isLive ? "Mettre en pause le direct" : "Reprendre le direct"}
        >
          <span className={cn("w-2 h-2 rounded-full", isLive ? "bg-primary animate-pulse" : "bg-[#8A938D]")} aria-hidden="true" />
          {isLive ? "En direct" : "En pause"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-[#FAF8F5]">
        {loading ? (
          <LoadingBlock label="Chargement des messages…" />
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <span className="w-12 h-12 rounded-2xl bg-white border border-[#E8E5E0] flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-[#6B746E]" aria-hidden="true" />
            </span>
            <p className="text-[14px] font-semibold text-[#1F2A23]">Aucun message dans cette conversation</p>
            <p className="text-[13px] text-[#5F6B63] mt-1">Les messages apparaîtront ici en temps réel.</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {messages.map((msg) => {
              const isUserA = msg.sender_id === userA?.id;
              const sender = msg.sender?.pseudo || msg.sender?.name || "Inconnu";
              const imageUrl = (msg as { image_url?: string }).image_url;
              return (
                <li key={msg.id} className={cn("flex gap-2 group", isUserA ? "justify-start" : "justify-end")}>
                  {isUserA && <MemberAvatar name={sender} url={msg.sender?.avatar_url} size={28} className="mt-1" />}
                  <div className={cn("max-w-[78%] sm:max-w-[70%] flex flex-col", isUserA ? "items-start" : "items-end")}>
                    <div
                      className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed",
                        msg.is_deleted
                          ? "bg-[#ECE8E1] text-[#5F6B63] italic"
                          : msg.is_flagged
                          ? "bg-[#D64545]/[0.06] border border-[#D64545]/30 text-[#3A443E]"
                          : isUserA
                          ? "bg-white border border-[#E8E5E0] text-[#1F2A23] rounded-bl-md"
                          : "bg-primary text-white rounded-br-md"
                      )}
                    >
                      {msg.is_deleted ? (
                        <span>Message supprimé par un administrateur</span>
                      ) : (
                        <>
                          {imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt="Image partagée" className="max-w-[200px] max-h-[200px] rounded-lg mb-1 object-cover" />
                          )}
                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                          {msg.is_flagged && msg.flag_reason && (
                            <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#B83333]">
                              <Flag className="w-3 h-3" aria-hidden="true" /> {msg.flag_reason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1 text-[12px] text-[#5F6B63]", isUserA ? "justify-start" : "justify-end")}>
                      <span>{new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>· {sender}{msg.sender?.pseudo && msg.sender?.name ? ` (${msg.sender.name})` : ""}</span>
                      {/* Actions de modération : visibles au survol et au clavier, jamais hors de la carte */}
                      {!msg.is_deleted && (
                        <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                          <button
                            type="button"
                            onClick={() => handleFlagMessage(msg.id, !msg.is_flagged)}
                            className={cn("w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                              msg.is_flagged ? "bg-[#D64545]/10 text-[#B83333]" : "text-[#56615A] hover:bg-[#ECE8E1] hover:text-[#1F2A23]")}
                            aria-label={msg.is_flagged ? "Retirer le signalement" : "Signaler le message"}
                            title={msg.is_flagged ? "Retirer le signalement" : "Signaler"}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[#56615A] hover:bg-[#D64545]/10 hover:text-[#B83333] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            aria-label="Supprimer le message"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                      {msg.is_flagged && <Flag className="w-3 h-3 text-[#B83333] group-hover:hidden" aria-label="Signalé" />}
                    </div>
                  </div>
                  {!isUserA && <MemberAvatar name={sender} url={msg.sender?.avatar_url} size={28} className="mt-1" />}
                </li>
              );
            })}
            <div ref={messagesEndRef} />
          </ol>
        )}
      </div>

      {/* Nouveaux messages pendant la pause */}
      {newMessageCount > 0 && !isLive && (
        <button
          type="button"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setNewMessageCount(0);
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(31,51,40,0.16)] hover:bg-primary/90 transition-colors duration-150"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-90" aria-hidden="true" />
          {newMessageCount} nouveau{newMessageCount > 1 ? "x" : ""} message{newMessageCount > 1 ? "s" : ""}
        </button>
      )}

      {/* Pied */}
      <div className="border-t border-[#F1EEE9] px-4 sm:px-5 py-3 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
        <p className="flex items-center gap-1.5 text-[12px] text-[#5F6B63]">
          <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Lecture en temps réel par l&apos;administration
        </p>
        <div className="flex items-center gap-2">
          <Link href={`/admin/users/${userA?.id}`} className={btn.small}>Profil {userA?.pseudo || userA?.name?.split(" ")[0]}</Link>
          <Link href={`/admin/users/${userB?.id}`} className={btn.small}>Profil {userB?.pseudo || userB?.name?.split(" ")[0]}</Link>
        </div>
      </div>
    </motion.section>
  );
}

// ─── Main Chat Monitoring Page ──────────────────────────────────────
export default function ChatMonitoringPage() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user") || null;

  const [tab, setTab] = useState<"conversations" | "alerts">("conversations");
  const [filterUserId, setFilterUserId] = useState<string | null>(initialUserId);
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
  const [viewingConversation, setViewingConversation] = useState<Conversation | null>(null);
  const [modAction, setModAction] = useState({ type: "warning", reason: "", target_user_id: "" });
  const [showModModal, setShowModModal] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const noticeTimer = useRef<NodeJS.Timeout | null>(null);
  const limit = 20;

  const showNotice = useCallback((n: Notice) => {
    setNotice(n);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (n) noticeTimer.current = setTimeout(() => setNotice(null), n.kind === "error" ? 8000 : 4000);
  }, []);

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
      if (filterUserId) params.set("user_id", filterUserId);
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
  }, [tab, statusFilter, severityFilter, page, filterUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const CONV_ACTION_COPY: Record<string, { confirm: string; done: string }> = {
    restricted: {
      confirm: "Restreindre cette conversation ? Elle passera en lecture seule : aucun des deux membres ne pourra plus y écrire.",
      done: "Conversation restreinte : elle est désormais en lecture seule.",
    },
    blocked: {
      confirm: "Bloquer cette conversation ? Elle sera fermée pour les deux membres.",
      done: "Conversation bloquée.",
    },
    active: { confirm: "", done: "Conversation réactivée : les membres peuvent de nouveau écrire." },
  };

  const handleConversationAction = async (convId: string, status: string, restricted_reason?: string) => {
    const copy = CONV_ACTION_COPY[status];
    if (copy?.confirm && !window.confirm(copy.confirm)) return;
    setActionLoading(convId);
    try {
      const res = await fetch("/api/admin/chat-monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "conversation", id: convId, status, restricted_reason }),
      });
      const err = await apiError(res);
      if (err) { showNotice({ kind: "error", text: err }); return; }
      showNotice({ kind: "success", text: copy?.done || "Conversation mise à jour." });
      await fetchData();
      setSelectedConv(null);
    } catch (e) {
      console.error("Failed to update conversation:", e);
      showNotice({ kind: "error", text: "La conversation n'a pas pu être mise à jour." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAlertAction = async (alertId: string, status: string, admin_notes?: string) => {
    setActionLoading(alertId);
    try {
      const res = await fetch("/api/admin/chat-monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "alert", id: alertId, status, admin_notes }),
      });
      const err = await apiError(res);
      if (err) { showNotice({ kind: "error", text: err }); return; }
      await fetchData();
    } catch (e) {
      console.error("Failed to update alert:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleModeration = async () => {
    if (!modAction.reason.trim() || !modAction.target_user_id) return;
    if (modAction.type === "account_suspension" &&
      !window.confirm("Suspendre ce compte ? Le membre ne pourra plus se connecter.")) return;
    setActionLoading("mod");
    try {
      const res = await fetch("/api/admin/chat-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: modAction.type,
          target_user_id: modAction.target_user_id,
          conversation_id: selectedConv?.id,
          reason: modAction.reason,
        }),
      });
      const err = await apiError(res);
      if (err) { showNotice({ kind: "error", text: err }); return; }
      const data = await res.json().catch(() => ({}));
      showNotice({ kind: "success", text: data.message || "Action de modération enregistrée." });
      setShowModModal(false);
      setModAction({ type: "warning", reason: "", target_user_id: "" });
      await fetchData();
    } catch (e) {
      console.error("Failed to create moderation action:", e);
      showNotice({ kind: "error", text: "L'action de modération n'a pas pu être effectuée." });
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const nameOf = (u?: ChatUser | null) => u?.pseudo || u?.name || "?";
  const switchTab = (next: "conversations" | "alerts") => {
    setTab(next); setStatusFilter("all"); setPage(1); setViewingConversation(null);
  };
  const modTargetName = selectedConv
    ? (modAction.target_user_id === selectedConv.user_a_id ? nameOf(selectedConv.user_a) : modAction.target_user_id === selectedConv.user_b_id ? nameOf(selectedConv.user_b) : null)
    : null;

  return (
    <div className="max-w-7xl mx-auto">
      <Toast notice={notice} onClose={() => showNotice(null)} />

      <PageHeader
        title="Surveillance de la discussion"
        subtitle="Surveillez les conversations en temps réel et traitez les alertes de sécurité."
        actions={filterUserId ? (
          <span className="inline-flex items-center gap-2 h-9 pl-3 pr-1 rounded-xl border border-primary/25 bg-primary/[0.06] text-[13px] font-semibold text-primary">
            <UserRound className="w-4 h-4" aria-hidden="true" /> Filtré sur un membre
            <button type="button" onClick={() => { setFilterUserId(null); setPage(1); }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-primary/10 transition-colors duration-150" aria-label="Retirer le filtre membre">
              <X className="w-4 h-4" />
            </button>
          </span>
        ) : undefined}
      />

      {/* Onglets principaux */}
      <FilterTabs
        label="Vue"
        className="mb-5"
        value={tab}
        onChange={switchTab}
        options={[
          { value: "conversations", label: "Conversations", icon: MessageCircle },
          { value: "alerts", label: "Alertes", icon: AlertTriangle, count: alertStats.open },
        ]}
      />

      {/* Statistiques compactes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {tab === "conversations" ? (
          <>
            <StatTile icon={CheckCircle2} label="Conversations actives" value={convStats.active} tone="green" />
            <StatTile icon={Lock} label="Restreintes ou bloquées" value={convStats.restricted} tone="amber" />
          </>
        ) : (
          <>
            <StatTile icon={AlertCircle} label="Alertes ouvertes" value={alertStats.open} tone="amber" />
            <StatTile icon={AlertTriangle} label="Alertes critiques" value={alertStats.critical} tone="red" />
          </>
        )}
      </div>

      {/* Filtres sur une ligne */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <FilterTabs
          label="Filtrer par statut"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={(tab === "conversations" ? CONV_STATUS_OPTIONS : ALERT_STATUS_OPTIONS).map((o) => ({ value: o.value, label: o.label }))}
        />
        {tab === "alerts" && (
          <label className="inline-flex items-center gap-2 text-[13px] text-[#56615A]">
            Sévérité
            <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-xl border border-[#E8E5E0] bg-white px-3 text-[14px] text-[#1F2A23] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60">
              {SEVERITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* Liste */}
        <div className={cn("flex-1 min-w-0", viewingConversation ? "hidden lg:block lg:max-w-md" : "")}>
          {loading ? (
            <Card><LoadingBlock /></Card>
          ) : tab === "conversations" ? (
            conversations.length === 0 ? (
              <EmptyBlock icon={MessageCircle} title="Aucune conversation" description="Aucune conversation ne correspond à ces filtres." />
            ) : (
              <ul className="space-y-3">
                {conversations.map((conv) => {
                  const selected = viewingConversation?.id === conv.id;
                  const status = CONV_STATUS_META[conv.status] || { label: conv.status, tone: "neutral" as Tone };
                  return (
                    <Card as="li" key={conv.id}
                      className={cn("p-4 sm:p-5 transition-colors duration-150", selected ? "border-primary/50 ring-1 ring-primary/20" : "hover:border-[#D9D4CC]")}>
                      <div className="flex items-start gap-3">
                        <div className="flex -space-x-2 shrink-0">
                          <MemberAvatar name={nameOf(conv.user_a)} url={conv.user_a?.avatar_url} size={36} className="ring-2 ring-white" />
                          <MemberAvatar name={nameOf(conv.user_b)} url={conv.user_b?.avatar_url} size={36} className="ring-2 ring-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-1.5 text-[14px] font-semibold text-[#1F2A23]">
                            <Link href={`/admin/users/${conv.user_a_id}`} className="hover:text-primary truncate">{nameOf(conv.user_a)}</Link>
                            <span className="text-[#5F6B63] font-normal">&amp;</span>
                            <Link href={`/admin/users/${conv.user_b_id}`} className="hover:text-primary truncate">{nameOf(conv.user_b)}</Link>
                          </div>
                          <p className="text-[13px] text-[#5F6B63] mt-0.5">
                            {conv.message_count} message{conv.message_count > 1 ? "s" : ""} · Dernier : {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
                          </p>
                        </div>
                        <Badge tone={status.tone} className="shrink-0">{status.label}</Badge>
                      </div>

                      {conv.restricted_reason && (
                        <p className="mt-3 rounded-lg bg-[#F59E0B]/[0.08] px-3 py-2 text-[13px] text-[#3A443E]">
                          <span className="font-semibold">Raison :</span> {conv.restricted_reason}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#F1EEE9]">
                        <button type="button" onClick={() => setViewingConversation(conv)} className={cn(btn.small, "text-primary border-primary/25 hover:bg-primary/[0.06]")}
                          aria-pressed={selected}>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Voir les messages
                        </button>
                        {conv.status === "active" && (
                          <>
                            <button type="button" onClick={() => handleConversationAction(conv.id, "restricted")} disabled={actionLoading === conv.id} className={btn.small}>
                              <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Restreindre
                            </button>
                            <button type="button" onClick={() => handleConversationAction(conv.id, "blocked")} disabled={actionLoading === conv.id}
                              className={cn(btn.small, "text-[#B83333] hover:bg-[#D64545]/[0.06]")}>
                              <Ban className="w-3.5 h-3.5" aria-hidden="true" /> Bloquer
                            </button>
                          </>
                        )}
                        {(conv.status === "restricted" || conv.status === "blocked") && (
                          <button type="button" onClick={() => handleConversationAction(conv.id, "active")} disabled={actionLoading === conv.id} className={btn.small}>
                            <Unlock className="w-3.5 h-3.5" aria-hidden="true" /> Réactiver
                          </button>
                        )}
                        <button type="button" onClick={() => { setSelectedConv(conv); setShowModModal(true); }} className={cn(btn.small, "sm:ml-auto")}>
                          <Shield className="w-3.5 h-3.5" aria-hidden="true" /> Modérer
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </ul>
            )
          ) : alerts.length === 0 ? (
            <EmptyBlock icon={Shield} title="Aucune alerte" description="Aucune alerte ne correspond à ces filtres." />
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert) => {
                const sev = SEVERITY_META[alert.severity] || { label: alert.severity, tone: "neutral" as Tone };
                const st = ALERT_STATUS_META[alert.status] || { label: alert.status, tone: "neutral" as Tone };
                return (
                  <Card as="li" key={alert.id} className="p-4 sm:p-5 transition-colors duration-150 hover:border-[#D9D4CC]">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge tone={sev.tone}>{sev.label}</Badge>
                          <span className="text-[13px] font-medium text-[#3A443E]">{ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</span>
                        </div>
                        <p className="text-[14px] text-[#1F2A23] leading-relaxed">{alert.description}</p>
                        {alert.snippet && (
                          <blockquote className="mt-2 rounded-lg bg-[#FAF8F5] border-l-2 border-[#D9D4CC] px-3 py-2 text-[13px] italic text-[#3A443E]">
                            « {alert.snippet} »
                          </blockquote>
                        )}
                        <p className="text-[13px] text-[#5F6B63] mt-2">
                          Membre signalé :{" "}
                          <Link href={`/admin/users/${alert.reported_user_id}`} className="font-semibold text-primary hover:underline">
                            {alert.reported_user?.pseudo || alert.reported_user?.name || "Inconnu"}
                          </Link>
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#5F6B63]">{new Date(alert.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {alert.status === "open" && (
                            <>
                              <button type="button" onClick={() => handleAlertAction(alert.id, "investigating")} disabled={actionLoading === alert.id} className={btn.small}>
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Investiguer
                              </button>
                              <button type="button" onClick={() => handleAlertAction(alert.id, "dismissed")} disabled={actionLoading === alert.id} className={btn.small}>
                                Rejeter
                              </button>
                            </>
                          )}
                          {(alert.status === "open" || alert.status === "investigating") && (
                            <button type="button" onClick={() => handleAlertAction(alert.id, "resolved")} disabled={actionLoading === alert.id}
                              className={cn(btn.small, "bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary")}>
                              {actionLoading === alert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />} Résoudre
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </ul>
          )}

          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </div>

        {/* Lecture de la conversation en temps réel */}
        <AnimatePresence>
          {viewingConversation && tab === "conversations" && (
            <div className="flex-1 min-w-0">
              <ConversationViewer
                conversationId={viewingConversation.id}
                userA={viewingConversation.user_a}
                userB={viewingConversation.user_b}
                onClose={() => setViewingConversation(null)}
                onNotice={showNotice}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modération */}
      <AdminModal
        open={showModModal && !!selectedConv}
        onClose={() => setShowModModal(false)}
        title="Action de modération"
        description={selectedConv ? `Conversation entre ${nameOf(selectedConv.user_a)} et ${nameOf(selectedConv.user_b)}` : undefined}
        footer={
          <>
            <button type="button" onClick={() => setShowModModal(false)} className={btn.secondary}>Annuler</button>
            <button type="button" onClick={handleModeration}
              disabled={!modAction.reason.trim() || !modAction.target_user_id || !!actionLoading}
              className={modAction.type === "account_suspension" || modAction.type === "block" ? btn.danger : btn.primary}>
              {actionLoading === "mod" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Confirmer
            </button>
          </>
        }
      >
        {selectedConv && (
          <div className="space-y-5">
            <fieldset>
              <legend className="text-[14px] font-semibold text-[#1F2A23] mb-2">Membre concerné</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: selectedConv.user_a_id, user: selectedConv.user_a },
                  { id: selectedConv.user_b_id, user: selectedConv.user_b },
                ].map(({ id, user }) => {
                  const on = modAction.target_user_id === id;
                  return (
                    <button key={id} type="button" aria-pressed={on} onClick={() => setModAction((a) => ({ ...a, target_user_id: id }))}
                      className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        on ? "border-primary/50 bg-primary/[0.06]" : "border-[#E8E5E0] hover:bg-[#F5F3EF]")}>
                      <MemberAvatar name={nameOf(user)} url={user?.avatar_url} size={32} />
                      <span className={cn("text-[14px] truncate", on ? "font-semibold text-primary" : "font-medium text-[#1F2A23]")}>{nameOf(user)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[14px] font-semibold text-[#1F2A23] mb-2">Action</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODERATION_ACTIONS.map((action) => {
                  const on = modAction.type === action.value;
                  return (
                    <button key={action.value} type="button" aria-pressed={on} onClick={() => setModAction((a) => ({ ...a, type: action.value }))}
                      className={cn("rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        on
                          ? action.tone === "red" ? "border-[#D64545]/40 bg-[#D64545]/[0.06] text-[#B83333]"
                            : action.tone === "amber" ? "border-[#F59E0B]/50 bg-[#F59E0B]/[0.08] text-[#8A4F05]"
                            : "border-primary/50 bg-primary/[0.06] text-primary"
                          : "border-[#E8E5E0] text-[#3A443E] hover:bg-[#F5F3EF]")}>
                      {action.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] text-[#5F6B63] mt-2">
                {MODERATION_ACTIONS.find((a) => a.value === modAction.type)?.hint}
                {modTargetName && <> Membre visé : <span className="font-semibold text-[#1F2A23]">{modTargetName}</span>.</>}
              </p>
            </fieldset>

            <div>
              <label htmlFor="mod-reason" className="block text-[14px] font-semibold text-[#1F2A23] mb-1">
                Raison <span className="text-[#B83333]" aria-hidden="true">*</span>
              </label>
              <textarea id="mod-reason" required value={modAction.reason}
                onChange={(e) => setModAction((a) => ({ ...a, reason: e.target.value }))}
                placeholder="Décrivez la raison de cette action…" rows={3} className={textareaClass} />
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
