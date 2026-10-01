"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Flag, Trash2, Lock, Pin, Loader2, Send, GraduationCap, EyeOff, MessagesSquare, ArrowRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFormationLocale } from "@/lib/formation/ui";
import { FORMATION_BASE_PATH } from "@/lib/formation/paths";
import { ForumHeader, CategoryChip, AuthorLine } from "@/components/forum/forum-ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FORUM_LIMITS, FORUM_UNAVAILABLE, getTopic, listReplies, createReply, deleteTopic, deleteReply, reportPost, getMyId,
  type ForumTopic, type ForumReply,
} from "@/lib/forum";

type Target = { kind: "topic" } | { kind: "reply"; reply: ForumReply };

export default function ForumTopicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const { find } = useFormationLocale();

  const [me, setMe] = useState<string | null>(null);
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error" | "unavailable">("loading");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [toDelete, setToDelete] = useState<Target | null>(null);
  const [toReport, setToReport] = useState<Target | null>(null);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [myId, topicRes, repliesRes] = await Promise.all([getMyId(), getTopic(id), listReplies(id)]);
      if (cancelled) return;
      setMe(myId);
      if (topicRes.error) { setState(topicRes.error === FORUM_UNAVAILABLE ? "unavailable" : "error"); return; }
      if (!topicRes.data) { setState("missing"); return; }
      setTopic(topicRes.data);
      setReplies(repliesRes.data || []);
      setState("ready");
    })();
    return () => { cancelled = true; };
  }, [id]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !topic) return;
    setSending(true);
    const res = await createReply(topic.id, draft);
    setSending(false);
    if (res.error || !res.data) {
      toast({ title: t("forum.replyError"), description: topic.is_locked ? t("forum.lockedDesc") : undefined, variant: "destructive" });
      return;
    }
    setReplies((prev) => [...prev, res.data!]);
    setDraft("");
  };

  const confirmDelete = async () => {
    if (!toDelete || !topic) return;
    const target = toDelete;
    setToDelete(null);
    if (target.kind === "topic") {
      const res = await deleteTopic(topic.id);
      if (res.error) { toast({ title: t("forum.deleteError"), variant: "destructive" }); return; }
      toast({ title: t("forum.topicDeleted") });
      router.push("/dashboard/forum");
    } else {
      const res = await deleteReply(target.reply.id);
      if (res.error) { toast({ title: t("forum.deleteError"), variant: "destructive" }); return; }
      setReplies((prev) => prev.filter((r) => r.id !== target.reply.id));
    }
  };

  const confirmReport = async () => {
    if (!toReport || !topic) return;
    const target = toReport;
    setToReport(null);
    const res = await reportPost(topic.id, target.kind === "reply" ? target.reply.id : null, reportReason);
    setReportReason("");
    if (res.error) { toast({ title: t("forum.reportError"), variant: "destructive" }); return; }
    toast({ title: res.data === "already" ? t("forum.reportAlready") : t("forum.reportSent"), description: t("forum.reportSentDesc") });
  };

  const lesson = topic?.lesson_slug ? find(topic.lesson_slug)?.lesson : null;

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      <ForumHeader backHref="/dashboard/forum" backLabel={t("forum.allTopics")} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link href="/dashboard/forum" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#56615A] hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> {t("forum.allTopics")}
        </Link>

        {state === "loading" && (
          <div className="mt-6 space-y-3" aria-busy="true">
            <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
            <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
          </div>
        )}

        {(state === "missing" || state === "error" || state === "unavailable") && (
          <div className="mt-6 rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <MessagesSquare className="w-8 h-8 text-primary/60 mx-auto mb-3" />
            <p className="text-[15px] font-semibold">
              {state === "missing" ? t("forum.topicMissing") : state === "unavailable" ? t("forum.unavailableTitle") : t("forum.loadError")}
            </p>
            <Link href="/dashboard/forum" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:underline">
              {t("forum.allTopics")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {state === "ready" && topic && (
          <>
            {/* Sujet */}
            <article className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-1.5">
                {topic.is_pinned && (
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-primary text-white text-[11px] font-bold"><Pin className="w-3 h-3" /> {t("forum.pinned")}</span>
                )}
                <Link href={`/dashboard/forum?categorie=${topic.category}`}><CategoryChip category={topic.category} /></Link>
                {lesson && (
                  <Link href={`${FORMATION_BASE_PATH}/${lesson.slug}`}
                    className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full border border-border text-[11.5px] font-semibold text-[#3F4A43] hover:border-primary/40 hover:text-primary">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" /> {t("forum.lessonOption", { number: lesson.number, title: lesson.title })}
                  </Link>
                )}
              </div>
              <h1 className="mt-3 font-headline text-[28px] sm:text-[34px] font-bold leading-tight">{topic.title}</h1>
              <div className="mt-4"><AuthorLine author={topic.author} isStaff={topic.is_staff} date={topic.created_at} /></div>
              {topic.status === "hidden" && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-[#56615A]">
                  <EyeOff className="w-4 h-4 shrink-0" /> {t("forum.hiddenNotice")}
                </p>
              )}
              <div className="mt-5 text-[15.5px] leading-relaxed text-[#2E3A33] whitespace-pre-wrap break-words">{topic.body}</div>
              <PostActions mine={topic.author_id === me}
                onReport={() => setToReport({ kind: "topic" })} onDelete={() => setToDelete({ kind: "topic" })} />
            </article>

            {/* Réponses */}
            <section aria-labelledby="replies" className="mt-8">
              <h2 id="replies" className="text-[15px] font-bold text-[#2F2F2F]">
                {replies.length} {t(replies.length > 1 ? "forum.repliesMany" : "forum.repliesOne")}
              </h2>
              {replies.length === 0 ? (
                <p className="mt-3 text-[14px] text-[#56615A]">{t("forum.noReplies")}</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {replies.map((r) => (
                    <li key={r.id} className={cn("rounded-2xl border bg-card px-4 sm:px-5 py-4", r.is_staff ? "border-primary/30" : "border-border")}>
                      <AuthorLine author={r.author} isStaff={r.is_staff} date={r.created_at} size="sm" />
                      {r.status === "hidden" && (
                        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[#56615A]"><EyeOff className="w-3.5 h-3.5" /> {t("forum.hiddenReplyNotice")}</p>
                      )}
                      <p className="mt-2.5 text-[15px] leading-relaxed text-[#2E3A33] whitespace-pre-wrap break-words">{r.body}</p>
                      <PostActions mine={r.author_id === me}
                        onReport={() => setToReport({ kind: "reply", reply: r })} onDelete={() => setToDelete({ kind: "reply", reply: r })} />
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Répondre */}
            {topic.is_locked ? (
              <p className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-[14px] text-[#56615A]">
                <Lock className="w-4 h-4 shrink-0" /> {t("forum.lockedDesc")}
              </p>
            ) : topic.status === "visible" && (
              <form onSubmit={sendReply} className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
                <label htmlFor="forum-reply" className="block text-[14px] font-semibold mb-2">{t("forum.yourReply")}</label>
                <textarea id="forum-reply" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={FORUM_LIMITS.replyMax}
                  placeholder={t("forum.replyPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-[#6B746E]">{t("forum.charter")}</p>
                  <button type="submit" disabled={!draft.trim() || sending}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-white text-[14px] font-bold hover:bg-primary/90 disabled:opacity-50 shrink-0">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("forum.reply")}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toDelete?.kind === "topic" ? t("forum.deleteTopicTitle") : t("forum.deleteReplyTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.kind === "topic" ? t("forum.deleteTopicDesc") : t("forum.deleteReplyDesc")}</AlertDialogDescription>
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

function PostActions({ mine, onReport, onDelete }: { mine: boolean; onReport: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 flex justify-end gap-1">
      {mine ? (
        <button onClick={onDelete} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-semibold text-[#6B746E] hover:text-destructive hover:bg-destructive/5">
          <Trash2 className="w-3.5 h-3.5" /> {t("forum.delete")}
        </button>
      ) : (
        <button onClick={onReport} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-semibold text-[#6B746E] hover:text-foreground hover:bg-muted">
          <Flag className="w-3.5 h-3.5" /> {t("forum.report")}
        </button>
      )}
    </div>
  );
}
