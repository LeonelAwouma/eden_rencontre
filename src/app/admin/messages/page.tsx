"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Loader2, CheckCircle2, XCircle, MessageCircle,
  Clock, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

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
      setSentHistory((prev) => [{ ...data.message, target_user: data.target_user }, ...prev]);
      setSuccess(`Message envoyé à ${selectedUser.name} avec succès !`);
      setMessageContent("");
      setSelectedUser(null);
      setSearchQuery("");
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

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#486B46]/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-[#486B46]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Envoyer un message
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] ml-[52px]">
            Envoyez un message en tant que <span className="font-semibold text-[#486B46]">&ldquo;Admin&rdquo;</span> à n&apos;importe quel utilisateur de la plateforme.
          </p>
        </div>

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
            {/* User search / selection */}
            <div>
              <label className="text-sm font-medium text-[#374151] mb-2 block">Destinataire</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#486B46]/5 border border-[#486B46]/20">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#486B46] to-[#6E8B63] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a1a] truncate">{selectedUser.name}</p>
                    <p className="text-xs text-[#9CA3AF] truncate">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setSearchQuery(""); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F56565] hover:bg-[#F56565]/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
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

            {/* Message content */}
            <div>
              <label className="text-sm font-medium text-[#374151] mb-2 block">Message</label>
              <textarea ref={textareaRef} value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Rédigez votre message…" rows={5}
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
              {sending ? "Envoi…" : "Envoyer le message"}
            </button>
          </div>
        </div>

        {/* Sent History */}
        {sentHistory.length > 0 && (
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
  );
}


