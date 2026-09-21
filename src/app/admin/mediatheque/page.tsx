"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library, Plus, Video, Headphones, BookOpen, FileText, File,
  Search, Eye, Trash2, Loader2, Edit3, Star, ExternalLink,
  ChevronLeft, ChevronRight, Archive, Send, AlertTriangle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/admin/kpi-card";
import { EmptyState } from "@/components/admin/empty-state";
import { RESOURCE_TYPE_CONFIG, STATUS_CONFIG, type ResourceType, type ResourceStatus } from "@/lib/mediatheque";

interface ResourceItem {
  id: string; title: string; slug: string; type: ResourceType; status: ResourceStatus;
  author: string | null; thumbnail_url: string | null; view_count: number; featured: boolean;
  created_at: string; category: { id: string; name: string; slug: string; icon: string | null; color: string } | null;
}

const TYPE_FILTERS = [
  { value: "all", label: "Tous" }, { value: "video", label: "Vidéo" }, { value: "audio", label: "Audio" },
  { value: "book", label: "Livre" }, { value: "pdf", label: "PDF" }, { value: "article", label: "Article" },
  { value: "guide", label: "Guide" },
];
const STATUS_FILTERS = [
  { value: "all", label: "Tous" }, { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon" }, { value: "archived", label: "Archivé" },
];

export default function AdminMediathequePage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", page.toString()); params.set("limit", "20");
      const res = await fetch(`/api/admin/mediatheque/resources?${params}`);
      const data = await res.json();
      if (res.ok) { setResources(data.resources || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1); if (data.stats) setStats(data.stats); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [typeFilter, statusFilter, debouncedSearch, page]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const resourceToDelete = resources.find((r) => r.id === confirmDeleteId) || null;

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try { const res = await fetch(`/api/admin/mediatheque/resources/${id}`, { method: "DELETE" }); if (res.ok) fetchResources(); }
    catch (e) { console.error(e); } finally { setDeletingId(null); }
  };

  const handleStatusChange = async (id: string, newStatus: ResourceStatus) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/mediatheque/resources/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchResources();
    } catch (e) { console.error(e); } finally { setActionLoading(null); }
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const icons: Record<string, React.ReactNode> = { video: <Video className="w-3.5 h-3.5" />, audio: <Headphones className="w-3.5 h-3.5" />, book: <BookOpen className="w-3.5 h-3.5" />, pdf: <File className="w-3.5 h-3.5" />, article: <FileText className="w-3.5 h-3.5" /> };
    return <>{icons[type] || <Library className="w-3.5 h-3.5" />}</>;
  };

  return (
    <>
      
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight">Médiathèque</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1 font-medium">Gérez les ressources pour la préparation au mariage</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/mediatheque/categories" className="px-4 py-2.5 rounded-xl border border-[#E8E5E0] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">Catégories</Link>
          <Link href="/admin/mediatheque/learning-paths" className="px-4 py-2.5 rounded-xl border border-[#E8E5E0] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all">Parcours</Link>
          <Link href="/admin/mediatheque/new" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38] transition-all shadow-sm"><Plus className="w-4 h-4" /> Ajouter</Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard title="Total" value={total} icon={Library} accentColor="green" index={0} />
        <KPICard title="Vidéos" value={stats.video || 0} icon={Video} accentColor="blue" index={1} />
        <KPICard title="Audio" value={stats.audio || 0} icon={Headphones} accentColor="green" index={2} />
        <KPICard title="Livres" value={stats.book || 0} icon={BookOpen} accentColor="orange" index={3} />
        <KPICard title="PDFs" value={stats.pdf || 0} icon={File} accentColor="red" index={4} />
        <KPICard title="Articles" value={stats.article || 0} icon={FileText} accentColor="green" index={5} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#E8E5E0] p-1 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (<button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1); }} className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap", statusFilter === s.value ? "bg-[#486B46] text-white" : "text-[#6B7280] hover:bg-[#F9FAFB]")}>{s.label}</button>))}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#E8E5E0] p-1 overflow-x-auto">
          {TYPE_FILTERS.map((t) => (<button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }} className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap", typeFilter === t.value ? "bg-[#486B46] text-white" : "text-[#6B7280] hover:bg-[#F9FAFB]")}>{t.label}</button>))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 bg-white border border-[#E8E5E0] rounded-xl px-3 py-2 focus-within:border-[#486B46] focus-within:ring-2 focus-within:ring-[#486B46]/10 transition-all">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="bg-transparent text-sm text-[#2F2F2F] placeholder:text-[#D1D5DB] outline-none w-40 font-medium" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-[3px] border-[#E8E5E0] border-t-[#486B46] animate-spin" /></div>
      ) : resources.length === 0 ? (
        <EmptyState icon={Library} title="Aucune ressource" description="Ajoutez votre première ressource."
          action={{ label: "Ajouter une ressource", href: "/admin/mediatheque/new" }} />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden"><div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="border-b border-[#F3F4F6]">
            <th className="text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-4 py-3">Ressource</th>
            <th className="text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-4 py-3 hidden md:table-cell">Type</th>
            <th className="text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Catégorie</th>
            <th className="text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-4 py-3 hidden sm:table-cell">Statut</th>
            <th className="text-right text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{resources.map((r, i) => {
            const tc = RESOURCE_TYPE_CONFIG[r.type] || RESOURCE_TYPE_CONFIG.external;
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
            return (
              <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-[#F9FAFB] hover:bg-[#FAFAF8]">
                <td className="px-4 py-3"><div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F8F5F2] flex items-center justify-center overflow-hidden">{r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <TypeIcon type={r.type} />}</div>
                  <div className="min-w-0"><p className="text-[13px] font-semibold text-[#2F2F2F] truncate max-w-[200px]">{r.title}</p><p className="text-[11px] text-[#9CA3AF]">{r.author || "—"}</p></div>
                  {r.featured && <Star className="w-3.5 h-3.5 text-[#F59E0B]" />}
                </div></td>
                <td className="px-4 py-3 hidden md:table-cell"><span className={cn("px-2 py-1 rounded-md text-[11px] font-semibold", tc.bgColor, tc.color)}>{tc.label}</span></td>
                <td className="px-4 py-3 hidden lg:table-cell"><p className="text-[12px] text-[#6B7280] font-medium truncate max-w-[130px]">{r.category?.name || "—"}</p></td>
                <td className="px-4 py-3 hidden sm:table-cell"><span className={cn("px-2 py-1 rounded-md text-[11px] font-semibold", sc.color)}>{sc.label}</span></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                  <Link href={`/admin/mediatheque/${r.id}/edit`} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#486B46] hover:bg-[#EEF5EC] transition-all"><Edit3 className="w-3.5 h-3.5" /></Link>
                  {r.status==="draft" && <button onClick={()=>handleStatusChange(r.id,"published")} disabled={actionLoading===r.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#38C172] hover:bg-[#38C172]/10 disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>}
                  {r.status==="published" && <button onClick={()=>handleStatusChange(r.id,"archived")} disabled={actionLoading===r.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 disabled:opacity-50"><Archive className="w-3.5 h-3.5" /></button>}
                  <button onClick={()=>setConfirmDeleteId(r.id)} disabled={deletingId===r.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F56565] hover:bg-[#F56565]/10 disabled:opacity-50">{deletingId===r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                </div></td>
              </motion.tr>);
          })}</tbody>
        </table></div></div>
      )}
      {totalPages > 1 && (<div className="flex items-center justify-between mt-6 px-2">
        <p className="text-[12px] text-[#9CA3AF] font-medium">Page {page} sur {totalPages}</p>
        <div className="flex gap-1.5">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] border border-[#E5E7EB] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] border border-[#E5E7EB] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>)}

      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteId(null)}>
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-[#E8E5E0] shadow-xl w-full max-w-sm p-5"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F56565]/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#F56565]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#1a1a1a]">Supprimer cette ressource ?</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                    {resourceToDelete ? <>&ldquo;{resourceToDelete.title}&rdquo; sera définitivement supprimée. Cette action est irréversible.</> : "Cette action est irréversible."}
                  </p>
                </div>
                <button onClick={() => setConfirmDeleteId(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#374151] border border-[#E8E5E0] hover:bg-[#F9FAFB] transition-all">
                  Annuler
                </button>
                <button onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                  className="px-4 py-2 rounded-xl text-[13px] font-bold text-white bg-[#F56565] hover:bg-[#E53E3E] transition-all">
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}