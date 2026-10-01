"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Send, Smile, Sticker as StickerIcon, X, Pin, Lock, VolumeX, MoreVertical, Reply, Copy, Flag, Trash2, Pencil, Check,
  ChevronDown, Loader2, MessagesSquare, GraduationCap, Info,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Monogram } from "@/components/ornaments";
import { useFormationLocale } from "@/lib/formation/ui";
import { FluentEmoji, EMOJI_CATEGORIES } from "@/components/fluent-emoji";
import { ForumBubble, StickerPicker, QuoteBlock, DaySeparator } from "@/components/forum/forum-ui";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FORUM_CANNOT_POST, FORUM_LIMITS, FORUM_UNAVAILABLE, DEFAULT_FORUM_SETTINGS,
  dayKey, dayLabel, timeLabel, messagePreview,
  getForumSettings, getMemberCount, getMessage, getMyId, getMyMute, listMessages, sendForumMessage,
  deleteForumMessage, reportForumMessage, subscribeForum, editForumMessage, isEditable, FORUM_EDIT_EXPIRED,
  type ForumMessage, type ForumSettings,
} from "@/lib/forum";

export default function ForumPage() {
  return (
    <Suspense fallback={null}>
      <ForumGroup />
    </Suspense>
  );
}

function ForumGroup() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const params = useSearchParams();
  const { find } = useFormationLocale();

  const [me, setMe] = useState<string | null>(null);
  const [settings, setSettings] = useState<ForumSettings>(DEFAULT_FORUM_SETTINGS);
  const [members, setMembers] = useState<number | null>(null);
  const [mute, setMute] = useState<{ until: string | null } | null>(null);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [pinned, setPinned] = useState<ForumMessage | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ForumMessage | null>(null);
  // Message en cours de modification (le compositeur sert alors à corriger son texte).
  const [editing, setEditing] = useState<ForumMessage | null>(null);
  const [panel, setPanel] = useState<"none" | "emoji" | "sticker">("none");
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ForumMessage | null>(null);
  const [toReport, setToReport] = useState<ForumMessage | null>(null);
  const [reportReason, setReportReason] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);

  const stickerLabel = useCallback((id: string) => t(`forum.stickers.${id}`), [t]);
  const nameOf = useCallback((m: { is_staff: boolean; author: { pseudo: string | null } | null }) =>
    m.is_staff ? t("forum.staff") : m.author?.pseudo || t("forum.member"), [t]);

  /* ── Chargement ── */
  const loadPinned = useCallback(async (id: string | null) => {
    setPinned(id ? await getMessage(id) : null);
  }, []);

  const refreshSettings = useCallback(async () => {
    const res = await getForumSettings();
    if (res.data) { setSettings(res.data); loadPinned(res.data.pinned_message_id); }
  }, [loadPinned]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [myId, settingsRes, list] = await Promise.all([getMyId(), getForumSettings(), listMessages()]);
      if (cancelled) return;
      if (list.error || settingsRes.error) {
        setState((list.error || settingsRes.error) === FORUM_UNAVAILABLE ? "unavailable" : "error");
        return;
      }
      setMe(myId);
      setSettings(settingsRes.data!);
      setMessages(list.data!.messages);
      setHasMore(list.data!.hasMore);
      setState("ready");
      loadPinned(settingsRes.data!.pinned_message_id);
      getMemberCount().then((n) => !cancelled && setMembers(n));
      if (myId) getMyMute(myId).then((m) => !cancelled && setMute(m));
    })();
    return () => { cancelled = true; };
  }, [loadPinned]);

  // Arrivée depuis une leçon (/dashboard/forum?lecon=1-3) : message prérempli.
  const lessonSlug = params.get("lecon");
  useEffect(() => {
    if (!lessonSlug) return;
    const l = find(lessonSlug)?.lesson;
    if (l) setDraft((d) => d || t("forum.lessonPrefill", { number: l.number, title: l.title }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonSlug]);

  /* ── Temps réel ── */
  useEffect(() => {
    if (state !== "ready") return;
    return subscribeForum({
      onInsert: async (id) => {
        const m = await getMessage(id);
        if (!m) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (!atBottom.current && m.author_id !== me) setUnseen((n) => n + 1);
      },
      onUpdate: async (id) => {
        const m = await getMessage(id);
        if (!m) return;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        setPinned((p) => (p?.id === m.id ? m : p));
      },
      onDelete: (id) => {
        setMessages((prev) => prev.filter((x) => x.id !== id));
        setPinned((p) => (p?.id === id ? null : p));
      },
      onSettings: refreshSettings,
    });
  }, [state, me, refreshSettings]);

  /* ── Défilement ── */
  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnseen(0);
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      // Messages plus anciens ajoutés en haut : on garde la position de lecture.
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom.current) setUnseen(0);
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    const res = await listMessages(messages[0].created_at);
    setLoadingOlder(false);
    if (!res.data) return;
    const el = scrollRef.current;
    if (el) keepOffset.current = el.scrollHeight - el.scrollTop;
    setMessages((prev) => [...res.data!.messages, ...prev]);
    setHasMore(res.data.hasMore);
  };

  const jumpTo = (id: string) => {
    const node = document.getElementById(`msg-${id}`);
    if (!node) { toast({ title: t("forum.quoteNotLoaded") }); return; }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(id);
    setTimeout(() => setHighlight(null), 1600);
  };

  /* ── Envoi ── */
  const canPost = !settings.admins_only && !mute;

  const saveEdit = async () => {
    if (!editing || !draft.trim()) return;
    if (draft.trim() === editing.body.trim()) { cancelEdit(); return; }
    setSending(true);
    const res = await editForumMessage(editing.id, draft);
    setSending(false);
    if (res.error || !res.data) {
      toast({
        title: res.error === FORUM_EDIT_EXPIRED ? t("forum.editExpiredTitle") : t("forum.editError"),
        description: res.error === FORUM_EDIT_EXPIRED ? t("forum.editExpiredDesc") : undefined,
        variant: "destructive",
      });
      if (res.error === FORUM_EDIT_EXPIRED) cancelEdit();
      return;
    }
    setMessages((prev) => prev.map((x) => (x.id === res.data!.id ? res.data! : x)));
    setPinned((p) => (p?.id === res.data!.id ? res.data! : p));
    cancelEdit();
  };

  const send = async (sticker?: string) => {
    if (editing && !sticker) { await saveEdit(); return; }
    const body = sticker ? "" : draft;
    if (!sticker && !body.trim()) return;
    setSending(true);
    const res = await sendForumMessage({ body, sticker: sticker || null, replyTo: replyTo?.id ?? null });
    setSending(false);
    if (res.error || !res.data) {
      if (res.error === FORUM_CANNOT_POST) {
        toast({ title: t("forum.cannotPostTitle"), description: t("forum.cannotPostDesc"), variant: "destructive" });
        if (me) getMyMute(me).then(setMute);
        refreshSettings();
      } else {
        toast({ title: t("forum.sendError"), variant: "destructive" });
      }
      return;
    }
    if (!sticker) setDraft("");
    setReplyTo(null);
    setPanel("none");
    atBottom.current = true;
    setMessages((prev) => (prev.some((x) => x.id === res.data!.id) ? prev : [...prev, res.data!]));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Entrée envoie, Maj+Entrée va à la ligne (comme WhatsApp Web).
    if (e.key === "Escape" && editing) { e.preventDefault(); cancelEdit(); return; }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!sending) send();
    }
  };

  // Hauteur du champ ajustée au texte (jusqu'à 6 lignes environ).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, [draft]);

  const insertEmoji = (char: string) => {
    const el = inputRef.current;
    if (!el) { setDraft((d) => d + char); return; }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + char + draft.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + char.length, start + char.length); });
  };

  /* ── Actions sur un message ── */
  const startReply = (m: ForumMessage) => { setEditing(null); setReplyTo(m); setPanel("none"); inputRef.current?.focus(); };

  const startEdit = (m: ForumMessage) => {
    setReplyTo(null);
    setPanel("none");
    setEditing(m);
    setDraft(m.body);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    });
  };

  const cancelEdit = () => { setEditing(null); setDraft(""); };

  const copy = async (m: ForumMessage) => {
    try { await navigator.clipboard.writeText(m.body); toast({ title: t("forum.copied") }); } catch { /* presse-papiers indisponible */ }
  };

  const confirmDelete = async () => {
    const m = toDelete;
    setToDelete(null);
    if (!m) return;
    if (editing?.id === m.id) cancelEdit();
    const res = await deleteForumMessage(m.id);
    if (res.error) { toast({ title: t("forum.deleteError"), variant: "destructive" }); return; }
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  };

  const confirmReport = async () => {
    const m = toReport;
    setToReport(null);
    if (!m) return;
    const res = await reportForumMessage(m.id, reportReason);
    setReportReason("");
    if (res.error) { toast({ title: t("forum.reportError"), variant: "destructive" }); return; }
    toast({ title: res.data === "already" ? t("forum.reportAlready") : t("forum.reportSent"), description: t("forum.reportSentDesc") });
  };

  /* ── Rendu ── */
  const rows = useMemo(() => messages.map((m, i) => {
    const prev = messages[i - 1];
    const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
    const sameAuthor = !!prev && !newDay && prev.author_id === m.author_id &&
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
    return { m, newDay, showAuthor: !sameAuthor };
  }), [messages]);

  return (
    <div className="eden-public h-[100dvh] flex flex-col bg-background text-foreground">
      {/* En-tête du groupe */}
      <header className="shrink-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 h-16 flex items-center gap-2">
          <Link href="/dashboard" aria-label={t("academie.backToDashboard")}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#3F4A43] hover:bg-muted shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button onClick={() => setShowInfo((v) => !v)} className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-xl px-1.5 py-1 hover:bg-muted/60">
            <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Monogram className="w-6 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-headline text-[17px] font-bold leading-tight truncate">{settings.name}</span>
              <span className="block text-[12px] text-[#6B746E] truncate">
                {members !== null ? t("forum.membersCount", { count: members }) : t("forum.groupSubtitle")}
              </span>
            </span>
          </button>
          <button onClick={() => setShowInfo((v) => !v)} aria-label={t("forum.groupInfo")} aria-expanded={showInfo}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#3F4A43] hover:bg-muted shrink-0">
            <Info className="w-5 h-5" />
          </button>
        </div>

        {showInfo && (
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <div className="rounded-2xl border border-border bg-card p-4 text-[14px] leading-relaxed text-[#3F4A43]">
              {settings.description && <p>{settings.description}</p>}
              <p className={cn("text-[13px] text-[#56615A]", settings.description && "mt-2")}>{t("forum.rules")}</p>
              <Link href="/dashboard/academie" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
                <GraduationCap className="w-4 h-4" /> {t("dashboard.academyTitle")}
              </Link>
            </div>
          </div>
        )}

        {/* Message épinglé par l'équipe */}
        {pinned && (
          <button onClick={() => jumpTo(pinned.id)}
            className="w-full border-t border-border bg-card/80 hover:bg-card transition-colors">
            <span className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-3 text-left">
              <Pin className="w-4 h-4 text-primary shrink-0" />
              <span className="min-w-0">
                <span className="block text-[11.5px] font-bold text-primary">{t("forum.pinnedMessage")}</span>
                <span className="block text-[13px] text-[#3F4A43] truncate">{messagePreview(pinned, pinned.sticker ? stickerLabel(pinned.sticker) : "")}</span>
              </span>
            </span>
          </button>
        )}
      </header>

      {/* Fil des messages */}
      <div ref={scrollRef} onScroll={onScroll}
        className="relative flex-1 overflow-y-auto bg-[#F4F1EA] [background-image:radial-gradient(rgba(72,107,70,0.06)_1px,transparent_1px)] [background-size:18px_18px]">
        <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4">
          {state === "loading" && (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          )}

          {(state === "unavailable" || state === "error") && (
            <div className="mx-auto max-w-md mt-16 rounded-2xl border border-border bg-card px-6 py-10 text-center">
              <MessagesSquare className="w-8 h-8 text-primary/60 mx-auto mb-3" />
              <p className="text-[15px] font-semibold">{state === "unavailable" ? t("forum.unavailableTitle") : t("forum.loadError")}</p>
              {state === "unavailable" && <p className="mt-1 text-[13.5px] text-[#56615A]">{t("forum.unavailableDesc")}</p>}
            </div>
          )}

          {state === "ready" && (
            <>
              {hasMore ? (
                <div className="flex justify-center mb-2">
                  <button onClick={loadOlder} disabled={loadingOlder}
                    className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-white border border-border text-[12.5px] font-semibold text-[#3F4A43] shadow-sm hover:border-primary/40 disabled:opacity-60">
                    {loadingOlder && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {t("forum.olderMessages")}
                  </button>
                </div>
              ) : (
                <div className="mx-auto max-w-sm text-center rounded-2xl bg-[#FFF8E6] border border-[#F0E2B6] px-4 py-3 text-[12.5px] text-[#6B5A2E] mb-2">
                  {t("forum.welcomeNotice")}
                </div>
              )}

              {messages.length === 0 && (
                <div className="text-center py-14">
                  <p className="font-headline text-[20px] font-bold">{t("forum.emptyTitle")}</p>
                  <p className="mt-1 text-[14px] text-[#56615A]">{t("forum.emptyDesc")}</p>
                </div>
              )}

              {rows.map(({ m, newDay, showAuthor }) => (
                <div key={m.id}>
                  {newDay && <DaySeparator label={dayLabel(m.created_at, locale, t("forum.today"), t("forum.yesterday"))} />}
                  <ForumBubble
                    m={m}
                    mine={m.author_id === me}
                    showAuthor={showAuthor || newDay}
                    authorName={nameOf(m)}
                    staffBadge={t("forum.staffBadge")}
                    stickerLabel={stickerLabel}
                    quoteAuthor={(q) => (q.is_staff ? t("forum.staff") : q.author?.pseudo || t("forum.member"))}
                    unavailableQuote={t("forum.quoteUnavailable")}
                    time={timeLabel(m.created_at, locale)}
                    editedLabel={t("forum.edited")}
                    highlight={highlight === m.id}
                    onQuoteClick={jumpTo}
                    actions={
                      <MessageMenu
                        mine={m.author_id === me}
                        canReply={canPost}
                        hasText={!!m.body.trim()}
                        createdAt={m.created_at}
                        body={m.body}
                        onEdit={() => startEdit(m)}
                        onReply={() => startReply(m)}
                        onCopy={() => copy(m)}
                        onReport={() => setToReport(m)}
                        onDelete={() => setToDelete(m)}
                      />
                    }
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {unseen > 0 && (
          <button onClick={() => scrollToBottom(true)}
            className="sticky bottom-3 left-full mr-4 float-right inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary text-white text-[12.5px] font-bold shadow-lg">
            <ChevronDown className="w-4 h-4" /> {t("forum.newMessages", { count: unseen })}
          </button>
        )}
      </div>

      {/* Compositeur */}
      {state === "ready" && (
        <footer className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2">
            {!canPost ? (
              <p className="flex items-center justify-center gap-2 py-3 text-center text-[13.5px] text-[#56615A]">
                {settings.admins_only ? <Lock className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
                {settings.admins_only
                  ? t("forum.adminsOnly")
                  : mute?.until
                    ? t("forum.mutedUntil", { date: new Date(mute.until).toLocaleString(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) })
                    : t("forum.muted")}
              </p>
            ) : (
              <>
                {editing && (
                  <div className="flex items-center gap-2 mb-2">
                    <Pencil className="w-4 h-4 text-primary shrink-0" />
                    <QuoteBlock className="flex-1 min-w-0" name={t("forum.editingTitle")}
                      text={messagePreview(editing, "")} />
                    <button onClick={cancelEdit} aria-label={t("forum.cancelEdit")}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                )}

                {replyTo && (
                  <div className="flex items-center gap-2 mb-2">
                    <Reply className="w-4 h-4 text-primary shrink-0" />
                    <QuoteBlock className="flex-1 min-w-0" name={nameOf(replyTo)}
                      text={messagePreview(replyTo, replyTo.sticker ? stickerLabel(replyTo.sticker) : "")} />
                    <button onClick={() => setReplyTo(null)} aria-label={t("forum.cancelReply")}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                )}

                {panel !== "none" && (
                  <div className="mb-2 rounded-2xl border border-border bg-card max-h-[240px] overflow-y-auto custom-scrollbar">
                    {panel === "sticker" ? (
                      <StickerPicker labelFor={stickerLabel} onPick={(id) => send(id)} />
                    ) : (
                      <div className="p-2 space-y-2">
                        {EMOJI_CATEGORIES.map((g) => (
                          <div key={g.category} className="flex flex-wrap gap-0.5">
                            {g.emojis.map((e) => (
                              <button key={e.char} type="button" onClick={() => insertEmoji(e.char)}
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
                  <button type="button" onClick={() => setPanel((p) => (p === "emoji" ? "none" : "emoji"))}
                    aria-label={t("forum.emojis")} aria-pressed={panel === "emoji"}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      panel === "emoji" ? "bg-primary/10 text-primary" : "text-[#56615A] hover:bg-muted")}>
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => setPanel((p) => (p === "sticker" ? "none" : "sticker"))}
                    aria-label={t("forum.stickersLabel")} aria-pressed={panel === "sticker"}
                    className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      panel === "sticker" ? "bg-primary/10 text-primary" : "text-[#56615A] hover:bg-muted")}>
                    <StickerIcon className="w-5 h-5" />
                  </button>
                  <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
                    rows={1} maxLength={FORUM_LIMITS.bodyMax} placeholder={t("forum.composerPlaceholder")} aria-label={t("forum.composerPlaceholder")}
                    className="flex-1 min-w-0 resize-none rounded-[22px] border border-border bg-card px-4 py-2.5 text-[15px] leading-snug outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 max-h-[148px]" />
                  <button type="submit" disabled={!draft.trim() || sending} aria-label={editing ? t("forum.saveEdit") : t("forum.send")}
                    className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-40 transition-colors">
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : editing ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </>
            )}
          </div>
        </footer>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forum.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("forum.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("forum.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">{t("forum.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toReport} onOpenChange={(o) => { if (!o) { setToReport(null); setReportReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("forum.reportTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("forum.reportDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={3} maxLength={FORUM_LIMITS.reportMax}
            placeholder={t("forum.reportPlaceholder")} aria-label={t("forum.reportPlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-primary resize-none" />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("forum.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReport}>{t("forum.report")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MessageMenu({ mine, canReply, hasText, createdAt, body, onEdit, onReply, onCopy, onReport, onDelete }: {
  mine: boolean; canReply: boolean; hasText: boolean; createdAt: string; body: string;
  onEdit: () => void; onReply: () => void; onCopy: () => void; onReport: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  // Délai de 5 minutes recalculé à chaque ouverture du menu.
  const [now, setNow] = useState(() => Date.now());
  const canEdit = mine && canReply && isEditable({ body, created_at: createdAt }, now);
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) setNow(Date.now()); }}>
      <DropdownMenuTrigger asChild>
        <button aria-label={t("forum.messageActions")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-white/80 hover:text-foreground">
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mine ? "end" : "start"} className="w-44">
        {canEdit && <DropdownMenuItem onSelect={onEdit}><Pencil className="w-4 h-4 mr-2" /> {t("forum.edit")}</DropdownMenuItem>}
        {canReply && <DropdownMenuItem onSelect={onReply}><Reply className="w-4 h-4 mr-2" /> {t("forum.reply")}</DropdownMenuItem>}
        {hasText && <DropdownMenuItem onSelect={onCopy}><Copy className="w-4 h-4 mr-2" /> {t("forum.copy")}</DropdownMenuItem>}
        {mine ? (
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> {t("forum.delete")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onReport}><Flag className="w-4 h-4 mr-2" /> {t("forum.report")}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
