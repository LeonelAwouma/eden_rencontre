"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Loader2, MessageCircle, X, ArrowLeft, ImagePlus, Smile,
  PenSquare, Check, CheckCheck, AlertCircle, RotateCcw, UserRound, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FluentEmoji, EMOJI_CATEGORIES } from "@/components/fluent-emoji";

// ── Types ─────────────────────────────────────────────────────
interface Member {
  id: string;
  name: string;
  pseudo?: string | null;
  email: string | null;
  avatar_url: string | null;
  status?: string | null;
}

interface InboxThread {
  conversation_id: string;
  user: Member;
  last_message: { content: string; has_image: boolean; created_at: string; from_admin: boolean } | null;
  unread_count: number;
}

interface ThreadMessage {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  from_admin: boolean;
  /** Message local en cours d'envoi, ou dont l'envoi a échoué. */
  state?: "sending" | "failed";
  file?: File | null;
}

interface ActiveChat {
  conversationId: string | null;
  user: Member;
}

// Pas de session Supabase côté admin : on rafraîchit par intervalles.
const THREAD_POLL_MS = 4000;
const INBOX_POLL_MS = 15000;
const MAX_LENGTH = 4000;

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function Avatar({ member, size = 40 }: { member: Member; size?: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (member.avatar_url && !broken) {
    return (
      <img src={member.avatar_url} alt="" style={style} onError={() => setBroken(true)}
        className="rounded-full object-cover shrink-0 border border-[#E5E7EB]" />
    );
  }
  return (
    <div style={style}
      className="rounded-full shrink-0 flex items-center justify-center bg-[#EEF5EC] text-[#486B46] font-bold text-sm border border-[#E5E7EB]">
      {initials(member.name)}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status || status === "approved") return null;
  const label = status === "pending" ? "En attente" : status === "suspended" ? "Suspendu" : status === "rejected" ? "Refusé" : status;
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminMessagesPage() {
  // Liste des conversations
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // Nouveau message : recherche d'un membre
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  // Conversation ouverte
  const [active, setActive] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [memberLastReadAt, setMemberLastReadAt] = useState<string | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  // Zone de saisie
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<ActiveChat | null>(null);
  const messagesRef = useRef<ThreadMessage[]>([]);
  activeRef.current = active;
  messagesRef.current = messages;

  // ── Boîte de réception ──
  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setInboxLoading(true);
    try {
      const res = await fetch("/api/admin/messages/inbox", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setThreads(data.threads || []);
      setInboxError(null);
    } catch {
      if (!silent) setInboxError("Impossible de charger les conversations.");
    } finally {
      if (!silent) setInboxLoading(false);
    }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") loadInbox(true); }, INBOX_POLL_MS);
    return () => clearInterval(id);
  }, [loadInbox]);

  // ── Conversation ──
  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  const openChat = useCallback(async (chat: ActiveChat) => {
    setActive(chat);
    setComposing(false);
    setSearchQuery("");
    setSearchResults([]);
    setMessages([]);
    setMemberLastReadAt(null);
    setSendError(null);
    setText("");
    clearPendingImage();
    setThreadLoading(true);
    setThreads((prev) => prev.map((t) => (t.user.id === chat.user.id ? { ...t, unread_count: 0 } : t)));

    const qs = chat.conversationId ? `conversation_id=${chat.conversationId}` : `user_id=${chat.user.id}`;
    try {
      const res = await fetch(`/api/admin/messages/thread?${qs}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (activeRef.current?.user.id !== chat.user.id) return; // l'admin a changé de conversation entre-temps
      if (res.ok) {
        setMessages(data.messages || []);
        setMemberLastReadAt(data.member_last_read_at || null);
        if (data.conversation_id && !chat.conversationId) setActive({ ...chat, conversationId: data.conversation_id });
        scrollToBottom();
      } else {
        setSendError(data.error || "Impossible de charger la conversation.");
      }
    } catch {
      setSendError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setThreadLoading(false);
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToBottom]);

  // Rafraîchissement de la conversation ouverte : seulement les nouveaux messages.
  useEffect(() => {
    if (!active?.conversationId) return;
    const convId = active.conversationId;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const confirmed = messagesRef.current.filter((m) => !m.state);
      const last = confirmed[confirmed.length - 1]?.created_at;
      try {
        const res = await fetch(`/api/admin/messages/thread?conversation_id=${convId}${last ? `&after=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" });
        if (!res.ok || activeRef.current?.conversationId !== convId) return;
        const data = await res.json();
        setMemberLastReadAt(data.member_last_read_at || null);
        const fresh: ThreadMessage[] = data.messages || [];
        if (fresh.length) {
          const el = scrollRef.current;
          const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const added = fresh.filter((m) => !known.has(m.id));
            return added.length ? [...prev, ...added] : prev;
          });
          if (nearBottom) scrollToBottom(true);
          loadInbox(true);
        }
      } catch { /* réessai au prochain tour */ }
    };
    const id = setInterval(tick, THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [active?.conversationId, loadInbox, scrollToBottom]);

  // ── Recherche d'un membre (nouveau message) ──
  useEffect(() => {
    if (!composing) return;
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=15`);
        const data = await res.json().catch(() => ({}));
        setSearchResults(
          (data.users || []).map((u: Member) => ({ ...u, name: u.name || u.pseudo || "Membre" }))
        );
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, composing]);

  const startWith = (member: Member) => {
    const existing = threads.find((t) => t.user.id === member.id);
    openChat({ conversationId: existing?.conversation_id ?? null, user: existing?.user ?? member });
  };

  // ── Saisie ──
  function clearPendingImage() {
    setPendingImage(null);
    setPendingPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }

  const pickImage = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setSendError("Format non accepté (JPG, PNG, WebP ou GIF)."); return; }
    if (file.size > 8 * 1024 * 1024) { setSendError("Photo trop lourde (8 Mo maximum)."); return; }
    setSendError(null);
    clearPendingImage();
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(autoGrow, [text]);

  useEffect(() => {
    if (!showEmoji) return;
    const close = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showEmoji]);

  const insertEmoji = (char: string) => {
    const el = textareaRef.current;
    if (!el) { setText((t) => t + char); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + char + text.slice(end);
    setText(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + char.length, start + char.length); });
  };

  // ── Envoi ──
  const deliver = async (local: ThreadMessage, chat: ActiveChat) => {
    try {
      let imageUrl: string | null = null;
      if (local.file) {
        const form = new FormData();
        form.append("file", local.file);
        const up = await fetch("/api/admin/messages/upload", { method: "POST", body: form });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "Échec de l'envoi de la photo");
        imageUrl = upData.url;
      }
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: chat.user.id, content: local.content, image_url: imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi du message");

      const saved: ThreadMessage = { ...data.message };
      if (local.image_url?.startsWith("blob:")) URL.revokeObjectURL(local.image_url);
      setMessages((prev) => {
        // Le rafraîchissement a pu ajouter le message entre-temps : pas de doublon.
        const withoutLocal = prev.filter((m) => m.id !== local.id);
        return withoutLocal.some((m) => m.id === saved.id) ? withoutLocal : [...withoutLocal, saved].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
      if (!chat.conversationId && activeRef.current?.user.id === chat.user.id) {
        setActive({ ...chat, conversationId: data.message.conversation_id });
      }
      loadInbox(true);
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === local.id ? { ...m, state: "failed" } : m)));
      setSendError(err instanceof Error ? err.message : "Échec de l'envoi");
    }
  };

  const send = () => {
    if (!active) return;
    const content = text.trim();
    if (!content && !pendingImage) return;
    if (content.length > MAX_LENGTH) { setSendError(`Message trop long (${MAX_LENGTH} caractères maximum).`); return; }
    const local: ThreadMessage = {
      id: `local-${Date.now()}`,
      content,
      image_url: pendingPreview,
      created_at: new Date().toISOString(),
      from_admin: true,
      state: "sending",
      file: pendingImage,
    };
    setMessages((prev) => [...prev, local]);
    setText("");
    setPendingImage(null);
    setPendingPreview(null); // l'URL locale sert encore d'aperçu dans la bulle
    setShowEmoji(false);
    setSendError(null);
    scrollToBottom(true);
    deliver(local, active);
  };

  const retry = (m: ThreadMessage) => {
    if (!active) return;
    setSendError(null);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, state: "sending" } : x)));
    deliver({ ...m, state: "sending" }, active);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  // ── Dérivés ──
  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);
  const visibleThreads = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) =>
      [t.user.name, t.user.pseudo, t.user.email].some((v) => v?.toLowerCase().includes(q))
    );
  }, [threads, filter]);

  // Dernier message de l'admin lu par le membre → « Vu » sous ce message.
  const lastSeenId = useMemo(() => {
    if (!memberLastReadAt) return null;
    const readAt = new Date(memberLastReadAt).getTime();
    const seen = messages.filter((m) => m.from_admin && !m.state && new Date(m.created_at).getTime() <= readAt);
    return seen[seen.length - 1]?.id ?? null;
  }, [messages, memberLastReadAt]);

  const canSend = !!active && (!!text.trim() || !!pendingImage);

  // ── Rendu ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] min-h-[520px]">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Messagerie
        </h1>
        {totalUnread > 0 && (
          <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#486B46] text-white text-[11px] font-bold flex items-center justify-center">
            {totalUnread}
          </span>
        )}
        <p className="hidden sm:block text-[13px] text-[#9CA3AF] font-medium">
          Vous écrivez au nom du compte <span className="font-semibold text-[#486B46]">« Admin »</span>
        </p>
      </div>

      <div className="flex-1 min-h-0 flex bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* ═══ Colonne des conversations ═══ */}
        <aside className={cn("w-full md:w-[340px] shrink-0 flex-col border-r border-[#E5E7EB]", active ? "hidden md:flex" : "flex")}>
          {composing ? (
            <>
              <div className="p-3 flex items-center gap-2 border-b border-[#E5E7EB]">
                <button onClick={() => { setComposing(false); setSearchQuery(""); }} aria-label="Retour aux conversations"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nom, pseudo ou e-mail du membre"
                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#F9FAFB] text-[13px] text-[#374151] outline-none focus:ring-2 focus:ring-[#486B46]/15" />
                  {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] animate-spin" />}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {searchQuery.trim().length < 2 ? (
                  <p className="p-5 text-[13px] text-[#9CA3AF]">Tapez au moins 2 caractères pour trouver un membre approuvé.</p>
                ) : !searching && searchResults.length === 0 ? (
                  <p className="p-5 text-[13px] text-[#9CA3AF]">Aucun membre trouvé.</p>
                ) : (
                  searchResults.map((u) => (
                    <button key={u.id} onClick={() => startWith(u)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors">
                      <Avatar member={u} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">
                          {u.name}{u.pseudo && u.pseudo !== u.name && <span className="font-normal text-[#9CA3AF]"> · {u.pseudo}</span>}
                        </p>
                        <p className="text-[12px] text-[#9CA3AF] truncate">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-3 space-y-2 border-b border-[#E5E7EB]">
                <button onClick={() => setComposing(true)}
                  className="w-full h-10 rounded-xl bg-[#486B46] hover:bg-[#3A5A3A] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors">
                  <PenSquare className="w-4 h-4" /> Nouveau message
                </button>
                {threads.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                    <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrer les conversations"
                      className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F9FAFB] text-[13px] text-[#374151] outline-none focus:ring-2 focus:ring-[#486B46]/15" />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {inboxLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#486B46]" /></div>
                ) : inboxError ? (
                  <div className="p-5 text-center">
                    <p className="text-[13px] text-red-600 mb-2">{inboxError}</p>
                    <button onClick={() => loadInbox()} className="text-[13px] font-semibold text-[#486B46] hover:underline">Réessayer</button>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-col items-center text-center px-6 py-12">
                    <div className="w-12 h-12 rounded-2xl bg-[#EEF5EC] flex items-center justify-center mb-3">
                      <MessageCircle className="w-6 h-6 text-[#486B46]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#374151]">Aucune conversation pour l'instant</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1">Les messages des membres arriveront ici. Vous pouvez aussi écrire le premier.</p>
                  </div>
                ) : visibleThreads.length === 0 ? (
                  <p className="p-5 text-[13px] text-[#9CA3AF]">Aucune conversation ne correspond.</p>
                ) : (
                  visibleThreads.map((t) => {
                    const isActive = active?.user.id === t.user.id;
                    const preview = t.last_message
                      ? `${t.last_message.from_admin ? "Vous : " : ""}${t.last_message.content || (t.last_message.has_image ? "📷 Photo" : "")}`
                      : "Nouvelle conversation";
                    return (
                      <button key={t.conversation_id} onClick={() => openChat({ conversationId: t.conversation_id, user: t.user })}
                        className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2",
                          isActive ? "bg-[#486B46]/[0.06] border-[#486B46]" : "border-transparent hover:bg-[#F9FAFB]")}>
                        <Avatar member={t.user} size={44} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-[13px] truncate", t.unread_count ? "font-bold text-[#1a1a1a]" : "font-semibold text-[#374151]")}>
                              {t.user.name}
                            </p>
                            {t.last_message && <span className={cn("text-[11px] shrink-0", t.unread_count ? "text-[#486B46] font-semibold" : "text-[#9CA3AF]")}>{shortTime(t.last_message.created_at)}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={cn("text-[12px] truncate", t.unread_count ? "text-[#374151] font-medium" : "text-[#9CA3AF]")}>{preview}</p>
                            {t.unread_count > 0 && (
                              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#486B46] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {t.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>

        {/* ═══ Conversation ═══ */}
        <section className={cn("flex-1 min-w-0 flex-col", active ? "flex" : "hidden md:flex")}>
          {active ? (
            <>
              {/* En-tête */}
              <header className="h-16 px-3 sm:px-4 flex items-center gap-3 border-b border-[#E5E7EB] shrink-0">
                <button onClick={() => setActive(null)} aria-label="Retour aux conversations"
                  className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6]">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar member={active.user} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-[#1a1a1a] truncate">{active.user.name}</p>
                    <StatusBadge status={active.user.status} />
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] truncate">
                    {active.user.pseudo && active.user.pseudo !== active.user.name ? `${active.user.pseudo} · ` : ""}{active.user.email}
                  </p>
                </div>
                <Link href={`/admin/users/${active.user.id}`}
                  className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[#E5E7EB] text-[12px] font-semibold text-[#374151] hover:border-[#486B46]/40 hover:text-[#486B46] transition-colors">
                  <UserRound className="w-4 h-4" /> Fiche membre
                </Link>
              </header>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 bg-[#FAF9F6]">
                {threadLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#486B46]" /></div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <Avatar member={active.user} size={56} />
                    <p className="text-[14px] font-semibold text-[#374151] mt-3">Démarrez la conversation avec {active.user.name}</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1 max-w-xs">Le message apparaîtra dans sa messagerie, de la part de « Admin ». Le membre pourra vous répondre.</p>
                    {active.user.status && active.user.status !== "approved" && (
                      <p className="text-[12px] text-amber-700 mt-3 max-w-xs">Ce compte n'est pas approuvé : le membre ne pourra lire ce message qu'une fois son compte validé.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {messages.map((m, i) => {
                      const prev = messages[i - 1];
                      const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                      const grouped = !!prev && !newDay && prev.from_admin === m.from_admin
                        && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000;
                      return (
                        <Fragment key={m.id}>
                          {newDay && (
                            <div className="flex justify-center py-3">
                              <span className="text-[11px] font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] rounded-full px-3 py-1 first-letter:uppercase">
                                {dayLabel(m.created_at)}
                              </span>
                            </div>
                          )}
                          <div className={cn("flex", m.from_admin ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}>
                            <div className={cn("max-w-[78%] sm:max-w-[65%] flex flex-col", m.from_admin ? "items-end" : "items-start")}>
                              <div className={cn("rounded-2xl text-[14px] leading-relaxed overflow-hidden shadow-sm",
                                m.image_url ? "p-1.5" : "px-4 py-2.5",
                                m.from_admin ? "bg-[#486B46] text-white rounded-br-md" : "bg-white text-[#1a1a1a] border border-[#E5E7EB] rounded-bl-md",
                                m.state === "sending" && "opacity-70",
                                m.state === "failed" && "ring-2 ring-red-300")}>
                                {m.image_url && (
                                  <a href={m.state ? undefined : m.image_url} target="_blank" rel="noopener noreferrer">
                                    <img src={m.image_url} alt="Photo" className="rounded-xl max-h-64 w-auto object-cover" />
                                  </a>
                                )}
                                {m.content && <p className={cn("whitespace-pre-wrap break-words", m.image_url && "px-2.5 pt-1.5 pb-1")}>{m.content}</p>}
                              </div>
                              <div className={cn("flex items-center gap-1 mt-0.5 px-1 text-[10px]", m.state === "failed" ? "text-red-600" : "text-[#9CA3AF]")}>
                                {m.state === "failed" ? (
                                  <button onClick={() => retry(m)} className="flex items-center gap-1 font-semibold hover:underline">
                                    <AlertCircle className="w-3 h-3" /> Non envoyé · <RotateCcw className="w-3 h-3" /> Réessayer
                                  </button>
                                ) : (
                                  <>
                                    <span>{new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                    {m.from_admin && (m.state === "sending"
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : m.id === lastSeenId
                                        ? <span className="flex items-center gap-0.5 text-[#486B46] font-semibold"><CheckCheck className="w-3.5 h-3.5" /> Vu</span>
                                        : <Check className="w-3 h-3" />)}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Saisie */}
              <div className="relative border-t border-[#E5E7EB] bg-white shrink-0">
                <AnimatePresence>
                  {showEmoji && (
                    <motion.div ref={emojiRef}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-3 mb-2 w-[300px] sm:w-[340px] max-h-[320px] overflow-y-auto rounded-2xl z-20 bg-white border border-[#E5E7EB] shadow-[0_8px_32px_rgba(72,107,70,0.12)]">
                      {EMOJI_CATEGORIES.map((group) => (
                        <div key={group.category} className="px-3 pt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-[#9CA3AF]">{group.category}</p>
                          <div className="grid grid-cols-7 gap-0.5 pb-1">
                            {group.emojis.map((e) => (
                              <button key={e.char} type="button" onClick={() => insertEmoji(e.char)}
                                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#F0FDF4]">
                                <FluentEmoji char={e.char} url={e.url} className="w-6 h-6" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {sendError && (
                  <div role="alert" className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{sendError}</span>
                    <button onClick={() => setSendError(null)} aria-label="Fermer"><X className="w-4 h-4" /></button>
                  </div>
                )}

                {pendingPreview && (
                  <div className="px-3 pt-3 flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img src={pendingPreview} alt="Aperçu" className="h-16 w-16 rounded-xl object-cover border border-[#E5E7EB]" />
                      <button type="button" onClick={clearPendingImage} aria-label="Retirer la photo"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-white border border-[#E5E7EB] text-[#6B7280]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[12px] text-[#9CA3AF] flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Ajoutez une légende si vous le souhaitez</p>
                  </div>
                )}

                <div className="p-3 flex items-end gap-1.5">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
                    onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Joindre une photo"
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors">
                    <ImagePlus className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => setShowEmoji((v) => !v)} aria-label="Emojis"
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      showEmoji ? "text-[#486B46] bg-[#EEF5EC]" : "text-[#6B7280] hover:bg-[#F3F4F6]")}>
                    <Smile className="w-5 h-5" />
                  </button>
                  <textarea ref={textareaRef} rows={1} value={text} maxLength={MAX_LENGTH}
                    onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
                    onPaste={(e) => { const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/")); if (f) { e.preventDefault(); pickImage(f); } }}
                    placeholder={pendingImage ? "Ajouter une légende…" : `Écrire à ${active.user.name}…`}
                    className="flex-1 min-h-[40px] max-h-40 resize-none rounded-2xl bg-[#F9FAFB] px-4 py-2.5 text-[14px] text-[#1a1a1a] leading-5 outline-none focus:ring-2 focus:ring-[#486B46]/15" />
                  <button type="button" onClick={send} disabled={!canSend} aria-label="Envoyer"
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
                      canSend ? "bg-[#486B46] hover:bg-[#3A5A3A] text-white shadow-sm" : "bg-[#E5E7EB] text-white cursor-not-allowed")}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="hidden sm:block px-4 pb-2 -mt-1 text-[10px] text-[#9CA3AF]">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#FAF9F6]">
              <div className="w-16 h-16 rounded-3xl bg-[#EEF5EC] flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-[#486B46]" />
              </div>
              <h3 className="text-[18px] font-bold text-[#1a1a1a] mb-1">Vos conversations</h3>
              <p className="text-[13px] text-[#9CA3AF] max-w-xs">Choisissez une conversation à gauche, ou écrivez à n'importe quel membre avec « Nouveau message ».</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
