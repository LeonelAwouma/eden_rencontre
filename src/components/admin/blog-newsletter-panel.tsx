"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Mail, Users, UserCheck, UserMinus, Search, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subscriber {
  id: string; email: string; status: "active" | "unsubscribed"; source: "blog" | "member";
  subscribed_at: string; unsubscribed_at: string | null;
}
interface Stats { audience: number; members: number; subscribers: number; unsubscribed: number }

const STATUS_OPTIONS = [
  { value: "all", label: "Toutes les adresses" },
  { value: "active", label: "Inscrits" },
  { value: "unsubscribed", label: "Désabonnés" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Onglet « Newsletter » de l'admin Blog : audience et inscrits de la page publique. */
export function BlogNewsletterPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page) });
      if (status !== "all") p.set("status", status);
      if (search) p.set("search", search);
      const res = await fetch(`/api/admin/blog/newsletter?${p}`);
      const d = await res.json();
      if (res.ok) {
        setStats(d.stats); setRows(d.subscribers || []); setTotalPages(d.totalPages || 1);
        setMigrationMissing(!!d.migrationMissing);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (s: Subscriber) => {
    const msg = s.status === "unsubscribed"
      ? `Retirer ${s.email} de la liste ? S'il s'agit d'un membre, il recevra de nouveau la newsletter.`
      : `Retirer ${s.email} de la newsletter ?`;
    if (!confirm(msg)) return;
    setDeletingId(s.id);
    try { const res = await fetch(`/api/admin/blog/newsletter?id=${s.id}`, { method: "DELETE" }); if (res.ok) load(); }
    catch (e) { console.error(e); } finally { setDeletingId(null); }
  };

  const tiles = [
    { label: "Destinataires", hint: "reçoivent chaque article", value: stats?.audience, icon: Mail },
    { label: "Membres", hint: "abonnés d'office", value: stats?.members, icon: UserCheck },
    { label: "Inscrits du blog", hint: "sans compte", value: stats?.subscribers, icon: Users },
    { label: "Désabonnés", hint: "membres compris", value: stats?.unsubscribed, icon: UserMinus },
  ];

  return (
    <div className="space-y-5">
      {migrationMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-[#E8E5E0] bg-[#FBFAF7] px-4 py-3 text-[13px] text-[#56615A]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#486B46]" />
          <p>Les inscriptions publiques sont inactives : appliquez la migration <code className="font-mono text-[12px]">supabase/migrations/20260924_blog_newsletter.sql</code> dans Supabase. Les membres reçoivent déjà les articles.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => (
          <div key={t.label} className="bg-white rounded-xl border border-[#E8E5E0] px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EEF5EC] flex items-center justify-center shrink-0"><t.icon className="w-4 h-4 text-[#486B46]" /></div>
            <div className="min-w-0">
              <p className="text-[22px] font-bold text-[#1a1a1a] leading-none" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
                {t.value === undefined ? "–" : t.value.toLocaleString("fr-FR")}
              </p>
              <p className="text-[12px] text-[#56615A] font-semibold mt-1 truncate">{t.label} <span className="font-normal text-[#6B746E]">· {t.hint}</span></p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-[#6B746E]">
        Chaque article publié part automatiquement par e-mail depuis <span className="font-semibold text-[#56615A]">contact@gardenofalliance.com</span> aux membres approuvés et aux inscrits du blog. Chaque e-mail contient un lien de désabonnement.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une adresse..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] outline-none focus:border-[#486B46] font-medium" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#56615A] outline-none focus:border-[#486B46]">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E5E0] max-w-[560px] mx-auto px-6 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF5EC] flex items-center justify-center mx-auto mb-4"><Mail className="w-5 h-5 text-[#486B46]" /></div>
          <p className="text-[15px] font-semibold text-[#2F2F2F]">{search || status !== "all" ? "Aucune adresse ne correspond" : "Pas encore d'inscrit depuis le blog"}</p>
          <p className="text-[13px] text-[#56615A] mt-1.5">
            {search || status !== "all"
              ? "Essayez une autre recherche ou affichez toutes les adresses."
              : `Les visiteurs s'inscrivent sans compte en bas de la page Blog. Vos ${stats?.members ?? 0} membre(s) approuvé(s) reçoivent déjà chaque article.`}
          </p>
          <div className="flex justify-center gap-2 mt-5">
            {search || status !== "all" ? (
              <button onClick={() => { setSearch(""); setStatus("all"); setPage(1); }} className="px-4 py-2 rounded-xl bg-[#486B46] text-white text-[13px] font-semibold hover:bg-[#3A5A38]">Tout afficher</button>
            ) : (
              <Link href="/blog" target="_blank" className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#56615A] hover:bg-[#F9FAFB]">Voir la page Blog</Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-[#F3F4F6]">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#6B746E] uppercase tracking-widest">Adresse</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#6B746E] uppercase tracking-widest hidden sm:table-cell">Origine</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#6B746E] uppercase tracking-widest">Statut</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-[#6B746E] uppercase tracking-widest hidden md:table-cell">Date</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>{rows.map(s => (
                <tr key={s.id} className="border-b border-[#F9FAFB] hover:bg-[#FAFAF8]">
                  <td className="px-4 py-3 text-[13px] font-medium text-[#2F2F2F] break-all">{s.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-[12px] text-[#56615A]">{s.source === "member" ? "Membre" : "Page Blog"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-1 rounded-md text-[11px] font-semibold",
                      s.status === "active" ? "bg-[#EEF5EC] text-[#486B46]" : "bg-[#F3F4F6] text-[#56615A]")}>
                      {s.status === "active" ? "Inscrit" : "Désabonné"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[12px] text-[#56615A]">{fmtDate(s.status === "active" ? s.subscribed_at : s.unsubscribed_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(s)} disabled={deletingId === s.id} title="Retirer de la liste"
                      className="w-8 h-8 inline-flex rounded-lg items-center justify-center text-[#6B746E] hover:text-[#F56565] hover:bg-[#F56565]/10 disabled:opacity-50">
                      {deletingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[12px] text-[#6B746E] font-medium">Page {page} sur {totalPages}</p>
          <div className="flex gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B746E] border border-[#E5E7EB] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B746E] border border-[#E5E7EB] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
