"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessagesSquare, Plus, Search, X, Pin, Lock, MessageCircle, Loader2, GraduationCap, ArrowRight, Send,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useFormationLocale } from "@/lib/formation/ui";
import { SageLeaf } from "@/components/garden/botanical-svgs";
import { ForumHeader, CategoryChip, AuthorLine } from "@/components/forum/forum-ui";
import {
  FORUM_CATEGORIES, FORUM_LIMITS, FORUM_UNAVAILABLE, listTopics, createTopic, type ForumTopic,
} from "@/lib/forum";

const PAGE_SIZE = 20;

export default function ForumPage() {
  return (
    <Suspense fallback={null}>
      <ForumIndex />
    </Suspense>
  );
}

function ForumIndex() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { find } = useFormationLocale();

  // Filtres dans l'URL : une leçon peut renvoyer vers « ses » discussions
  // (/dashboard/forum?lecon=1-3), et le lien se partage.
  const category = params.get("categorie");
  const lesson = params.get("lecon");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const setFilter = (key: "categorie" | "lecon", value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `/dashboard/forum?${qs}` : "/dashboard/forum", { scroll: false });
  };

  const load = useCallback(async (offset: number) => {
    const res = await listTopics({ category, lesson, search: debounced, offset, limit: PAGE_SIZE });
    if (res.error) { setError(res.error); return; }
    setError(null);
    setTopics((prev) => (offset === 0 ? res.data!.topics : [...prev, ...res.data!.topics]));
    setHasMore(res.data!.hasMore);
  }, [category, lesson, debounced]);

  useEffect(() => {
    setLoading(true);
    load(0).finally(() => setLoading(false));
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    await load(topics.length);
    setLoadingMore(false);
  };

  const lessonInfo = lesson ? find(lesson) : null;
  const filtered = !!(category || lesson || debounced);

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      <ForumHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Présentation */}
        <section className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <span aria-hidden className="absolute -top-4 right-0 w-24 h-24 text-primary opacity-[0.10] pointer-events-none hidden sm:block">
            <SageLeaf className="w-full h-full" />
          </span>
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> {t("forum.eyebrow")}
            </p>
            <h1 className="mt-2 font-headline text-[38px] sm:text-[48px] font-bold leading-[1.05] tracking-tight">{t("forum.title")}</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-[#3F4A43]">{t("forum.intro")}</p>
          </div>
          <button onClick={() => setComposing(true)}
            className="relative inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-white text-[15px] font-bold hover:bg-primary/90 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> {t("forum.newTopic")}
          </button>
        </section>

        {composing && (
          <NewTopicForm
            defaultCategory={category}
            defaultLesson={lesson}
            onCancel={() => setComposing(false)}
            onCreated={(id) => router.push(`/dashboard/forum/${id}`)}
          />
        )}

        {/* Thématiques */}
        <nav aria-label={t("forum.themes")} className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
          <div className="flex gap-2 pb-1 w-max sm:w-auto sm:flex-wrap">
            <ThemeButton active={!category} onClick={() => setFilter("categorie", null)} label={t("forum.allThemes")} />
            {FORUM_CATEGORIES.map((c) => (
              <ThemeButton key={c.key} active={category === c.key} onClick={() => setFilter("categorie", c.key)}
                label={t(c.labelKey)} icon={c.icon} />
            ))}
          </div>
        </nav>

        {/* Recherche + filtre leçon */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("forum.searchPlaceholder")} aria-label={t("forum.searchPlaceholder")}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </div>
          {lessonInfo && (
            <span className="inline-flex items-center gap-2 h-11 pl-3.5 pr-2 rounded-xl border border-primary/30 bg-primary/5 text-[13px] font-semibold text-primary min-w-0">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("forum.lessonFilter", { number: lessonInfo.lesson.number })}</span>
              <button onClick={() => setFilter("lecon", null)} aria-label={t("forum.clearFilter")}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10"><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
        </div>

        {/* Sujets */}
        <section className="mt-6" aria-live="polite">
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[120px] rounded-2xl border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
              <MessagesSquare className="w-8 h-8 text-primary/60 mx-auto mb-3" />
              <p className="text-[15px] font-semibold">{error === FORUM_UNAVAILABLE ? t("forum.unavailableTitle") : t("forum.loadError")}</p>
              {error === FORUM_UNAVAILABLE && <p className="mt-1 text-[13.5px] text-[#56615A]">{t("forum.unavailableDesc")}</p>}
            </div>
          ) : topics.length === 0 ? (
            <div className="relative rounded-3xl border border-border bg-card px-6 py-14 text-center overflow-hidden">
              <MessagesSquare className="w-9 h-9 text-primary mx-auto mb-4" />
              <p className="font-headline text-[22px] font-bold">{filtered ? t("forum.emptyFilteredTitle") : t("forum.emptyTitle")}</p>
              <p className="mt-2 text-[14.5px] text-[#56615A] max-w-md mx-auto">{filtered ? t("forum.emptyFilteredDesc") : t("forum.emptyDesc")}</p>
              <button onClick={() => setComposing(true)}
                className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-primary text-white text-[14px] font-bold hover:bg-primary/90">
                <Plus className="w-4 h-4" /> {t("forum.startDiscussion")}
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
              </ul>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button onClick={loadMore} disabled={loadingMore}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border bg-card text-[14px] font-semibold hover:border-primary/40 disabled:opacity-60">
                    {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} {t("forum.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Lien vers l'Académie */}
        <Link href="/dashboard/academie"
          className="mt-12 group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary/40 transition-colors">
          <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><GraduationCap className="w-5 h-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold group-hover:text-primary">{t("dashboard.academyTitle")}</span>
            <span className="block text-[13px] text-[#56615A]">{t("forum.academyLinkDesc")}</span>
          </span>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
        </Link>
      </main>
    </div>
  );
}

function ThemeButton({ active, onClick, label, icon: Icon }: {
  active: boolean; onClick: () => void; label: string; icon?: typeof MessagesSquare;
}) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-colors",
        active ? "bg-primary text-white border-primary" : "bg-card text-[#3F4A43] border-border hover:border-primary/40"
      )}>
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </button>
  );
}

function TopicCard({ topic }: { topic: ForumTopic }) {
  const { t } = useI18n();
  const { find } = useFormationLocale();
  const lesson = topic.lesson_slug ? find(topic.lesson_slug)?.lesson : null;
  return (
    <li>
      <Link href={`/dashboard/forum/${topic.id}`}
        className={cn(
          "group block rounded-2xl border bg-card px-5 py-4 hover:shadow-[0_8px_28px_rgba(38,70,52,0.08)] hover:border-primary/40 transition-all",
          topic.is_pinned ? "border-primary/30" : "border-border"
        )}>
        <span className="flex flex-wrap items-center gap-1.5">
          {topic.is_pinned && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-primary text-white text-[11px] font-bold"><Pin className="w-3 h-3" /> {t("forum.pinned")}</span>
          )}
          <CategoryChip category={topic.category} />
          {lesson && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full border border-border text-[11.5px] font-semibold text-[#3F4A43]">
              <GraduationCap className="w-3.5 h-3.5 text-primary" /> {t("forum.lessonShort", { number: lesson.number })}
            </span>
          )}
          {topic.is_locked && <Lock className="w-3.5 h-3.5 text-[#6B746E]" aria-label={t("forum.locked")} />}
        </span>
        <span className="mt-2 block font-headline text-[19px] sm:text-[20px] font-bold leading-snug group-hover:text-primary transition-colors">{topic.title}</span>
        <span className="mt-1 block text-[14px] text-[#56615A] line-clamp-2">{topic.body}</span>
        <span className="mt-3 flex items-center justify-between gap-3">
          <AuthorLine author={topic.author} isStaff={topic.is_staff} date={topic.created_at} size="sm" />
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3F4A43] shrink-0">
            <MessageCircle className="w-4 h-4 text-primary" /> {topic.reply_count}
            <span className="hidden sm:inline font-normal text-[#6B746E]">{t(topic.reply_count > 1 ? "forum.repliesMany" : "forum.repliesOne")}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function NewTopicForm({ defaultCategory, defaultLesson, onCancel, onCreated }: {
  defaultCategory: string | null; defaultLesson: string | null; onCancel: () => void; onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  const { allLessons } = useFormationLocale();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(defaultCategory || (defaultLesson ? "batir-sur-le-roc" : "general"));
  const [lesson, setLesson] = useState(defaultLesson || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= FORUM_LIMITS.titleMin && body.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    const res = await createTopic({ category, lesson_slug: lesson || null, title, body });
    setSaving(false);
    if (res.error) {
      setError(res.error === FORUM_UNAVAILABLE ? t("forum.unavailableTitle") : t("forum.publishError"));
      return;
    }
    onCreated(res.data!);
  };

  const field = "w-full rounded-xl border border-border bg-background px-3.5 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 space-y-4 shadow-[0_8px_28px_rgba(38,70,52,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-[20px] font-bold">{t("forum.newTopic")}</h2>
        <button type="button" onClick={onCancel} aria-label={t("forum.cancel")} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B746E] hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div>
        <label htmlFor="forum-title" className="block text-[13px] font-semibold mb-1.5">{t("forum.fieldTitle")}</label>
        <input id="forum-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={FORUM_LIMITS.titleMax}
          placeholder={t("forum.fieldTitlePlaceholder")} className={cn(field, "h-11")} autoFocus />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="forum-category" className="block text-[13px] font-semibold mb-1.5">{t("forum.fieldTheme")}</label>
          <select id="forum-category" value={category} onChange={(e) => setCategory(e.target.value)} className={cn(field, "h-11")}>
            {FORUM_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{t(c.labelKey)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="forum-lesson" className="block text-[13px] font-semibold mb-1.5">{t("forum.fieldLesson")}</label>
          <select id="forum-lesson" value={lesson} onChange={(e) => setLesson(e.target.value)} className={cn(field, "h-11")}>
            <option value="">{t("forum.noLesson")}</option>
            {allLessons.map(({ lesson: l }) => (
              <option key={l.slug} value={l.slug}>{t("forum.lessonOption", { number: l.number, title: l.title })}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="forum-body" className="block text-[13px] font-semibold mb-1.5">{t("forum.fieldBody")}</label>
        <textarea id="forum-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={FORUM_LIMITS.bodyMax} rows={6}
          placeholder={t("forum.fieldBodyPlaceholder")} className={cn(field, "py-3 resize-y min-h-[140px]")} />
        <p className="mt-1.5 text-[12px] text-[#6B746E]">{t("forum.charter")}</p>
      </div>
      {error && <p role="alert" className="text-[13px] font-medium text-destructive">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-11 px-5 rounded-full text-[14px] font-semibold text-[#3F4A43] hover:bg-muted">{t("forum.cancel")}</button>
        <button type="submit" disabled={!valid || saving}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-primary text-white text-[14px] font-bold hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("forum.publish")}
        </button>
      </div>
    </form>
  );
}
