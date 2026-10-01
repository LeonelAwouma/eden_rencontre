"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Pin, PinOff, Lock, Unlock, EyeOff, Eye, Trash2, Flag, CheckCircle2, Loader2, Send, GraduationCap,
  ExternalLink, X, UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORUM_LIMITS } from "@/lib/forum-shared";
import { ADMIN_LESSON_PREVIEW_PATH } from "@/lib/formation/paths";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AuthorName, categoryLabel, formatDateTime, lessonLabel, type AdminForumAuthor,
} from "@/components/admin/forum/forum-admin-shared";

interface Topic {
  id: string; author_id: string; category: string; lesson_slug: string | null; title: string; body: string;
  status: "visible" | "hidden"; is_pinned: boolean; is_locked: boolean; is_staff: boolean;
  reply_count: number; created_at: string; author: AdminForumAuthor | null;
}
interface Reply {
  id: string; author_id: string; body: string; status: "visible" | "hidden"; is_staff: boolean;
  created_at: string; open_reports: number; author: AdminForumAuthor | null;
}
interface Report {
  id: string; reply_id: string | null; reason: string | null; resolved: boolean; created_at: string;
  reporter: { id: string; pseudo: string | null; name: string | null } | null;
}

type Confirm = { kind: "topic" } | { kind: "reply"; reply: Reply } | null;

export default function AdminForumTopicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/forum/${id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Sujet introuvable."); return; }
      setError(null);
      setTopic(data.topic);
      setReplies(data.replies || []);
      setReports(data.reports || []);
    } catch {
      setError("Impossible de charger le sujet.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const flash = (text: string) => { setNotice(text); setTimeout(() => setNotice(null), 3500); };

  const call = async (key: string, url: string, init: RequestInit, done: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "L'action a échoué."); return false; }
      setError(null);
      flash(done);
      return true;
    } catch {
      setError("L'action a échoué.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const patchTopic = async (body: Record<string, unknown>, done: string) => {
    if (await call("topic", `/api/admin/forum/${id}`, { method: "PATCH", body: JSON.stringify(body) }, done)) load();
  };
  const patchReply = async (reply: Reply, body: Record<string, unknown>, done: string) => {
    if (await call(reply.id, `/api/admin/forum/replies/${reply.id}`, { method: "PATCH", body: JSON.stringify(body) }, done)) load();
  };

  const doDelete = async () => {
    const target = confirm;
    setConfirm(null);
    if (!target) return;
    if (target.kind === "topic") {
      if (await call("topic", `/api/admin/forum/${id}`, { method: "DELETE" }, "Sujet supprimé.")) router.push("/admin/forum");
    } else if (await call(target.reply.id, `/api/admin/forum/replies/${target.reply.id}`, { method: "DELETE" }, "Réponse supprimée.")) {
      load();
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    if (await call("reply", `/api/admin/forum/${id}/replies`, { method: "POST", body: JSON.stringify({ body: draft }) }, "Réponse publiée.")) {
      setDraft("");
      load();
    }
  };

  const openReports = reports.filter((r) => !r.resolved);
  const topicReports = openReports.filter((r) => !r.reply_id);

  return (
    <div className="max-w-4xl">
      <Link href="/admin/forum" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#56615A] hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Forum
      </Link>

      {notice && (
        <div role="status" className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-primary/30 shadow-lg text-[13px] font-medium text-[#3A5A38]">
          <CheckCircle2 className="w-4 h-4 text-primary" /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[13px] font-medium text-[#B42318]">
          {error}
          <button onClick={() => setError(null)} aria-label="Fermer" className="p-1 rounded-md hover:bg-[#B42318]/10"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-white rounded-2xl border border-border animate-pulse" aria-busy="true" />
      ) : topic && (
        <>
          {/* Sujet + actions de modération */}
          <article className={cn("bg-white rounded-2xl border p-5 sm:p-6", topic.status === "hidden" ? "border-dashed border-[#8A938C]" : "border-border")}>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="font-semibold text-primary">{categoryLabel(topic.category)}</span>
              {topic.lesson_slug && (
                <Link href={`${ADMIN_LESSON_PREVIEW_PATH}/${topic.lesson_slug}`} className="inline-flex items-center gap-1 text-[#56615A] hover:text-primary">
                  <GraduationCap className="w-3.5 h-3.5" /> {lessonLabel(topic.lesson_slug)}
                </Link>
              )}
              {topic.status === "hidden" && <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-muted font-semibold text-[#56615A]"><EyeOff className="w-3 h-3" /> Masqué aux membres</span>}
              {topic.is_locked && <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-muted font-semibold text-[#56615A]"><Lock className="w-3 h-3" /> Fermé</span>}
              {topic.is_pinned && <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-primary/10 font-semibold text-primary"><Pin className="w-3 h-3" /> Épinglé</span>}
            </div>
            <h1 className="mt-2 text-[22px] sm:text-[26px] font-bold text-foreground leading-tight">{topic.title}</h1>
            <p className="mt-2 text-[13px]">
              <AuthorName author={topic.author} isStaff={topic.is_staff} /> <span className="text-[#6B746E]">· {formatDateTime(topic.created_at)}</span>
              {!topic.is_staff && topic.author && (
                <Link href={`/admin/users/${topic.author.id}`} className="ml-2 inline-flex items-center gap-1 text-primary font-semibold hover:underline"><UserRound className="w-3.5 h-3.5" /> Profil</Link>
              )}
            </p>
            <div className="mt-4 text-[14.5px] leading-relaxed text-[#2E3A33] whitespace-pre-wrap break-words">{topic.body}</div>

            <div className="mt-5 pt-4 border-t border-border/70 flex flex-wrap gap-2">
              <ActionButton busy={busy === "topic"} icon={topic.is_pinned ? PinOff : Pin}
                onClick={() => patchTopic({ is_pinned: !topic.is_pinned }, topic.is_pinned ? "Sujet désépinglé." : "Sujet épinglé en haut du forum.")}>
                {topic.is_pinned ? "Désépingler" : "Épingler"}
              </ActionButton>
              <ActionButton busy={busy === "topic"} icon={topic.is_locked ? Unlock : Lock}
                onClick={() => patchTopic({ is_locked: !topic.is_locked }, topic.is_locked ? "Sujet rouvert aux réponses." : "Sujet fermé : plus de nouvelles réponses.")}>
                {topic.is_locked ? "Rouvrir" : "Fermer aux réponses"}
              </ActionButton>
              <ActionButton busy={busy === "topic"} icon={topic.status === "hidden" ? Eye : EyeOff}
                onClick={() => patchTopic({ status: topic.status === "hidden" ? "visible" : "hidden" }, topic.status === "hidden" ? "Sujet de nouveau visible." : "Sujet masqué aux membres.")}>
                {topic.status === "hidden" ? "Réafficher" : "Masquer"}
              </ActionButton>
              <ActionButton busy={busy === "topic"} icon={Trash2} tone="danger" onClick={() => setConfirm({ kind: "topic" })}>Supprimer</ActionButton>
            </div>
          </article>

          {/* Signalements en attente */}
          {openReports.length > 0 && (
            <section className="mt-4 bg-white rounded-2xl border border-[#B42318]/25 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#B42318]"><Flag className="w-4 h-4" /> {openReports.length} signalement{openReports.length > 1 ? "s" : ""} à traiter</h2>
                <ActionButton busy={busy === "topic"} icon={CheckCircle2} onClick={() => patchTopic({ resolve_reports: true }, "Signalements marqués comme traités.")}>
                  Tout marquer comme traité
                </ActionButton>
              </div>
              <ul className="mt-3 space-y-2">
                {openReports.map((r) => (
                  <li key={r.id} className="text-[13px] rounded-xl bg-[#FAF9F6] px-3.5 py-2.5">
                    <span className="font-semibold text-foreground">{r.reply_id ? "Réponse" : "Sujet"}</span>
                    <span className="text-[#6B746E]"> · signalé par {r.reporter?.pseudo || r.reporter?.name || "un membre"} · {formatDateTime(r.created_at)}</span>
                    {r.reason && <p className="mt-1 text-[#3F4A43]">« {r.reason} »</p>}
                  </li>
                ))}
              </ul>
              {topicReports.length > 0 && <p className="mt-3 text-[12px] text-[#6B746E]">Masquer le sujet traite automatiquement ses signalements.</p>}
            </section>
          )}

          {/* Réponses */}
          <section className="mt-6">
            <h2 className="text-[15px] font-bold text-foreground mb-3">{replies.length} réponse{replies.length > 1 ? "s" : ""}</h2>
            {replies.length === 0 ? (
              <p className="text-[13px] text-[#56615A] bg-white rounded-2xl border border-border px-5 py-6 text-center">Aucune réponse pour l&apos;instant.</p>
            ) : (
              <ol className="space-y-2.5">
                {replies.map((r) => (
                  <li key={r.id} className={cn("bg-white rounded-2xl border px-5 py-4",
                    r.open_reports > 0 ? "border-[#B42318]/30" : r.status === "hidden" ? "border-dashed border-[#8A938C]" : "border-border")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px]"><AuthorName author={r.author} isStaff={r.is_staff} /> <span className="text-[#6B746E]">· {formatDateTime(r.created_at)}</span></p>
                      <div className="flex items-center gap-1.5">
                        {r.status === "hidden" && <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-muted text-[11px] font-semibold text-[#56615A]"><EyeOff className="w-3 h-3" /> Masquée</span>}
                        {r.open_reports > 0 && <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md bg-[#B42318]/10 text-[11px] font-semibold text-[#B42318]"><Flag className="w-3 h-3" /> {r.open_reports}</span>}
                      </div>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#2E3A33] whitespace-pre-wrap break-words">{r.body}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <ActionButton small busy={busy === r.id} icon={r.status === "hidden" ? Eye : EyeOff}
                        onClick={() => patchReply(r, { status: r.status === "hidden" ? "visible" : "hidden" }, r.status === "hidden" ? "Réponse de nouveau visible." : "Réponse masquée.")}>
                        {r.status === "hidden" ? "Réafficher" : "Masquer"}
                      </ActionButton>
                      {r.open_reports > 0 && (
                        <ActionButton small busy={busy === r.id} icon={CheckCircle2} onClick={() => patchReply(r, { resolve_reports: true }, "Signalement traité, réponse conservée.")}>
                          Conserver
                        </ActionButton>
                      )}
                      <ActionButton small busy={busy === r.id} icon={Trash2} tone="danger" onClick={() => setConfirm({ kind: "reply", reply: r })}>Supprimer</ActionButton>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Réponse de l'équipe */}
          <form onSubmit={sendReply} className="mt-6 bg-white rounded-2xl border border-border p-5">
            <label htmlFor="staff-reply" className="block text-[14px] font-bold text-foreground">Répondre au nom de l&apos;équipe</label>
            <p className="text-[12px] text-[#6B746E] mb-2">Signé « Équipe Garden of Alliance ». Possible même sur un sujet fermé.</p>
            <textarea id="staff-reply" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={FORUM_LIMITS.replyMax}
              placeholder="Votre réponse…" className="w-full bg-white border border-border rounded-xl text-[13.5px] px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y" />
            <div className="mt-3 flex justify-end">
              <button type="submit" disabled={!draft.trim() || busy === "reply"}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-50">
                {busy === "reply" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publier la réponse
              </button>
            </div>
          </form>

          {topic.status === "visible" && (
            <a href={`/dashboard/forum/${topic.id}`} target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Voir côté membres (nécessite un compte membre)
            </a>
          )}
        </>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "topic" ? "Supprimer ce sujet ?" : "Supprimer cette réponse ?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "topic"
                ? "Le sujet et toutes ses réponses seront définitivement supprimés. Pour le retirer sans le perdre, masquez-le plutôt."
                : "La réponse sera définitivement supprimée. Pour la retirer sans la perdre, masquez-la plutôt."}
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

function ActionButton({ children, icon: Icon, onClick, busy, tone, small }: {
  children: React.ReactNode; icon: typeof Pin; onClick: () => void; busy?: boolean; tone?: "danger"; small?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors disabled:opacity-50",
        small ? "h-8 px-2.5 text-[12px]" : "h-9 px-3 text-[13px]",
        tone === "danger" ? "border-[#B42318]/25 text-[#B42318] hover:bg-[#B42318]/5" : "border-border text-foreground hover:bg-muted"
      )}>
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}
