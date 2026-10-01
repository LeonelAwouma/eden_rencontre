"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessagesSquare, MessageCircle, Flag, EyeOff, Plus, Search, X, Pin, Lock, ChevronLeft, ChevronRight,
  GraduationCap, Loader2, Send, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FORUM_CATEGORIES, FORUM_LIMITS } from "@/lib/forum-shared";
import { ADMIN_FORMATION_PATH } from "@/lib/formation/paths";
import {
  AuthorName, LESSON_OPTIONS, categoryLabel, formatDateTime, lessonLabel, type AdminForumAuthor,
} from "@/components/admin/forum/forum-admin-shared";

interface AdminTopic {
  id: string; category: string; lesson_slug: string | null; title: string; body: string;
  status: "visible" | "hidden"; is_pinned: boolean; is_locked: boolean; is_staff: boolean;
  reply_count: number; last_activity_at: string; created_at: string; open_reports: number;
  author: AdminForumAuthor | null;
}

const FILTERS = [
  { value: "all", label: "Tous les sujets" },
  { value: "reported", label: "Signalés" },
  { value: "hidden", label: "Masqués" },
  { value: "pinned", label: "Épinglés" },
  { value: "locked", label: "Fermés" },
];

const selectClass =
  "h-10 pl-3 pr-8 bg-white border border-border rounded-xl text-[13px] font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer";

export default function AdminForumPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [stats, setStats] = useState({ topics: 0, replies: 0, reported: 0, hidden: 0 });
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter, page: String(page), limit: "25" });
      if (category !== "all") params.set("category", category);
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/admin/forum?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Impossible de charger le forum."); return; }
      setError(null);
      setTopics(data.topics || []);
      setStats(data.stats);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("Impossible de charger le forum.");
    } finally {
      setLoading(false);
    }
  }, [filter, category, debounced, page]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  const filtersActive = filter !== "all" || category !== "all" || !!debounced;

  return (
    <div className="max-w-6xl">
      {/* En-tête : un seul CTA */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-5">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">Forum</h1>
          <p className="text-sm text-[#56615A] mt-1 max-w-2xl">
            L&apos;espace d&apos;échange de tous les membres autour des leçons de l&apos;
            <Link href={ADMIN_FORMATION_PATH} className="font-semibold text-primary hover:underline">Académie du mariage</Link>.
            Animez les discussions et modérez les messages signalés.
          </p>
        </div>
        <button onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#3A5A38] transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Publier au nom de l&apos;équipe
        </button>
      </div>

      {/* Statistiques compactes, monochromes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Sujets" value={stats.topics} icon={MessagesSquare} active={filter === "all"} onClick={() => { setFilter("all"); setPage(1); }} />
        <StatTile label="Réponses" value={stats.replies} icon={MessageCircle} />
        <StatTile label="Signalés à traiter" value={stats.reported} icon={Flag} active={filter === "reported"} onClick={() => { setFilter("reported"); setPage(1); }} highlight={stats.reported > 0} />
        <StatTile label="Masqués" value={stats.hidden} icon={EyeOff} active={filter === "hidden"} onClick={() => { setFilter("hidden"); setPage(1); }} />
      </div>

      {composing && <StaffTopicForm onCancel={() => setComposing(false)} onCreated={(id) => router.push(`/admin/forum/${id}`)} />}

      {/* Filtres sur une seule ligne */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 mb-5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" />
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher dans les titres et les messages…" aria-label="Rechercher un sujet"
            className="w-full h-10 pl-10 pr-9 bg-white border border-border rounded-xl text-[13px] font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#6B746E] hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select aria-label="Filtre" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className={selectClass}>
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select aria-label="Thème" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={cn(selectClass, "max-w-[240px]")}>
            <option value="all">Tous les thèmes</option>
            {FORUM_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{categoryLabel(c.key)}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[13px] font-medium text-[#B42318]">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-border divide-y divide-border/60 animate-pulse" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-4 space-y-2"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-1/4" /></div>
          ))}
        </div>
      ) : topics.length === 0 && !error ? (
        <div className="bg-white rounded-2xl border border-border py-14 px-6 text-center">
          <MessagesSquare className="w-8 h-8 text-primary/70 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-foreground">
            {filtersActive ? "Aucun sujet ne correspond" : "Le forum attend sa première discussion"}
          </p>
          <p className="text-[13px] text-[#56615A] mt-1 max-w-md mx-auto">
            {filtersActive
              ? filter === "reported" ? "Aucun message signalé en attente : tout est en ordre." : "Essayez un autre mot-clé ou un autre thème."
              : "Lancez la conversation : une question sur une leçon de l'Académie invite les membres à partager."}
          </p>
          {!filtersActive && (
            <button onClick={() => setComposing(true)} className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted">
              <Plus className="w-4 h-4 text-primary" /> Ouvrir un sujet
            </button>
          )}
        </div>
      ) : topics.length > 0 && (
        <ul className="bg-white rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
          {topics.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/forum/${t.id}`} className={cn("block px-5 py-4 hover:bg-[#FAF9F6] transition-colors", t.status === "hidden" && "opacity-70")}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {t.is_pinned && <Badge icon={Pin}>Épinglé</Badge>}
                      {t.is_locked && <Badge icon={Lock}>Fermé</Badge>}
                      {t.status === "hidden" && <Badge icon={EyeOff}>Masqué</Badge>}
                      {t.open_reports > 0 && <Badge icon={Flag} tone="alert">{t.open_reports} signalement{t.open_reports > 1 ? "s" : ""}</Badge>}
                      <span className="text-[12px] font-semibold text-primary">{categoryLabel(t.category)}</span>
                      {t.lesson_slug && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[#56615A]"><GraduationCap className="w-3.5 h-3.5" /> {lessonLabel(t.lesson_slug)?.split(" — ")[0]}</span>
                      )}
                    </div>
                    <p className="text-[15px] font-semibold text-foreground leading-snug truncate">{t.title}</p>
                    <p className="text-[12.5px] text-[#6B746E] mt-0.5 truncate">
                      {t.is_staff && <ShieldCheck className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-primary" />}
                      <AuthorName author={t.author} isStaff={t.is_staff} /> · {formatDateTime(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground tabular-nums"><MessageCircle className="w-3.5 h-3.5 text-primary" /> {t.reply_count}</p>
                    <p className="text-[11.5px] text-[#6B746E] hidden sm:block">Activité : {formatDateTime(t.last_activity_at)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-5">
          <p className="text-[12px] text-[#6B746E] font-medium">{total} sujet{total > 1 ? "s" : ""}</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Page précédente"
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[12px] font-semibold text-[#56615A] px-2 tabular-nums">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Page suivante"
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, onClick, active, highlight }: {
  label: string; value: number; icon: typeof MessagesSquare; onClick?: () => void; active?: boolean; highlight?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#56615A]">{label}</span>
        <Icon className={cn("w-4 h-4", active || highlight ? "text-primary" : "text-[#8A938C]")} />
      </div>
      <p className="mt-1.5 text-[28px] leading-none font-bold text-foreground tabular-nums tracking-tight">{value.toLocaleString("fr-FR")}</p>
    </>
  );
  const cls = cn("text-left bg-white rounded-2xl border px-4 py-3.5 transition-all", active ? "border-primary/50 ring-1 ring-primary/20" : "border-border");
  return onClick
    ? <button onClick={onClick} aria-pressed={active} className={cn(cls, "hover:border-primary/40")}>{content}</button>
    : <div className={cls}>{content}</div>;
}

function Badge({ icon: Icon, children, tone }: { icon: typeof Pin; children: React.ReactNode; tone?: "alert" }) {
  return (
    <span className={cn("inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[11px] font-semibold",
      tone === "alert" ? "bg-[#B42318]/10 text-[#B42318]" : "bg-primary/10 text-primary")}>
      <Icon className="w-3 h-3" /> {children}
    </span>
  );
}

function StaffTopicForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [lesson, setLesson] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = title.trim().length >= FORUM_LIMITS.titleMin && body.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/forum", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, lesson_slug: lesson || null, is_pinned: pinned }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Le sujet n'a pas pu être publié."); return; }
      onCreated(data.id);
    } catch {
      setError("Le sujet n'a pas pu être publié.");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full bg-white border border-border rounded-xl text-[13px] px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";
  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-primary/30 p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-foreground">Nouveau sujet de l&apos;équipe</h2>
          <p className="text-[12px] text-[#6B746E]">Signé « Équipe Garden of Alliance » côté membres.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Fermer" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B746E] hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={FORUM_LIMITS.titleMax} placeholder="Titre du sujet" aria-label="Titre" className={cn(field, "h-10")} autoFocus />
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Thème" className={cn(field, "h-10")}>
          {FORUM_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{categoryLabel(c.key)}</option>)}
        </select>
        <select value={lesson} onChange={(e) => setLesson(e.target.value)} aria-label="Leçon" className={cn(field, "h-10")}>
          <option value="">Aucune leçon en particulier</option>
          {LESSON_OPTIONS.map((l) => <option key={l.slug} value={l.slug}>{l.label}</option>)}
        </select>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={FORUM_LIMITS.bodyMax} rows={5}
        placeholder="Votre message aux membres…" aria-label="Message" className={cn(field, "py-2.5 resize-y")} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-[#486B46] w-4 h-4" />
          Épingler en haut du forum
        </label>
        <div className="flex items-center gap-2">
          {error && <p role="alert" className="text-[12.5px] text-[#B42318] font-medium">{error}</p>}
          <button type="submit" disabled={!valid || saving}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publier
          </button>
        </div>
      </div>
    </form>
  );
}
