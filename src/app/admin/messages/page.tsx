"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Loader2, CheckCircle2, XCircle, MessageCircle,
  Clock, X, Inbox, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface SentMessage {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  target_user: { id: string; name: string; email: string };
}

interface InboxThread {
  conversation_id: string;
  user: { id: string; name: string; email: string; avatar_url: string | null };
  last_message: { content: string; created_at: string; from_admin: boolean } | null;
  unread_count: number;
}

interface ThreadMessage {
  id: string;
  content: string;
  created_at: string;
  from_admin: boolean;
}

export default function AdminMessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState<SentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Inbox: real messages received from users (was entirely missing before) ──
  const [inboxThreads, setInboxThreads] = useState<InboxThread[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const res = await fetch("/api/admin/messages/inbox");
      if (res.ok) {
        const data = await res.json();
        setInboxThreads(data.threads || []);
      }
    } catch { /* ignore */ }
    finally { setInboxLoading(false); }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const openThread = async (thread: InboxThread) => {
    setActiveConversationId(thread.conversation_id);
    setSelectedUser(thread.user);
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
    setSuccess(null);
    setThreadLoading(true);
    setThreadMessages([]);
    // Optimistically clear the unread badge for this thread.
    setInboxThreads((prev) => prev.map((t) => (t.conversation_id === thread.conversation_id ? { ...t, unread_count: 0 } : t)));
    try {
      const res = await fetch(`/api/admin/messages/thread?conversation_id=${thread.conversation_id}`);
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.messages || []);
      }
    } catch { /* ignore */ }
    finally {
      setThreadLoading(false);
      textareaRef.current?.focus();
    }
  };

  const startNewCompose = () => {
    setActiveConversationId(null);
    setThreadMessages([]);
    setSelectedUser(null);
    setSearchQuery("");
    setError(null);
    setSuccess(null);
  };

  // Debounced user search
  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(searchQuery), 350);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, handleSearch]);

  const handleSend = async () => {
    if (!selectedUser || !messageContent.trim()) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: selectedUser.id, content: messageContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec de l'envoi du message");
        return;
      }
      if (activeConversationId) {
        // Replying inside an open thread: append to the transcript in place.
        setThreadMessages((prev) => [...prev, { id: data.message.id, content: data.message.content, created_at: data.message.created_at, from_admin: true }]);
        setInboxThreads((prev) => prev.map((t) => t.conversation_id === activeConversationId
          ? { ...t, last_message: { content: data.message.content, created_at: data.message.created_at, from_admin: true } }
          : t));
      } else {
        setSentHistory((prev) => [{ ...data.message, target_user: data.target_user }, ...prev]);
        setSuccess(`Message envoyé à ${selectedUser.name} avec succès !`);
        setSelectedUser(null);
        setSearchQuery("");
        loadInbox();
      }
      setMessageContent("");
    } catch {
      setError("Une erreur réseau est survenue");
    } finally {
      setSending(false);
    }
  };

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const totalUnread = inboxThreads.reduce((s, t) => s + t.unread_count, 0);

  function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "à l'instant";
    if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)}j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#486B46]/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-[#486B46]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Messagerie
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] ml-[52px]">
            Messages reçus des utilisateurs, et envoi en tant que <span className="font-semibold text-[#486B46]">&ldquo;Admin&rdquo;</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* ── Inbox ── */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col max-h-[70vh]">
            <div className="px-4 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-[#486B46]" />
                <h2 className="text-sm font-bold text-[#1a1a1a]">Boîte de réception</h2>
              </div>
              {totalUnread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#486B46] text-white text-[11px] font-bold flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {inboxLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#486B46]" />
                </div>
              ) : inboxThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <Inbox className="w-8 h-8 text-[#D1D5DB] mb-2" />
                  <p className="text-sm text-[#9CA3AF]">Aucun message reçu</p>
                  <p className="text-xs text-[#D1D5DB] mt-1">Les messages des utilisateurs apparaîtront ici</p>
                </div>
              ) : (
                inboxThreads.map((thread) => (
                  <button key={thread.conversation_id} onClick={() => openThread(thread)}
                    className={cn("w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]",
                      activeConversationId === thread.conversation_id && "bg-[#486B46]/5")}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#86EFAC] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {thread.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm truncate", thread.unread_count > 0 ? "font-bold text-[#1a1a1a]" : "font-medium text-[#374151]")}>
                          {thread.user.name}
                        </p>
                        {thread.last_message && (
                          <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">{timeAgo(thread.last_message.created_at)}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] truncate">
                        {thread.last_message ? `${thread.last_message.from_admin ? "Vous: " : ""}${thread.last_message.content}` : "—"}
                      </p>
                    </div>
                    {thread.unread_count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#486B46] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {thread.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-[#E5E7EB]">
              <button onClick={startNewCompose}
                className={cn("w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  !activeConversationId && !selectedUser ? "bg-[#486B46] text-white" : "bg-[#F9FAFB] text-[#486B46] border border-[#E5E7EB] hover:border-[#486B46]/30")}>
                <Send className="w-3.5 h-3.5" /> Nouveau message
              </button>
            </div>
          </div>

          {/* ── Compose / Thread ── */}
          <div>
            {/* Feedback messages */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F56565]/10 border border-[#F56565]/20 text-[#F56565] text-sm">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="hover:opacity-70"><X className="w-4 h-4" /></button>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#38C172]/10 border border-[#38C172]/20 text-[#38C172] text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compose Card */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Recipient */}
                <div>
                  <label className="text-sm font-medium text-[#374151] mb-2 block">Destinataire</label>
                  {selectedUser ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#486B46]/5 border border-[#486B46]/20">
                      {activeConversationId && (
                        <button onClick={startNewCompose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#486B46] hover:bg-[#486B46]/10 transition-all flex-shrink-0">
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      )}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#486B46] to-[#6E8B63] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {selectedUser.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1a1a1a] truncate">{selectedUser.name}</p>
                        <p className="text-xs text-[#9CA3AF] truncate">{selectedUser.email}</p>
                      </div>
                      {!activeConversationId && (
                        <button onClick={() => { setSelectedUser(null); setSearchQuery(""); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F56565] hover:bg-[#F56565]/10 transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un utilisateur par nom ou email…"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#374151] outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/10 transition-all" />
                      {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] animate-spin" />}
                      {searchResults.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((user) => (
                            <button key={user.id}
                              onClick={() => { setSelectedUser(user); setSearchResults([]); setSearchQuery(""); textareaRef.current?.focus(); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-all text-left border-b border-[#E5E7EB] last:border-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F7DF3] to-[#86EFAC] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {user.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1a1a1a] truncate">{user.name}</p>
                                <p className="text-xs text-[#9CA3AF] truncate">{user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-4 text-center">
                          <p className="text-sm text-[#9CA3AF]">Aucun utilisateur trouvé</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Thread transcript (only when replying inside an existing conversation) */}
                {activeConversationId && (
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 max-h-[320px] overflow-y-auto space-y-2">
                    {threadLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin text-[#486B46]" />
                      </div>
                    ) : threadMessages.length === 0 ? (
                      <p className="text-xs text-[#9CA3AF] text-center py-4">Aucun message</p>
                    ) : (
                      threadMessages.map((m) => (
                        <div key={m.id} className={cn("flex", m.from_admin ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                            m.from_admin ? "bg-[#486B46] text-white rounded-br-sm" : "bg-white border border-[#E5E7EB] text-[#374151] rounded-bl-sm")}>
                            <p className="leading-relaxed">{m.content}</p>
                            <p className={cn("text-[10px] mt-1", m.from_admin ? "text-white/70" : "text-[#9CA3AF]")}>
                              {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Message content */}
                <div>
                  <label className="text-sm font-medium text-[#374151] mb-2 block">Message</label>
                  <textarea ref={textareaRef} value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Rédigez votre message…" rows={activeConversationId ? 3 : 5}
                    className="w-full p-4 rounded-xl border border-[#E5E7EB] text-sm text-[#374151] outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/10 resize-none transition-all" />
                  <p className="text-xs text-[#9CA3AF] mt-1.5 text-right">{messageContent.length} caractères</p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Le message sera envoyé en tant que <strong className="text-[#486B46]">&ldquo;Admin&rdquo;</strong></span>
                </div>
                <button onClick={handleSend} disabled={!selectedUser || !messageContent.trim() || sending}
                  className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all",
                    selectedUser && messageContent.trim() && !sending ? "bg-[#486B46] hover:bg-[#3A5A3A] shadow-sm" : "bg-[#9CA3AF] cursor-not-allowed")}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Envoi…" : activeConversationId ? "Répondre" : "Envoyer le message"}
                </button>
              </div>
            </div>

            {/* Sent History (only shown outside an active thread, to avoid duplicating the transcript) */}
            {!activeConversationId && sentHistory.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Messages envoyés
                </h2>
                <div className="space-y-3">
                  {sentHistory.map((msg, i) => (
                    <motion.div key={`${msg.id}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#38C172]" />
                          <span className="text-sm font-semibold text-[#1a1a1a]">À {msg.target_user?.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                        </div>
                      </div>
                      <p className="text-sm text-[#374151] leading-relaxed">{msg.content}</p>
                      <p className="text-xs text-[#9CA3AF] mt-2">
                        Envoyé en tant que <span className="font-medium text-[#486B46]">{msg.sender_name}</span>
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
