"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, RefreshCw, Search, Users } from "lucide-react";

type Status = "done" | "partial" | "none";
type Pillar = {
  number: number; title: string; totalLessons: number; done: number; partial: number; none: number;
  lessons: { slug: string; number: string; title: string; completed: number; remaining: number; rate: number }[];
};
type Member = { id: string; name: string; done: number; total: number; percent: number; pillars: { number: number; done: number; total: number; status: Status }[] };
type Report = {
  updatedAt: string;
  totals: { users: number; withValidatedLessons: number; withoutValidatedLessons: number; fullyCompleted: number; totalLessons: number; totalValidations: number; averageProgress: number; unknownSlugs: number };
  pillars: Pillar[];
  members: Member[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
const badge: Record<Status, { label: string; style: string }> = {
  done: { label: "Terminé", style: "bg-green-50 text-green-800" },
  partial: { label: "Partiel", style: "bg-amber-50 text-amber-800" },
  none: { label: "Aucune leçon", style: "bg-gray-100 text-gray-600" },
};
const card = "rounded-2xl border border-[#E5E7EB] bg-white p-5";
const percent = (n: number, total: number) => total > 0 ? Math.round((100 * n) / total) : 0;

function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div className="h-2 w-full rounded-full bg-[#E8ECE7] overflow-hidden" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <div className="h-full rounded-full bg-[#486B46]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>;
}

export default function AdminLessonsAnalyticsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pillar, setPillar] = useState(0);
  const [state, setState] = useState("all");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), state, search });
      if (pillar) query.set("pillar", String(pillar));
      const response = await fetch(`/api/admin/analytics/lessons?${query.toString()}`, { signal, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Erreur de chargement");
      setReport(payload as Report);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setReport(null);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, pillar, state, search, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setFilterPillar = (value: number) => { setPillar(value); setPage(1); };
  const setFilterState = (value: string) => { setState(value); setPage(1); };
  const selected = report?.pillars.find((p) => p.number === pillar);
  const visiblePillars = selected ? [selected] : report?.pillars || [];

  return <main className="space-y-6 pb-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link href="/admin/analytics" className="inline-flex gap-2 items-center text-sm font-semibold text-[#486B46] hover:underline mb-3"><ArrowLeft className="w-4 h-4" /> Retour aux Analytics</Link>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2A23] flex items-center gap-2"><GraduationCap className="w-7 h-7 text-[#486B46]" /> Progression des leçons</h1>
        <p className="text-sm text-[#6B746E] mt-1">Bâtir sur le roc · Membres approuvés uniquement · Piliers avec leçons publiées</p>
      </div>
      <button type="button" onClick={() => setRefresh((n) => n + 1)} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-sm font-semibold disabled:opacity-50"><RefreshCw className="w-4 h-4" /> Actualiser</button>
    </div>

    {error && <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>}
    {loading && <p className="text-sm text-[#6B746E]" role="status">Chargement des statistiques…</p>}
    {report && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Membres approuvés", value: report.totals.users, Icon: Users },
          { label: "Au moins une leçon validée", value: report.totals.withValidatedLessons, Icon: BookOpen },
          { label: "Formation complète", value: report.totals.fullyCompleted, Icon: CheckCircle2 },
          { label: "Progression moyenne", value: `${report.totals.averageProgress}%`, Icon: GraduationCap },
        ].map(({ label, value, Icon }) => <div key={label} className={card}>
          <Icon className="w-5 h-5 text-[#486B46] mb-3" />
          <p className="text-2xl font-bold tabular-nums text-[#1F2A23]">{value}</p><p className="text-xs text-[#6B746E] mt-1">{label}</p>
        </div>)}
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="block text-xs font-semibold text-[#56615A]">Pilier
          <select value={pillar} onChange={e => setFilterPillar(Number(e.target.value))} className="block mt-1 min-w-44 px-3 py-2 border rounded-xl bg-white text-sm">
            <option value={0}>Tous les piliers</option>
            {report.pillars.map(p => <option key={p.number} value={p.number}>Pilier {p.number}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#56615A]">Statut des membres
          <select value={state} onChange={e => setFilterState(e.target.value)} className="block mt-1 min-w-44 px-3 py-2 border rounded-xl bg-white text-sm">
            <option value="all">Tous les statuts</option>
            <option value="done">Terminé</option>
            <option value="partial">Partiel</option>
            <option value="none">Aucune leçon validée</option>
          </select>
        </label>
      </div>

      <section aria-labelledby="pillar-title" className="space-y-3">
        <h2 id="pillar-title" className="text-lg font-bold text-[#1F2A23]">Synthèse par pilier</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {visiblePillars.map(p => <article key={p.number} className={card}>
            <h3 className="font-bold text-[#1F2A23]">Pilier {p.number} · {p.title}</h3>
            <p className="text-xs mt-1 text-[#6B746E]">{p.totalLessons} leçons disponibles</p>
            <div className="grid grid-cols-3 text-center gap-2 mt-4 mb-4">
              <div><p className="text-xl font-bold text-[#486B46]">{p.done}</p><p className="text-[11px] text-[#6B746E]">Terminés</p></div>
              <div><p className="text-xl font-bold text-amber-700">{p.partial}</p><p className="text-[11px] text-[#6B746E]">Partiels</p></div>
              <div><p className="text-xl font-bold text-gray-600">{p.none}</p><p className="text-[11px] text-[#6B746E]">Sans validation</p></div>
            </div>
            <ProgressBar value={percent(p.done, report.totals.users)} label={`Taux de complétion du pilier ${p.number}`} />
            <p className="text-xs text-[#6B746E] mt-2">{percent(p.done, report.totals.users)} % des membres ont terminé ce pilier</p>
          </article>)}
        </div>
      </section>

      <section className={card} aria-labelledby="lessons-title">
        <h2 id="lessons-title" className="text-lg font-bold text-[#1F2A23] mb-1">Détail des leçons</h2>
        <p className="text-xs text-[#6B746E] mb-4">Chaque taux représente la part des membres approuvés ayant validé la leçon.</p>
        {visiblePillars.map(p => <div key={p.number} className="mb-6 last:mb-0">
          <h3 className="font-semibold text-sm border-b pb-2 mb-3">Pilier {p.number} · {p.title}</h3>
          <div className="space-y-3">
            {p.lessons.map(l => <div key={l.slug} className="grid sm:grid-cols-[minmax(0,1fr)_100px_100px] gap-2 sm:items-center">
              <div className="min-w-0"><p className="text-sm font-medium text-[#1F2A23]">{l.number} · {l.title}</p><ProgressBar label={`Leçon ${l.number}`} value={l.rate} /></div>
              <p className="text-xs text-[#56615A] sm:text-right">{l.completed} / {report.totals.users} validées</p>
              <p className="text-sm font-bold text-[#486B46] sm:text-right">{l.rate} %</p>
            </div>)}
          </div>
        </div>)}
      </section>

      <section className={card} aria-labelledby="member-title">
        <div className="flex flex-wrap justify-between gap-3 items-end mb-4">
          <div><h2 id="member-title" className="text-lg font-bold text-[#1F2A23]">Progression par membre</h2>
            <p className="text-xs text-[#6B746E]">{report.pagination.total} membre(s) correspondent aux filtres</p></div>
          <form onSubmit={e => { e.preventDefault(); setPage(1); setSearch(input.trim()); }} className="flex gap-2">
            <input aria-label="Rechercher un membre par nom ou pseudonyme" value={input} onChange={e=>setInput(e.target.value)}
              placeholder="Nom ou pseudonyme" className="w-44 sm:w-56 border rounded-xl py-2 px-3 text-sm" />
            <button type="submit" className="border rounded-xl px-3 py-2 bg-[#486B46] text-white" aria-label="Rechercher"><Search className="w-4 h-4" /></button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead><tr className="text-left border-b text-[#56615A]">
              <th scope="col" className="py-3 pr-3">Membre</th><th scope="col">Total</th>
              {report.pillars.map(p => <th scope="col" key={p.number}>Pilier {p.number}</th>)}
              <th scope="col" className="text-right">Progression</th>
            </tr></thead>
            <tbody>{report.members.map(m => <tr key={m.id} className="border-b last:border-0">
              <td className="py-3 pr-3"><Link href={`/admin/users/${m.id}`} className="font-semibold text-[#486B46] hover:underline">{m.name}</Link></td>
              <td>{m.done}/{m.total}</td>
              {report.pillars.map(p => {
                const item = m.pillars.find(x => x.number === p.number);
                return <td key={p.number}><span className={`inline-flex rounded-full py-1 px-2 text-xs font-semibold ${badge[item?.status || "none"].style}`}>{item?.done || 0}/{p.totalLessons} · {badge[item?.status || "none"].label}</span></td>;
              })}
              <td className="text-right font-bold tabular-nums">{m.percent}%</td>
            </tr>)}</tbody>
          </table>
          {report.members.length === 0 && <p className="py-8 text-sm text-center text-[#6B746E]">Aucun membre ne correspond aux filtres.</p>}
        </div>
        <div className="flex justify-between gap-2 items-center mt-4">
          <span className="text-xs text-[#6B746E]">Page {report.pagination.page} / {report.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || report.pagination.page <= 1} onClick={() => setPage(page-1)} className="p-2 border rounded-lg disabled:opacity-30" aria-label="Page précédente"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" disabled={loading || report.pagination.page >= report.pagination.totalPages} onClick={() => setPage(page+1)} className="p-2 border rounded-lg disabled:opacity-30" aria-label="Page suivante"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>
      <p className="text-xs leading-relaxed text-[#6B746E]">Les statistiques reflètent uniquement les leçons déclarées terminées et synchronisées sur le compte. Une leçon ouverte, une position de lecture, les quiz et les réflexions privées ne sont pas visibles par l'administration. « Aucune leçon validée » ne signifie donc pas nécessairement « jamais commencée ». Les piliers sans leçons ne sont pas comptabilisés.</p>
      {report.totals.unknownSlugs > 0 && <p className="text-xs text-amber-700">{report.totals.unknownSlugs} référence(s) de leçons inconnues ont été exclues des calculs.</p>}
    </>}
  </main>;
}
