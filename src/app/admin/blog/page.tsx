"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen, Plus, Search, Trash2, Loader2, Edit3, Send, Archive,
  FileText, ChevronLeft, ChevronRight, Clock, Globe, Mail, MailCheck, RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/admin/kpi-card";
import { EmptyState } from "@/components/admin/empty-state";
import { BLOG_STATUS_CONFIG } from "@/lib/blog";
import { BlogNewsletterPanel } from "@/components/admin/blog-newsletter-panel";

interface BlogPostItem {
  id: string; title: string; slug: string; excerpt: string | null;
  author: string; status: string; featured: boolean; view_count: number;
  reading_time_minutes: number; published_at: string | null; created_at: string;
  cover_image_url: string | null;
  // Présents après la migration 20260924_blog_newsletter.sql.
  newsletter_sent_at?: string | null; newsletter_recipients?: number | null;
  category: { id: string; name: string; slug: string; color: string } | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "Tous" }, { value: "published", label: "Publié" },
  { value: "draft", label: "Brouillon" }, { value: "archived", label: "Archivé" },
];

export default function AdminBlogPage() {
  const [tab, setTab] = useState<"posts" | "newsletter">("posts");
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (search) p.set("search", search);
      p.set("page", String(page)); p.set("limit", "20");
      const res = await fetch(`/api/admin/blog/posts?${p}`);
      const data = await res.json();
      if (res.ok) { setPosts(data.posts || []); setTotalPages(data.totalPages || 1); if (data.stats) setStats(data.stats); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [statusFilter, search, page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return; setDeletingId(id);
    try { const res = await fetch(`/api/admin/blog/posts/${id}`, { method: "DELETE" }); if (res.ok) fetchPosts(); }
    catch (e) { console.error(e); } finally { setDeletingId(null); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchPosts();
    } catch (e) { console.error(e); } finally { setActionLoading(null); }
  };

  const handleNewsletter = async (post: BlogPostItem) => {
    const resend = !!post.newsletter_sent_at;
    if (!confirm(resend
      ? `Renvoyer « ${post.title} » à tous les abonnés ? Ils le recevront une seconde fois.`
      : `Envoyer « ${post.title} » par e-mail à tous les abonnés ?`)) return;
    setActionLoading(post.id);
    try {
      const res = await fetch("/api/admin/blog/newsletter", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: post.id, resend }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) alert(d.error || "Envoi impossible.");
      else setTimeout(fetchPosts, 1500);
    } catch (e) { console.error(e); } finally { setActionLoading(null); }
  };

  return (
    <>
      
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Blog</h1>
          <p className="text-[13px] text-[#777777] mt-1">Gérez vos articles et publications</p>
          <div className="inline-flex mt-4 p-1 bg-white border border-[#E5E7EB] rounded-xl" role="tablist">
            {([["posts", "Articles", BookOpen], ["newsletter", "Newsletter", Mail]] as const).map(([v, label, Icon]) => (
              <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                className={cn("inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
                  tab === v ? "bg-[#486B46] text-white shadow-sm" : "text-[#56615A] hover:bg-[#F9FAFB]")}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
        <Link href="/admin/blog/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#486B46] text-white rounded-xl text-[13px] font-semibold hover:bg-[#3A5A38] transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Nouvel article
        </Link>
      </motion.div>

      {tab === "newsletter" ? <BlogNewsletterPanel /> : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total articles" value={stats.total || 0} icon={BookOpen} accentColor="green" index={0} />
        <KPICard title="Publiés" value={stats.published || 0} icon={Globe} accentColor="green" index={1} />
        <KPICard title="Brouillons" value={stats.draft || 0} icon={FileText} accentColor="orange" index={2} />
        <KPICard title="Archivés" value={stats.archived || 0} icon={Archive} accentColor="red" index={3} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#486B46] font-medium" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={cn("px-3 py-2 rounded-lg text-[12px] font-semibold transition-all",
                statusFilter === f.value ? "bg-[#486B46] text-white shadow-sm" : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB]")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun article" description="Créez votre premier article de blog."
          action={{ label: "Créer un article", href: "/admin/blog/new" }} />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#F3F4F6]">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Article</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest hidden md:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest hidden sm:table-cell">Statut</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest hidden lg:table-cell">Vues</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest hidden md:table-cell">Newsletter</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">Actions</th>
              </tr></thead>
              <tbody>{posts.map((post, i) => {
                const sc = BLOG_STATUS_CONFIG[post.status as keyof typeof BLOG_STATUS_CONFIG] || BLOG_STATUS_CONFIG.draft;
                return (
                  <motion.tr key={post.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-[#F9FAFB] hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3"><div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[#F8F5F2] flex items-center justify-center overflow-hidden shrink-0">
                        {post.cover_image_url ? <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-[#D1D5DB]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#2F2F2F] truncate max-w-[250px]">{post.title}</p>
                        <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5">
                          <span>{post.author}</span>
                          {post.published_at && <><span>·</span><span>{new Date(post.published_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</span></>}
                          <span>·</span><span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{post.reading_time_minutes} min</span>
                        </p>
                      </div>
                    </div></td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-[12px] font-medium text-[#6B7280]">{post.category?.name || "—"}</span></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className={cn("px-2 py-1 rounded-md text-[11px] font-semibold", sc.color)}>{sc.label}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className="text-[12px] text-[#6B7280] font-medium">{post.view_count}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {post.status !== "published" ? <span className="text-[12px] text-[#6B746E]">À la publication</span>
                        : post.newsletter_sent_at ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#486B46]" title={`Envoyé le ${new Date(post.newsletter_sent_at).toLocaleString("fr-FR")}`}>
                            <MailCheck className="w-3.5 h-3.5" />
                            {post.newsletter_recipients == null ? "Envoi en cours…" : `Envoyé · ${post.newsletter_recipients}`}
                          </span>
                        ) : post.newsletter_sent_at === null ? (
                          <button onClick={() => handleNewsletter(post)} disabled={actionLoading === post.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold text-[#486B46] bg-[#EEF5EC] hover:bg-[#E0EEDC] disabled:opacity-50">
                            <Mail className="w-3.5 h-3.5" /> Envoyer aux abonnés
                          </button>
                        ) : <span className="text-[12px] text-[#6B746E]">—</span>}
                    </td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                      {post.status==="published" && post.newsletter_sent_at && post.newsletter_recipients != null && <button onClick={()=>handleNewsletter(post)} disabled={actionLoading===post.id} title="Renvoyer aux abonnés" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#486B46] hover:bg-[#EEF5EC] disabled:opacity-50"><RotateCw className="w-3.5 h-3.5" /></button>}
                      <Link href={`/admin/blog/${post.id}/edit`} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#486B46] hover:bg-[#EEF5EC] transition-all"><Edit3 className="w-3.5 h-3.5" /></Link>
                      {post.status==="draft" && <button onClick={()=>handleStatusChange(post.id,"published")} disabled={actionLoading===post.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#38C172] hover:bg-[#38C172]/10 disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>}
                      {post.status==="published" && <button onClick={()=>handleStatusChange(post.id,"archived")} disabled={actionLoading===post.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 disabled:opacity-50"><Archive className="w-3.5 h-3.5" /></button>}
                      <button onClick={()=>handleDelete(post.id)} disabled={deletingId===post.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F56565] hover:bg-[#F56565]/10 disabled:opacity-50">
                        {deletingId===post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div></td>
                  </motion.tr>);
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-[12px] text-[#9CA3AF] font-medium">Page {page} sur {totalPages}</p>
          <div className="flex gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] border border-[#E5E7EB] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] border border-[#E5E7EB] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      </>}
    </>
  );
}
