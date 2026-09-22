"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Library, Plus, Video, Headphones, BookOpen, FileText, File, Compass, MessageSquareQuote,
  Search, Eye, Trash2, Edit3, Star, ExternalLink, ChevronLeft, ChevronRight, Archive, Send,
  X, FolderTree, GraduationCap, LayoutGrid, List, MoreHorizontal, Link2, RotateCcw, Undo2,
  CheckCircle2, PencilLine, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SageLeaf, DelicateFlower } from "@/components/garden/botanical-svgs";
import { RESOURCE_TYPE_CONFIG, STATUS_CONFIG, type ResourceType, type ResourceStatus } from "@/lib/mediatheque";

interface ResourceItem {
  id: string; title: string; slug: string; type: ResourceType; status: ResourceStatus;
  author: string | null; thumbnail_url: string | null; view_count: number; featured: boolean;
  duration: string | null; created_at: string; published_at: string | null; updated_at: string | null;
  category: { id: string; name: string; slug: string; icon: string | null; color: string } | null;
  learning_paths: { id: string; title: string; step: number; total: number }[];
}
interface CategoryOption { id: string; name: string; }
/** Parcours (pilier) et ses leçons, dans l'ordre. */
interface PathWithSteps {
  id: string; title: string; slug: string; description: string; status: string;
  cover_url: string | null; estimated_duration: string | null;
  steps: (Omit<ResourceItem, "learning_paths"> & { step: number; is_required: boolean })[];
}

const TYPE_ICONS: Record<ResourceType, typeof Video> = {
  video: Video, audio: Headphones, book: BookOpen, pdf: File, article: FileText,
  guide: Compass, testimony: MessageSquareQuote, external: Link2,
};

// Les formats principaux sont toujours proposés ; les autres n'apparaissent
// que lorsqu'ils contiennent au moins une ressource.
const TYPE_TABS: { value: "all" | ResourceType; label: string; always: boolean }[] = [
  { value: "all", label: "Toutes", always: true },
  { value: "video", label: "Vidéos", always: true },
  { value: "audio", label: "Audio", always: true },
  { value: "book", label: "Livres", always: true },
  { value: "pdf", label: "PDF", always: true },
  { value: "article", label: "Articles", always: true },
  { value: "guide", label: "Guides", always: true },
  { value: "testimony", label: "Témoignages", always: false },
  { value: "external", label: "Liens", always: false },
];

const STATUS_DOT: Record<ResourceStatus, string> = {
  published: "bg-primary",
  draft: "bg-transparent border-[1.5px] border-[#8A938C]",
  archived: "bg-[#B8B2A7]",
};

const SORTS = [
  { value: "recent", label: "Plus récentes" },
  { value: "updated", label: "Dernières modifiées" },
  { value: "views", label: "Plus consultées" },
  { value: "title", label: "Titre (A → Z)" },
];

const PAGE_SIZE = 24;
const VIEW_KEY = "eden-admin-mediatheque-view";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

const selectClass =
  "h-10 pl-3 pr-8 bg-white border border-border rounded-xl text-[13px] font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer";

export default function AdminMediathequePage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ResourceItem | null>(null);
  const [paths, setPaths] = useState<PathWithSteps[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sans filtre ni recherche, les ressources rangées dans un parcours s'affichent
  // sous leur parcours ; la grille ne montre que les autres.
  const grouped = typeFilter === "all" && statusFilter === "all" && categoryFilter === "all" && !debouncedSearch;

  useEffect(() => {
    try { const v = localStorage.getItem(VIEW_KEY); if (v === "grid" || v === "list") setView(v); } catch { /* stockage indisponible */ }
    fetch("/api/admin/mediatheque/categories").then((r) => r.json())
      .then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const changeView = (v: "grid" | "list") => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* stockage indisponible */ }
  };

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("sort", sort);
      if (grouped) params.set("standalone", "1");
      params.set("page", page.toString()); params.set("limit", PAGE_SIZE.toString());
      const res = await fetch(`/api/admin/mediatheque/resources?${params}`);
      const data = await res.json();
      if (res.ok) {
        setResources(data.resources || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
        setLastUpdatedAt(data.last_updated_at || null);
      } else setError(data.error || "Impossible de charger les ressources.");
    } catch (e) { console.error(e); setError("Impossible de charger les ressources."); }
    finally { setLoading(false); }
  }, [typeFilter, statusFilter, categoryFilter, debouncedSearch, sort, page, grouped]);

  const fetchPaths = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mediatheque/learning-paths?steps=1");
      const data = await res.json();
      if (res.ok) setPaths((data.learning_paths || []).filter((p: PathWithSteps) => p.steps?.length > 0));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);
  useEffect(() => { fetchPaths(); }, [fetchPaths]);
  const refresh = () => { fetchResources(); fetchPaths(); };

  const handleDelete = async (r: ResourceItem) => {
    setConfirmDelete(null); setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/mediatheque/resources/${r.id}`, { method: "DELETE" });
      if (res.ok) refresh(); else setError("La suppression a échoué.");
    } catch (e) { console.error(e); setError("La suppression a échoué."); }
    finally { setBusyId(null); }
  };

  const handleStatusChange = async (id: string, newStatus: ResourceStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/mediatheque/resources/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) refresh(); else setError("La mise à jour du statut a échoué.");
    } catch (e) { console.error(e); setError("La mise à jour du statut a échoué."); }
    finally { setBusyId(null); }
  };

  const filtersActive = typeFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || !!debouncedSearch;
  const resetFilters = () => {
    setTypeFilter("all"); setStatusFilter("all"); setCategoryFilter("all"); setSearch(""); setDebouncedSearch(""); setPage(1);
  };
  const libraryEmpty = !loading && (stats.all || 0) === 0 && !filtersActive;
  const firstIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(page * PAGE_SIZE, total);

  const actions = { busyId, onStatus: handleStatusChange, onDelete: setConfirmDelete };

  return (
    <>
      {/* En-tête : un seul CTA principal, les écrans annexes en actions secondaires */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-5">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">Médiathèque</h1>
          <p className="text-sm text-[#56615A] mt-1">Gérez les ressources de préparation au mariage</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/mediatheque/categories"
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-white text-[13px] font-semibold text-foreground hover:bg-muted transition-colors">
            <FolderTree className="w-4 h-4 text-primary" /> Catégories
          </Link>
          <Link href="/admin/mediatheque/learning-paths"
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-white text-[13px] font-semibold text-foreground hover:bg-muted transition-colors">
            <GraduationCap className="w-4 h-4 text-primary" /> Parcours
          </Link>
          <Link href="/admin/mediatheque/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#3A5A38] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Ajouter une ressource
          </Link>
        </div>
      </div>

      {/* Statistiques compactes, monochromes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
        <StatTile label="Ressources" value={stats.all || 0} icon={Library} onClick={() => { setStatusFilter("all"); setPage(1); }} active={statusFilter === "all"} />
        <StatTile label="Publiées" value={stats.published || 0} icon={CheckCircle2} onClick={() => { setStatusFilter("published"); setPage(1); }} active={statusFilter === "published"} />
        <StatTile label="Brouillons" value={stats.draft || 0} icon={PencilLine} onClick={() => { setStatusFilter("draft"); setPage(1); }} active={statusFilter === "draft"} />
        <StatTile label="Archivées" value={stats.archived || 0} icon={Archive} onClick={() => { setStatusFilter("archived"); setPage(1); }} active={statusFilter === "archived"} />
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-[#6B746E] mb-6">
        <Clock className="w-3.5 h-3.5" />
        Dernière mise à jour : {lastUpdatedAt ? formatDate(lastUpdatedAt) : "aucune"}
      </p>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[13px] font-medium text-[#B42318]">
          {error}
          <button onClick={() => setError(null)} aria-label="Fermer" className="p-1 rounded-md hover:bg-[#B42318]/10"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {libraryEmpty ? (
        <LibraryEmptyState />
      ) : (
        <>
          {/* Formats, avec compteurs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3" role="tablist" aria-label="Format">
            {TYPE_TABS.filter((t) => t.always || (stats[t.value] || 0) > 0).map((t) => {
              const count = t.value === "all" ? stats.all || 0 : stats[t.value] || 0;
              const active = typeFilter === t.value;
              return (
                <button key={t.value} role="tab" aria-selected={active}
                  onClick={() => { setTypeFilter(t.value); setPage(1); }}
                  className={cn(
                    "flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors",
                    active ? "bg-primary text-white border-primary" : "bg-white text-[#3F4A43] border-border hover:border-primary/40"
                  )}>
                  {t.label}
                  <span className={cn("text-[11px] tabular-nums px-1.5 rounded-full",
                    active ? "bg-white/20 text-white" : "bg-muted text-[#6B746E]")}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Recherche + filtres + vue sur une seule ligne */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 mb-5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" />
              <input type="search" placeholder="Rechercher par titre, description ou auteur…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Rechercher une ressource"
                className="w-full h-10 pl-10 pr-9 bg-white border border-border rounded-xl text-[13px] font-medium text-foreground placeholder:text-[#7A847D] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Effacer la recherche"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#6B746E] hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select aria-label="Statut" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectClass}>
                <option value="all">Tous les statuts</option>
                <option value="published">Publiées ({stats.published || 0})</option>
                <option value="draft">Brouillons ({stats.draft || 0})</option>
                <option value="archived">Archivées ({stats.archived || 0})</option>
              </select>
              <select aria-label="Catégorie" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className={cn(selectClass, "max-w-[200px]")}>
                <option value="all">Toutes les catégories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select aria-label="Trier" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className={selectClass}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex items-center gap-0.5 p-0.5 bg-white border border-border rounded-xl" role="group" aria-label="Affichage">
                {([["grid", LayoutGrid, "Grille"], ["list", List, "Liste"]] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => changeView(v)} aria-label={label} aria-pressed={view === v} title={label}
                    className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors",
                      view === v ? "bg-primary/10 text-primary" : "text-[#6B746E] hover:text-foreground")}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parcours : chaque pilier regroupe ses leçons sous une même image */}
          {grouped && paths.length > 0 && (
            <div className="space-y-4 mb-8">
              {paths.map((path) => <PathBlock key={path.id} path={path} {...actions} />)}
            </div>
          )}

          {grouped && paths.length > 0 && (
            <h2 className="text-[15px] font-bold text-foreground mb-3">Autres ressources</h2>
          )}

          {loading ? (
            view === "grid" ? <GridSkeleton /> : <ListSkeleton />
          ) : resources.length === 0 && grouped && paths.length > 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border py-8 px-6 text-center">
              <p className="text-[14px] text-[#56615A]">Toutes les ressources sont rangées dans un parcours.</p>
              <Link href="/admin/mediatheque/new" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
                <Plus className="w-4 h-4" /> Ajouter une ressource
              </Link>
            </div>
          ) : resources.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border py-14 px-6 text-center">
              <Search className="w-6 h-6 text-[#6B746E] mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-foreground">Aucune ressource ne correspond</p>
              <p className="text-[13px] text-[#56615A] mt-1">Essayez un autre mot-clé ou élargissez vos filtres.</p>
              {filtersActive && (
                <button onClick={resetFilters}
                  className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-[13px] font-semibold text-foreground hover:bg-muted">
                  <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {resources.map((r) => <ResourceCard key={r.id} r={r} {...actions} />)}
            </div>
          ) : (
            <ResourceTable resources={resources} {...actions} />
          )}

          {!loading && total > 0 && (
            <div className="flex items-center justify-between gap-3 mt-6">
              <p className="text-[12px] text-[#6B746E] font-medium">
                {firstIndex}–{lastIndex} sur {total} ressource{total > 1 ? "s" : ""}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Page précédente"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-[12px] font-semibold text-[#56615A] px-2 tabular-nums">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Page suivante"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ressource ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && <>« {confirmDelete.title} » sera définitivement supprimée, ainsi que sa place dans les parcours. </>}
              Pour la retirer sans la perdre, archivez-la plutôt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-[#B42318] hover:bg-[#912018] text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ─────────────────────────── Sous-composants ─────────────────────────── */

function StatTile({ label, value, icon: Icon, onClick, active }: {
  label: string; value: number; icon: typeof Library; onClick: () => void; active: boolean;
}) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={cn(
        "text-left bg-white rounded-2xl border px-4 py-3.5 transition-all hover:border-primary/40",
        active ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
      )}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#56615A]">{label}</span>
        <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-[#8A938C]")} />
      </div>
      <p className="mt-1.5 text-[28px] leading-none font-bold text-foreground tabular-nums tracking-tight">
        {value.toLocaleString("fr-FR")}
      </p>
    </button>
  );
}

/** Un parcours (pilier) : son image de couverture et ses leçons dans l'ordre. */
function PathBlock({ path, ...actions }: { path: PathWithSteps } & RowActions) {
  const published = path.steps.filter((s) => s.status === "published").length;
  return (
    <section className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative h-44 md:h-auto bg-primary/10">
          {path.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={path.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><GraduationCap className="w-10 h-10 text-primary/60" /></div>
          )}
        </div>
        <div className="p-5 sm:p-6 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                <GraduationCap className="w-3.5 h-3.5" /> Parcours · {path.steps.length} leçon{path.steps.length > 1 ? "s" : ""}
                {path.estimated_duration && <span className="text-[#6B746E] font-medium">· {path.estimated_duration}</span>}
              </p>
              <h2 className="mt-1 text-[18px] font-bold text-foreground leading-snug">{path.title}</h2>
              {path.description && <p className="mt-1 text-[13px] text-[#56615A] line-clamp-2 max-w-2xl">{path.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-[#56615A]">{published}/{path.steps.length} publiées</span>
              <Link href="/admin/mediatheque/learning-paths"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
                <Edit3 className="w-3.5 h-3.5" /> Gérer le parcours
              </Link>
            </div>
          </div>

          <ol className="mt-4 divide-y divide-border/70 border-t border-border/70">
            {path.steps.map((s) => {
              const r: ResourceItem = { ...s, learning_paths: [] };
              return (
                <li key={s.id} className={cn("flex items-center gap-3 py-2.5", actions.busyId === s.id && "opacity-60")}>
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center shrink-0 tabular-nums">{s.step}</span>
                  <Thumbnail r={r} className="w-14 h-10 rounded-md shrink-0" iconSize="w-4 h-4" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/mediatheque/${s.id}/edit`} className="block text-[14px] font-semibold text-foreground hover:text-primary truncate">{s.title}</Link>
                    <p className="text-[12px] text-[#6B746E] truncate">
                      {RESOURCE_TYPE_CONFIG[s.type]?.label || s.type}{s.duration ? ` · ${s.duration}` : ""}{!s.is_required ? " · facultative" : ""}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex"><StatusLabel status={s.status} /></span>
                  <ResourceMenu r={r} {...actions} />
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

type RowActions = {
  busyId: string | null;
  onStatus: (id: string, s: ResourceStatus) => void;
  onDelete: (r: ResourceItem) => void;
};

function TypeBadge({ type }: { type: ResourceType }) {
  const tc = RESOURCE_TYPE_CONFIG[type] || RESOURCE_TYPE_CONFIG.external;
  const Icon = TYPE_ICONS[type] || Link2;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold", tc.bgColor, tc.color)}>
      <Icon className="w-3 h-3" /> {tc.label}
    </span>
  );
}

function StatusLabel({ status }: { status: ResourceStatus }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#3F4A43]">
      <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[status] || STATUS_DOT.draft)} />
      {sc.label}
    </span>
  );
}

function ResourceMenu({ r, busyId, onStatus, onDelete }: { r: ResourceItem } & RowActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label={`Actions pour ${r.title}`} disabled={busyId === r.id}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56615A] hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/admin/mediatheque/${r.id}/edit`}><Edit3 className="w-4 h-4 mr-2" /> Modifier</Link>
        </DropdownMenuItem>
        {r.status === "published" && (
          <DropdownMenuItem asChild>
            <a href={`/mediatheque/${r.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" /> Voir sur le site</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {r.status !== "published" && (
          <DropdownMenuItem onSelect={() => onStatus(r.id, "published")}><Send className="w-4 h-4 mr-2" /> Publier</DropdownMenuItem>
        )}
        {r.status === "published" && (
          <DropdownMenuItem onSelect={() => onStatus(r.id, "draft")}><Undo2 className="w-4 h-4 mr-2" /> Repasser en brouillon</DropdownMenuItem>
        )}
        {r.status !== "archived" && (
          <DropdownMenuItem onSelect={() => onStatus(r.id, "archived")}><Archive className="w-4 h-4 mr-2" /> Archiver</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDelete(r)} className="text-[#B42318] focus:text-[#B42318] focus:bg-[#B42318]/10">
          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Thumbnail({ r, className, iconSize = "w-7 h-7" }: { r: ResourceItem; className?: string; iconSize?: string }) {
  const tc = RESOURCE_TYPE_CONFIG[r.type] || RESOURCE_TYPE_CONFIG.external;
  const Icon = TYPE_ICONS[r.type] || Link2;
  return (
    <div className={cn("relative overflow-hidden flex items-center justify-center", r.thumbnail_url ? "bg-muted" : tc.bgColor, className)}>
      {r.thumbnail_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        : <Icon className={cn(iconSize, tc.color, "opacity-70")} />}
    </div>
  );
}

function ResourceCard({ r, ...actions }: { r: ResourceItem } & RowActions) {
  const path = r.learning_paths[0];
  return (
    <article className={cn(
      "group bg-white rounded-2xl border border-border overflow-hidden flex flex-col transition-all hover:shadow-[0_6px_24px_rgba(72,107,70,0.10)] hover:border-primary/30",
      actions.busyId === r.id && "opacity-60"
    )}>
      <Link href={`/admin/mediatheque/${r.id}/edit`} tabIndex={-1} aria-hidden className="block relative">
        <Thumbnail r={r} className="aspect-[16/9]" />
        {r.featured && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-[11px] font-semibold text-[#8A5A00] shadow-sm">
            <Star className="w-3 h-3 fill-current" /> En vedette
          </span>
        )}
        {r.duration && (
          <span className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/60 text-[11px] font-semibold text-white tabular-nums">{r.duration}</span>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-0">
        <Link href={`/admin/mediatheque/${r.id}/edit`}
          className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
          {r.title}
        </Link>
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <TypeBadge type={r.type} />
          <span className="text-[12px] text-[#56615A] truncate">{r.category?.name || "Sans catégorie"}</span>
        </div>
        {path && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#56615A] min-w-0" title={r.learning_paths.map((p) => `${p.title} · étape ${p.step}/${p.total}`).join("\n")}>
            <GraduationCap className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{path.title}</span>
            <span className="shrink-0 text-[#6B746E]">· {path.step}/{path.total}</span>
            {r.learning_paths.length > 1 && <span className="shrink-0 text-[#6B746E]">+{r.learning_paths.length - 1}</span>}
          </p>
        )}
        <div className="mt-auto pt-3.5 flex items-center justify-between gap-2 border-t border-border/70">
          <div className="flex items-center gap-3 min-w-0">
            <StatusLabel status={r.status} />
            <span className="text-[11px] text-[#6B746E] truncate">{formatDate(r.published_at || r.created_at)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {r.view_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#6B746E] tabular-nums mr-1" title="Consultations">
                <Eye className="w-3.5 h-3.5" /> {r.view_count.toLocaleString("fr-FR")}
              </span>
            )}
            <ResourceMenu r={r} {...actions} />
          </div>
        </div>
      </div>
    </article>
  );
}

function ResourceTable({ resources, ...actions }: { resources: ResourceItem[] } & RowActions) {
  const th = "text-left text-[11px] font-bold text-[#6B746E] uppercase tracking-wider px-4 py-3";
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className={th}>Ressource</th>
              <th className={cn(th, "hidden md:table-cell")}>Format</th>
              <th className={cn(th, "hidden lg:table-cell")}>Catégorie / parcours</th>
              <th className={th}>Statut</th>
              <th className={cn(th, "hidden xl:table-cell text-right")}>Vues</th>
              <th className={cn(th, "hidden sm:table-cell")}>Date</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => {
              const path = r.learning_paths[0];
              return (
                <tr key={r.id} className={cn("border-b border-border/60 last:border-0 hover:bg-[#FAF9F6] transition-colors", actions.busyId === r.id && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Thumbnail r={r} className="w-14 h-10 rounded-lg shrink-0" iconSize="w-4 h-4" />
                      <div className="min-w-0">
                        <Link href={`/admin/mediatheque/${r.id}/edit`} className="text-[13px] font-semibold text-foreground hover:text-primary line-clamp-1">
                          {r.title}
                        </Link>
                        <p className="text-[12px] text-[#6B746E] flex items-center gap-1.5">
                          {r.featured && <Star className="w-3 h-3 text-[#8A5A00] fill-current" aria-label="En vedette" />}
                          <span className="truncate">{r.author || "Auteur non renseigné"}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><TypeBadge type={r.type} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-[13px] text-foreground truncate max-w-[220px]">{r.category?.name || "—"}</p>
                    {path && <p className="text-[12px] text-[#6B746E] truncate max-w-[220px]">{path.title} · {path.step}/{path.total}</p>}
                  </td>
                  <td className="px-4 py-3"><StatusLabel status={r.status} /></td>
                  <td className="px-4 py-3 hidden xl:table-cell text-right text-[13px] text-[#3F4A43] tabular-nums">{r.view_count.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[12px] text-[#56615A] whitespace-nowrap">{formatDate(r.published_at || r.created_at)}</td>
                  <td className="px-2 py-3 text-right"><ResourceMenu r={r} {...actions} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-muted" />
          <div className="p-4 space-y-2.5">
            <div className="h-4 bg-muted rounded w-4/5" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/3 mt-5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border divide-y divide-border/60 animate-pulse" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-14 h-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2"><div className="h-3.5 bg-muted rounded w-1/3" /><div className="h-3 bg-muted rounded w-1/5" /></div>
        </div>
      ))}
    </div>
  );
}

function LibraryEmptyState() {
  const formats = [
    { icon: Video, label: "Vidéos" }, { icon: BookOpen, label: "Livres" }, { icon: Headphones, label: "Audios" },
    { icon: FileText, label: "Articles" }, { icon: Compass, label: "Guides" },
  ];
  return (
    <section className="relative bg-white rounded-3xl border border-border overflow-hidden px-6 py-12 sm:py-16">
      <span aria-hidden className="absolute -top-2 -left-3 w-24 h-24 text-primary opacity-[0.12] rotate-[-20deg] pointer-events-none"><SageLeaf className="w-full h-full" /></span>
      <span aria-hidden className="absolute bottom-4 right-6 w-16 h-16 text-primary opacity-[0.12] pointer-events-none hidden sm:block"><DelicateFlower className="w-full h-full" /></span>
      <div className="relative max-w-[560px] mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-6" aria-hidden>
          {formats.map(({ icon: Icon }, i) => (
            <span key={i} className={cn("w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center",
              i === 2 && "w-14 h-14 bg-primary text-white shadow-sm", (i === 1 || i === 3) && "-translate-y-1")}>
              <Icon className={i === 2 ? "w-6 h-6" : "w-5 h-5"} />
            </span>
          ))}
        </div>
        <h2 className="font-headline text-2xl font-bold text-foreground">Construisez votre médiathèque</h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-[#56615A]">
          Centralisez ici les vidéos, livres, audios, articles et guides destinés à accompagner
          les membres dans leur préparation au mariage.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link href="/admin/mediatheque/new"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-white text-[14px] font-bold hover:bg-[#3A5A38] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Ajouter une première ressource
          </Link>
          <Link href="/admin/mediatheque/categories"
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-[14px] font-semibold text-primary hover:bg-primary/10 transition-colors">
            <FolderTree className="w-4 h-4" /> Créer une catégorie
          </Link>
        </div>
        <p className="mt-6 text-[12px] text-[#6B746E]">
          Astuce : regroupez ensuite vos ressources en{" "}
          <Link href="/admin/mediatheque/learning-paths" className="font-semibold text-primary hover:underline">parcours</Link>{" "}
          pour guider les couples étape par étape.
        </p>
      </div>
    </section>
  );
}
