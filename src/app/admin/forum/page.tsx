"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MessagesSquare, Users, Flag, VolumeX, Volume2, Pin, PinOff, Trash2, Reply, MoreVertical, Send, Smile,
  Sticker as StickerIcon, X, Loader2, Lock, Search, CheckCircle2, UserRound, Save, ShieldCheck, Settings2, Pencil, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import { FluentEmoji, EMOJI_CATEGORIES } from "@/components/fluent-emoji";
import { ForumBubble, StickerPicker, QuoteBlock, DaySeparator } from "@/components/forum/forum-ui";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FORUM_LIMITS, dayKey, dayLabel, timeLabel, messagePreview, isEditable, type ForumSettings } from "@/lib/forum-shared";
import { ADMIN_FORMATION_PATH } from "@/lib/formation/paths";
import {
  adminAuthorName, formatDateTime, stickerLabelFr, type AdminForumMessage,
} from "@/components/admin/forum/forum-admin-shared";

interface Report {
  id: string; message_id: string; reason: string | null; created_at: string;
  reporter: { id: string; pseudo: string | null; name: string | null } | null;
}
interface Mute {
  user_id: string; until: string | null; reason: string | null; created_at: string;
  profile: { id: string; pseudo: string | null; name: string | null; email: string | null } | null;
}
interface Stats { messages: number; week: number; participants: number; members: number; reported: number; muted: number }

const MUTE_OPTIONS = [
  { value: "24h", label: "24 heures" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "forever", label: "Jusqu'à nouvel ordre" },
];

const POLL_MS = 8000;

export default function AdminForumPage() {
  const [settings, setSettings] = useState<ForumSettings | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [messages, setMessages] = useState<AdminForumMessage[]>([]);
  const [pinned, setPinned] = useState<AdminForumMessage | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [mutes, setMutes] = useState<Mute[]>([]);
  const [stats, setStats] = useState<Stats>({ messages: 0, week: 0, participants: 0, members: 0, reported: 0, muted: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [view, setView] = useState<"all" | "reported">("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<AdminForumMessage | null>(null);
  const [editing, setEditing] = useState<AdminForumMessage | null>(null);
  const [panel, setPanel] = useState<"none" | "emoji" | "sticker">("none");
  const [toDelete, setToDelete] = useState<AdminForumMessage | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const filtered = view === "reported" || !!debounced;

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const flash = (text: string) => { setNotice(text); setTimeout(() => setNotice(null), 3500); };

  const query = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(extra);
    if (view === "reported") p.set("reported", "1");
    if (debounced) p.set("search", debounced);
    return `/api/admin/forum?${p}`;
  }, [view, debounced]);

  const applyMeta = (data: { settings: ForumSettings; pinned: AdminForumMessage | null; reports: Report[]; mutes: Mute[]; stats: Stats }) => {
    setSettings(data.settings);
    setPinned(data.pinned);
    setReports(data.reports || []);
    setMutes(data.mutes || []);
    setStats(data.stats);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(query());
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Impossible de charger le forum."); return; }
      setError(null);
      applyMeta(data);
      setForm({ name: data.settings.name, description: data.settings.description });
      atBottom.current = true;
      setMessages(data.messages || []);
      setHasMore(!!data.hasMore);
    } catch {
      setError("Impossible de charger le forum.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Rafraîchissement automatique : nouveaux messages, signalements, statistiques.
  const lastAt = messages[messages.length - 1]?.created_at;
  useEffect(() => {
    if (filtered) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(query(lastAt ? { after: lastAt } : {}));
        if (!res.ok) return;
        const data = await res.json();
        applyMeta(data);
        const fresh: AdminForumMessage[] = data.messages || [];
        if (fresh.length) setMessages((prev) => [...prev, ...fresh.filter((m) => !prev.some((x) => x.id === m.id))]);
      } catch { /* hors ligne : on réessaiera */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [filtered, query, lastAt]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (keepOffset.current !== null) { el.scrollTop = el.scrollHeight - keepOffset.current; keepOffset.current = null; }
    else if (atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(query({ before: messages[0].created_at }));
      const data = await res.json();
      if (!res.ok) return;
      const el = scrollRef.current;
      if (el) keepOffset.current = el.scrollHeight - el.scrollTop;
      setMessages((prev) => [...(data.messages || []), ...prev]);
      setHasMore(!!data.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  };

  const jumpTo = (id: string) => {
    const node = document.getElementById(`msg-${id}`);
    if (!node) { flash("Ce message n'est pas dans la partie chargée du fil."); return; }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(id);
    setTimeout(() => setHighlight(null), 1600);
  };

  /* ── Appels API ── */
  const call = async (key: string, url: string, init: RequestInit, done?: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "L'action a échoué."); return null; }
      setError(null);
      if (done) flash(done);
      return data;
    } catch {
      setError("L'action a échoué.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async (patch: Partial<ForumSettings>, done: string) => {
    if (await call("settings", "/api/admin/forum", { method: "PATCH", body: JSON.stringify(patch) }, done)) {
      setSettings((s) => (s ? { ...s, ...patch } : s));
      if ("pinned_message_id" in patch) load();
    }
  };

  const startEdit = (m: AdminForumMessage) => { setReplyTo(null); setPanel("none"); setEditing(m); setDraft(m.body); };
  const cancelEdit = () => { setEditing(null); setDraft(""); };

  const saveEdit = async () => {
    if (!editing || !draft.trim()) return;
    const target = editing;
    const ok = await call("send", `/api/admin/forum/messages/${target.id}`, { method: "PATCH", body: JSON.stringify({ body: draft }) }, "Message modifié.");
    if (!ok) return;
    const text = draft.trim();
    setMessages((prev) => prev.map((x) => (x.id === target.id ? { ...x, body: text, edited_at: new Date().toISOString() } : x)));
    cancelEdit();
  };

  const send = async (sticker?: string) => {
    if (editing && !sticker) { await saveEdit(); return; }
    if (!sticker && !draft.trim()) return;
    const ok = await call("send", "/api/admin/forum", {
      method: "POST", body: JSON.stringify({ body: sticker ? "" : draft, sticker: sticker || null, reply_to_id: replyTo?.id ?? null }),
    });
    if (!ok) return;
    if (!sticker) setDraft("");
    setReplyTo(null);
    setPanel("none");
    if (filtered) { setView("all"); setSearch(""); } else load();
  };

  const doDelete = async () => {
    const m = toDelete;
    setToDelete(null);
    if (!m) return;
    if (editing?.id === m.id) cancelEdit();
    if (await call(m.id, `/api/admin/forum/messages/${m.id}`, { method: "DELETE" }, "Message supprimé pour tout le groupe.")) {
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      setReports((prev) => prev.filter((r) => r.message_id !== m.id));
      if (pinned?.id === m.id) setPinned(null);
    }
  };

  const keep = async (m: { id: string }) => {
    if (await call(m.id, `/api/admin/forum/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ resolve_reports: true }) }, "Signalement traité, message conservé.")) {
      setReports((prev) => prev.filter((r) => r.message_id !== m.id));
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, open_reports: 0 } : x)));
    }
  };

  const muteUser = async (userId: string, duration: string, who: string) => {
    if (await call(`mute-${userId}`, "/api/admin/forum/mutes", { method: "POST", body: JSON.stringify({ user_id: userId, duration }) },
      `${who} est en sourdine : il ou elle lit le groupe mais ne peut plus écrire.`)) load();
  };

  const unmute = async (userId: string) => {
    if (await call(`mute-${userId}`, `/api/admin/forum/mutes?user_id=${userId}`, { method: "DELETE" }, "Le membre peut de nouveau écrire.")) {
      setMutes((prev) => prev.filter((m) => m.user_id !== userId));
      setStats((s) => ({ ...s, muted: Math.max(0, s.muted - 1) }));
    }
  };

  const mutedIds = useMemo(() => new Set(mutes.map((m) => m.user_id)), [mutes]);

  const rows = useMemo(() => messages.map((m, i) => {
    const prev = messages[i - 1];
    const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
    const same = !!prev && !newDay && prev.author_id === m.author_id &&
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
    return { m, newDay, showAuthor: !same || filtered };
  }), [messages, filtered]);

  const settingsDirty = !!settings && (form.name.trim() !== settings.name || form.description.trim() !== settings.description);

  return (
    <div className="max-w-[1400px]">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">Forum</h1>
          <p className="text-sm text-[#56615A] mt-1 max-w-2xl">
            Le groupe de discussion de tous les membres, autour des leçons de l&apos;
            <Link href={ADMIN_FORMATION_PATH} className="font-semibold text-primary hover:underline">Académie du mariage</Link>.
            Les membres participent ; vous gérez le groupe d&apos;ici.
          </p>
        </div>
      </div>

      {/* Statistiques compactes, monochromes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Messages" value={stats.messages} icon={MessagesSquare} hint={`${stats.week} cette semaine`} />
        <StatTile label="Participants actifs" value={stats.participants} icon={Users} hint={`sur ${stats.members} membres · 30 jours`} />
        <StatTile label="Signalés à traiter" value={stats.reported} icon={Flag} highlight={stats.reported > 0}
          active={view === "reported"} onClick={() => setView(view === "reported" ? "all" : "reported")} />
        <StatTile label="En sourdine" value={stats.muted} icon={VolumeX} hint="ne peuvent plus écrire" />
      </div>

      {notice && (
        <div role="status" className="fixed bottom-6 right-6 z-[60] max-w-sm flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-primary/30 shadow-lg text-[13px] font-medium text-[#3A5A38]">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[13px] font-medium text-[#B42318]">
          {error}
          <button onClick={() => setError(null)} aria-label="Fermer" className="p-1 rounded-md hover:bg-[#B42318]/10"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        {/* ───── Le groupe ───── */}
        <section className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col h-[calc(100vh-260px)] min-h-[560px]">
          <div className="shrink-0 px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Monogram className="w-6 h-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-foreground truncate">{settings?.name || "Forum"}</p>
              <p className="text-[12px] text-[#6B746E] flex items-center gap-1.5">
                {settings?.admins_only ? <><Lock className="w-3 h-3" /> Seule l&apos;équipe peut écrire</> : `${stats.members} membres`}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B746E]" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un message…"
                  aria-label="Rechercher un message"
                  className="w-full h-9 pl-8 pr-3 bg-white border border-border rounded-xl text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <select value={view} onChange={(e) => setView(e.target.value as "all" | "reported")} aria-label="Affichage"
                className="h-9 pl-2.5 pr-7 bg-white border border-border rounded-xl text-[13px] font-medium outline-none focus:border-primary">
                <option value="all">Tout le fil</option>
                <option value="reported">Signalés ({stats.reported})</option>
              </select>
            </div>
          </div>

          {pinned && (
            <button onClick={() => jumpTo(pinned.id)} className="shrink-0 w-full flex items-center gap-3 px-4 py-2 border-b border-border bg-[#FAF9F6] text-left hover:bg-[#F4F3EF]">
              <Pin className="w-4 h-4 text-primary shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-bold text-primary">Message épinglé</span>
                <span className="block text-[13px] text-[#3F4A43] truncate">{messagePreview(pinned, pinned.sticker ? stickerLabelFr(pinned.sticker) : "")}</span>
              </span>
              <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); saveSettings({ pinned_message_id: null }, "Message désépinglé."); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); saveSettings({ pinned_message_id: null }, "Message désépinglé."); } }}
                className="text-[12px] font-semibold text-[#56615A] hover:text-foreground px-2 py-1 rounded-md hover:bg-white">Désépingler</span>
            </button>
          )}

          <div ref={scrollRef} onScroll={onScroll}
            className="flex-1 overflow-y-auto bg-[#F4F1EA] [background-image:radial-gradient(rgba(72,107,70,0.06)_1px,transparent_1px)] [background-size:18px_18px] px-3 sm:px-5 py-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-sm text-center mt-16 rounded-2xl bg-white border border-border px-6 py-8">
                <MessagesSquare className="w-8 h-8 text-primary/70 mx-auto mb-3" />
                <p className="text-[15px] font-semibold text-foreground">
                  {view === "reported" ? "Aucun message signalé" : debounced ? "Aucun message ne correspond" : "Le groupe est encore silencieux"}
                </p>
                <p className="text-[13px] text-[#56615A] mt-1">
                  {view === "reported" ? "Tout est en ordre dans le groupe." : debounced ? "Essayez un autre mot-clé."
                    : "Lancez la conversation : un mot de bienvenue ou une question sur une leçon de l'Académie."}
                </p>
              </div>
            ) : (
              <>
                {hasMore && (
                  <div className="flex justify-center mb-2">
                    <button onClick={loadOlder} disabled={loadingOlder}
                      className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white border border-border text-[12.5px] font-semibold text-[#3F4A43] shadow-sm disabled:opacity-60">
                      {loadingOlder && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Messages précédents
                    </button>
                  </div>
                )}
                {rows.map(({ m, newDay, showAuthor }) => (
                  <div key={m.id}>
                    {newDay && <DaySeparator label={dayLabel(m.created_at, "fr-FR", "Aujourd'hui", "Hier")} />}
                    {m.open_reports > 0 && (
                      <p className={cn("flex items-center gap-1 text-[11.5px] font-semibold text-[#B42318] mt-3 -mb-2", m.is_staff ? "justify-end" : "pl-10")}>
                        <Flag className="w-3 h-3" /> {m.open_reports} signalement{m.open_reports > 1 ? "s" : ""}
                      </p>
                    )}
                    <ForumBubble
                      m={m as unknown as Parameters<typeof ForumBubble>[0]["m"]}
                      mine={m.is_staff}
                      showAuthor={showAuthor || newDay}
                      authorName={adminAuthorName(m)}
                      staffBadge="Équipe"
                      stickerLabel={stickerLabelFr}
                      quoteAuthor={(q) => adminAuthorName(q)}
                      unavailableQuote="Message supprimé"
                      time={filtered ? formatDateTime(m.created_at) : timeLabel(m.created_at, "fr-FR")}
                      editedLabel="modifié"
                      highlight={highlight === m.id || m.open_reports > 0}
                      onQuoteClick={jumpTo}
                      actions={
                        <AdminMessageMenu
                          m={m}
                          pinned={settings?.pinned_message_id === m.id}
                          muted={mutedIds.has(m.author_id)}
                          busy={busy === m.id || busy === `mute-${m.author_id}`}
                          onReply={() => { setEditing(null); setReplyTo(m); setPanel("none"); }}
                          onEdit={() => startEdit(m)}
                          onPin={() => saveSettings({ pinned_message_id: settings?.pinned_message_id === m.id ? null : m.id },
                            settings?.pinned_message_id === m.id ? "Message désépinglé." : "Message épinglé en haut du groupe.")}
                          onKeep={() => keep(m)}
                          onDelete={() => setToDelete(m)}
                          onMute={(d) => muteUser(m.author_id, d, m.author?.pseudo || "Ce membre")}
                          onUnmute={() => unmute(m.author_id)}
                        />
                      }
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Compositeur de l'équipe */}
          <div className="shrink-0 border-t border-border px-3 py-2.5 bg-white">
            {editing && (
              <div className="flex items-center gap-2 mb-2">
                <Pencil className="w-4 h-4 text-primary shrink-0" />
                <QuoteBlock className="flex-1 min-w-0" name="Modification du message de l'équipe" text={messagePreview(editing, "")} />
                <button onClick={cancelEdit} aria-label="Annuler la modification" className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
            )}
            {replyTo && (
              <div className="flex items-center gap-2 mb-2">
                <Reply className="w-4 h-4 text-primary shrink-0" />
                <QuoteBlock className="flex-1 min-w-0" name={adminAuthorName(replyTo)} text={messagePreview(replyTo, replyTo.sticker ? stickerLabelFr(replyTo.sticker) : "")} />
                <button onClick={() => setReplyTo(null)} aria-label="Annuler la réponse" className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
            )}
            {panel !== "none" && (
              <div className="mb-2 rounded-xl border border-border max-h-[220px] overflow-y-auto">
                {panel === "sticker" ? <StickerPicker labelFor={stickerLabelFr} onPick={(id) => send(id)} /> : (
                  <div className="p-2 space-y-2">
                    {EMOJI_CATEGORIES.map((g) => (
                      <div key={g.category} className="flex flex-wrap gap-0.5">
                        {g.emojis.map((e) => (
                          <button key={e.char} type="button" onClick={() => setDraft((d) => d + e.char)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted">
                            <FluentEmoji char={e.char} url={e.url} className="w-6 h-6" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-1.5">
              <button type="button" onClick={() => setPanel((p) => (p === "emoji" ? "none" : "emoji"))} aria-label="Emojis"
                className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", panel === "emoji" ? "bg-primary/10 text-primary" : "text-[#56615A] hover:bg-muted")}>
                <Smile className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => setPanel((p) => (p === "sticker" ? "none" : "sticker"))} aria-label="Stickers"
                className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", panel === "sticker" ? "bg-primary/10 text-primary" : "text-[#56615A] hover:bg-muted")}>
                <StickerIcon className="w-5 h-5" />
              </button>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} maxLength={FORUM_LIMITS.bodyMax}
                onKeyDown={(e) => { if (e.key === "Escape" && editing) { e.preventDefault(); cancelEdit(); return; } if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                placeholder="Écrire au groupe au nom de l'équipe…" aria-label="Message de l'équipe"
                className="flex-1 min-w-0 resize-none rounded-[20px] border border-border bg-white px-4 py-2 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 max-h-[140px]" />
              <button type="submit" disabled={!draft.trim() || busy === "send"} aria-label="Envoyer"
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-[#3A5A38] disabled:opacity-40">
                {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <p className="mt-1.5 text-[11.5px] text-[#6B746E] flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Signé « Équipe Garden of Alliance » côté membres.</p>
          </div>
        </section>

        {/* ───── Gestion du groupe ───── */}
        <aside className="space-y-4">
          <section className="bg-white rounded-2xl border border-border p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-foreground"><Settings2 className="w-4 h-4 text-primary" /> Réglages du groupe</h2>
            <label className="block mt-3 text-[12px] font-semibold text-[#56615A]" htmlFor="forum-name">Nom</label>
            <input id="forum-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-border text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            <label className="block mt-3 text-[12px] font-semibold text-[#56615A]" htmlFor="forum-desc">Description (visible des membres)</label>
            <textarea id="forum-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} rows={3}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-border text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none" />
            <button onClick={() => saveSettings({ name: form.name.trim(), description: form.description.trim() }, "Réglages enregistrés.")}
              disabled={!settingsDirty || busy === "settings"}
              className="mt-2 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-40">
              <Save className="w-3.5 h-3.5" /> Enregistrer
            </button>

            <div className="mt-4 pt-4 border-t border-border/70 flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary" /> Seule l&apos;équipe écrit</p>
                <p className="text-[12px] text-[#6B746E] mt-0.5">Les membres lisent sans pouvoir répondre, comme un groupe WhatsApp réservé aux admins.</p>
              </div>
              <button role="switch" aria-checked={!!settings?.admins_only} aria-label="Seule l'équipe écrit" disabled={!settings || busy === "settings"}
                onClick={() => settings && saveSettings({ admins_only: !settings.admins_only },
                  settings.admins_only ? "Les membres peuvent de nouveau écrire." : "Seule l'équipe peut maintenant écrire dans le groupe.")}
                className={cn("relative w-11 h-6 rounded-full shrink-0 transition-colors", settings?.admins_only ? "bg-primary" : "bg-[#D6D3CC]")}>
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", settings?.admins_only ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-border p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-foreground">
              <Flag className={cn("w-4 h-4", reports.length ? "text-[#B42318]" : "text-primary")} /> Signalements
              {reports.length > 0 && <span className="ml-auto text-[12px] font-semibold text-[#B42318]">{reports.length} à traiter</span>}
            </h2>
            {reports.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#56615A]">Aucun signalement en attente.</p>
            ) : (
              <ul className="mt-3 space-y-2 max-h-[280px] overflow-y-auto">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-xl bg-[#FAF9F6] px-3 py-2.5 text-[12.5px]">
                    <p className="text-[#56615A]">Par <span className="font-semibold text-foreground">{r.reporter?.pseudo || r.reporter?.name || "un membre"}</span> · {formatDateTime(r.created_at)}</p>
                    {r.reason && <p className="mt-1 text-[#3F4A43]">« {r.reason} »</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button onClick={() => { setView("all"); setSearch(""); setTimeout(() => jumpTo(r.message_id), 300); }}
                        className="h-7 px-2.5 rounded-lg border border-border bg-white text-[12px] font-semibold hover:bg-muted">Voir le message</button>
                      <button onClick={() => keep({ id: r.message_id })} disabled={busy === r.message_id}
                        className="h-7 px-2.5 rounded-lg border border-border bg-white text-[12px] font-semibold hover:bg-muted disabled:opacity-50">Conserver</button>
                      <button onClick={() => { const m = messages.find((x) => x.id === r.message_id); if (m) setToDelete(m); else call(r.message_id, `/api/admin/forum/messages/${r.message_id}`, { method: "DELETE" }, "Message supprimé.").then((ok) => ok && load()); }}
                        className="h-7 px-2.5 rounded-lg border border-[#B42318]/25 bg-white text-[12px] font-semibold text-[#B42318] hover:bg-[#B42318]/5">Supprimer</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-border p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-foreground"><VolumeX className="w-4 h-4 text-primary" /> Membres en sourdine</h2>
            {mutes.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#56615A]">Personne. Pour retirer la parole à un membre, ouvrez le menu d&apos;un de ses messages.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mutes.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-2 rounded-xl bg-[#FAF9F6] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{m.profile?.pseudo || "Membre"}{m.profile?.name && <span className="font-normal text-[#6B746E]"> · {m.profile.name}</span>}</p>
                      <p className="text-[11.5px] text-[#6B746E]">{m.until ? `Jusqu'au ${formatDateTime(m.until)}` : "Jusqu'à nouvel ordre"}</p>
                    </div>
                    <button onClick={() => unmute(m.user_id)} disabled={busy === `mute-${m.user_id}`}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border bg-white text-[12px] font-semibold hover:bg-muted disabled:opacity-50">
                      <Volume2 className="w-3.5 h-3.5" /> Rendre la parole
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Il disparaît du groupe pour tous les membres. Son contenu reste consigné dans le journal d&apos;audit de l&apos;administration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-[#B42318] hover:bg-[#912018] text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, hint, onClick, active, highlight }: {
  label: string; value: number; icon: typeof MessagesSquare; hint?: string; onClick?: () => void; active?: boolean; highlight?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#56615A]">{label}</span>
        <Icon className={cn("w-4 h-4", active || highlight ? "text-primary" : "text-[#8A938C]")} />
      </div>
      <p className="mt-1.5 text-[28px] leading-none font-bold text-foreground tabular-nums tracking-tight">{value.toLocaleString("fr-FR")}</p>
      {hint && <p className="mt-1 text-[11.5px] text-[#6B746E]">{hint}</p>}
    </>
  );
  const cls = cn("text-left bg-white rounded-2xl border px-4 py-3.5 transition-all", active ? "border-primary/50 ring-1 ring-primary/20" : "border-border");
  return onClick
    ? <button onClick={onClick} aria-pressed={active} className={cn(cls, "hover:border-primary/40")}>{content}</button>
    : <div className={cls}>{content}</div>;
}

function AdminMessageMenu({ m, pinned, muted, busy, onReply, onEdit, onPin, onKeep, onDelete, onMute, onUnmute }: {
  m: AdminForumMessage; pinned: boolean; muted: boolean; busy: boolean;
  onReply: () => void; onEdit: () => void; onPin: () => void; onKeep: () => void; onDelete: () => void;
  onMute: (duration: string) => void; onUnmute: () => void;
}) {
  // Délai de 5 minutes recalculé à chaque ouverture du menu.
  const [now, setNow] = useState(() => Date.now());
  const canEdit = m.is_staff && isEditable(m, now);
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) setNow(Date.now()); }}>
      <DropdownMenuTrigger asChild>
        <button aria-label="Actions sur le message" disabled={busy}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-white hover:text-foreground disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={m.is_staff ? "end" : "start"} className="w-56">
        {!m.is_staff && <DropdownMenuLabel className="text-[11.5px] font-medium text-[#6B746E] truncate">{adminAuthorName(m)}</DropdownMenuLabel>}
        {canEdit && <DropdownMenuItem onSelect={onEdit}><Pencil className="w-4 h-4 mr-2" /> Modifier (5 min après l&apos;envoi)</DropdownMenuItem>}
        <DropdownMenuItem onSelect={onReply}><Reply className="w-4 h-4 mr-2" /> Répondre</DropdownMenuItem>
        <DropdownMenuItem onSelect={onPin}>{pinned ? <><PinOff className="w-4 h-4 mr-2" /> Désépingler</> : <><Pin className="w-4 h-4 mr-2" /> Épingler en haut du groupe</>}</DropdownMenuItem>
        {m.open_reports > 0 && <DropdownMenuItem onSelect={onKeep}><CheckCircle2 className="w-4 h-4 mr-2" /> Conserver (signalement traité)</DropdownMenuItem>}
        {!m.is_staff && (
          <>
            <DropdownMenuSeparator />
            {muted ? (
              <DropdownMenuItem onSelect={onUnmute}><Volume2 className="w-4 h-4 mr-2" /> Rendre la parole</DropdownMenuItem>
            ) : (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><VolumeX className="w-4 h-4 mr-2" /> Mettre en sourdine</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {MUTE_OPTIONS.map((o) => <DropdownMenuItem key={o.value} onSelect={() => onMute(o.value)}>{o.label}</DropdownMenuItem>)}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {m.author && (
              <DropdownMenuItem asChild><Link href={`/admin/users/${m.author.id}`}><UserRound className="w-4 h-4 mr-2" /> Voir le profil</Link></DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-[#B42318] focus:text-[#B42318] focus:bg-[#B42318]/10">
          <Trash2 className="w-4 h-4 mr-2" /> Supprimer pour tous
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
