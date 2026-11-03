"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

interface Stats {
  activeReferrers: number;
  totalReferrals: number;
  validated: number;
  pending: number;
  rejected: number;
  rewardsGranted: number;
  creditsActive: number;
  creditsQueued: number;
}

interface ReferrerRow {
  userId: string;
  name: string | null;
  pseudo: string | null;
  code: string | null;
  totalReferred: number;
  validatedCount: number;
  pendingCount: number;
  rewardsCount: number;
  firstActivityAt: string | null;
}

interface ReferrerDetail {
  referrer: { id: string; name: string | null; pseudo: string | null };
  code: { code: string; isActive: boolean } | null;
  referred: {
    referralId: string;
    name: string | null;
    pseudo: string | null;
    accountStatus: string | null;
    referralStatus: string;
    createdAt: string;
    validatedAt: string | null;
    rejectionReason: string | null;
    contributedToRewardId: string | null;
  }[];
  rewards: { id: string; durationDays: number; status: string; grantedAt: string; activatedAt: string | null; expiresAt: string | null; revokedReason: string | null }[];
}

const KPI_LABELS: { key: keyof Stats; label: string }[] = [
  { key: "activeReferrers", label: "Parrains actifs" },
  { key: "totalReferrals", label: "Filleuls inscrits" },
  { key: "validated", label: "Validés" },
  { key: "pending", label: "En attente" },
  { key: "rejected", label: "Rejetés" },
  { key: "rewardsGranted", label: "Récompenses attribuées" },
  { key: "creditsActive", label: "Crédits actifs" },
  { key: "creditsQueued", label: "Crédits en réserve" },
];

export default function AdminReferralsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<ReferrerDetail | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<{ referredName: string | null; referredPseudo: string | null; referrerId: string; referrerName: string | null; referrerPseudo: string | null }[]>([]);
  const [actionReason, setActionReason] = useState("");

  const loadStats = () => fetch("/api/admin/referrals/stats").then((r) => r.json()).then(setStats).catch(() => {});
  const loadReferrers = () =>
    fetch(`/api/admin/referrals/referrers?search=${encodeURIComponent(search)}&page=${page}`)
      .then((r) => r.json())
      .then((d) => { setReferrers(d.referrers || []); setTotalPages(d.totalPages || 1); })
      .catch(() => {});
  const openDetail = (userId: string) =>
    fetch(`/api/admin/referrals/referrers/${userId}`).then((r) => r.json()).then(setSelected).catch(() => {});

  useEffect(() => { void loadStats(); }, []);
  useEffect(() => { void loadReferrers(); }, [search, page]);

  const runLookup = async () => {
    if (!lookupQuery.trim()) { setLookupResults([]); return; }
    const res = await fetch(`/api/admin/referrals/referred-lookup?query=${encodeURIComponent(lookupQuery)}`);
    const data = await res.json();
    setLookupResults(data.results || []);
  };

  const act = async (referralId: string, action: "approve" | "reject" | "flag") => {
    const body = action === "approve" ? {} : { reason: actionReason };
    if (action !== "approve" && !actionReason.trim()) { alert("Un motif est requis."); return; }
    await fetch(`/api/admin/referrals/${referralId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setActionReason("");
    if (selected) void openDetail(selected.referrer.id);
    void loadReferrers();
    void loadStats();
  };

  const revokeReward = async (rewardId: string) => {
    const reason = prompt("Motif de la révocation :");
    if (!reason) return;
    await fetch(`/api/admin/referrals/rewards/${rewardId}/revoke`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    if (selected) void openDetail(selected.referrer.id);
  };

  return (
    <div className="p-4 sm:p-8">
      <PageHeader title="Parrainages et récompenses" subtitle="Vue générale, parrains, filleuls et récompenses GOLD" backHref="/admin/dashboard" />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {KPI_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-[22px] font-bold text-[#486B46]">{stats[key]}</p>
              <p className="text-[12px] text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 col-span-2 sm:col-span-4">
            <p className="text-[13px] text-zinc-500">Taux de transformation GOLD → payant : indisponible (aucune passerelle de paiement active).</p>
          </div>
        </div>
      )}

      {/* Recherche inversée filleul → parrain */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 mb-8">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Rechercher un filleul → retrouver son parrain</h2>
        <div className="flex gap-2">
          <input value={lookupQuery} onChange={(e) => setLookupQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runLookup()}
            placeholder="Nom, pseudo ou email du filleul…" className="flex-1 h-10 px-3 rounded-lg border border-zinc-200 text-[14px]" />
          <button type="button" onClick={runLookup} className="h-10 px-4 rounded-lg bg-[#486B46] text-white text-[14px] font-semibold">Rechercher</button>
        </div>
        {lookupResults.length > 0 && (
          <ul className="mt-3 space-y-2">
            {lookupResults.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-[14px] border-t border-zinc-100 pt-2">
                <span>{r.referredPseudo || r.referredName}</span>
                <button type="button" onClick={() => openDetail(r.referrerId)} className="text-[#486B46] font-semibold hover:underline">
                  Parrain : {r.referrerPseudo || r.referrerName || r.referrerId}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Table des parrains */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher par nom, pseudo ou code…"
            className="flex-1 text-[14px] outline-none" />
        </div>
        <table className="w-full text-[14px]">
          <thead className="bg-zinc-50 text-[12px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="text-left px-4 py-2">Parrain</th>
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-right px-4 py-2">Filleuls</th>
              <th className="text-right px-4 py-2">Validés</th>
              <th className="text-right px-4 py-2">En attente</th>
              <th className="text-right px-4 py-2">Récompenses</th>
              <th className="text-left px-4 py-2">1ère activité</th>
            </tr>
          </thead>
          <tbody>
            {referrers.map((r) => (
              <tr key={r.userId} className="border-t border-zinc-100 hover:bg-zinc-50 cursor-pointer" onClick={() => openDetail(r.userId)}>
                <td className="px-4 py-2.5 font-medium text-zinc-900">{r.pseudo || r.name || r.userId}</td>
                <td className="px-4 py-2.5 text-zinc-500">{r.code || "—"}</td>
                <td className="px-4 py-2.5 text-right">{r.totalReferred}</td>
                <td className="px-4 py-2.5 text-right">{r.validatedCount}</td>
                <td className="px-4 py-2.5 text-right">{r.pendingCount}</td>
                <td className="px-4 py-2.5 text-right">{r.rewardsCount}</td>
                <td className="px-4 py-2.5 text-zinc-500">{r.firstActivityAt ? new Date(r.firstActivityAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {referrers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">Aucun parrain pour l'instant.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 text-[13px] disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-[13px] text-zinc-500">Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 text-[13px] disabled:opacity-40">
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Détail d'un parrain */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setSelected(null)}>
          <div className="w-full max-w-xl h-full bg-white overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold">{selected.referrer.pseudo || selected.referrer.name}</h2>
              <button type="button" onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[13px] text-zinc-500 mb-6">Code : {selected.code?.code || "—"}</p>

            <h3 className="text-[13px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Filleuls</h3>
            <ul className="space-y-3 mb-8">
              {selected.referred.map((r) => (
                <li key={r.referralId} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/admin/users/${r.referralId}`} className="font-medium text-[#486B46] hover:underline">
                      {r.pseudo || r.name || "Membre"}
                    </Link>
                    <span className="text-[12px] text-zinc-500">{r.referralStatus}</span>
                  </div>
                  <p className="text-[12px] text-zinc-400 mt-1">
                    Inscrit le {new Date(r.createdAt).toLocaleDateString()}
                    {r.validatedAt && ` · validé le ${new Date(r.validatedAt).toLocaleDateString()}`}
                    {r.rejectionReason && ` · motif : ${r.rejectionReason}`}
                    {r.contributedToRewardId && " · a financé une récompense"}
                  </p>
                  {(r.referralStatus === "pending" || r.referralStatus === "under_review") && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => act(r.referralId, "approve")} className="text-[12px] font-semibold text-green-700">Approuver</button>
                      <button type="button" onClick={() => act(r.referralId, "reject")} className="text-[12px] font-semibold text-red-700">Refuser</button>
                      <button type="button" onClick={() => act(r.referralId, "flag")} className="text-[12px] font-semibold text-amber-700">Signaler</button>
                    </div>
                  )}
                </li>
              ))}
              {selected.referred.length === 0 && <p className="text-[13px] text-zinc-400">Aucun filleul.</p>}
            </ul>
            <input value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Motif (refus/signalement)"
              className="w-full h-9 px-3 mb-8 rounded-lg border border-zinc-200 text-[13px]" />

            <h3 className="text-[13px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Récompenses</h3>
            <ul className="space-y-3">
              {selected.rewards.map((r) => (
                <li key={r.id} className={cn("rounded-xl border p-3", r.status === "revoked" ? "border-red-200 bg-red-50" : "border-zinc-200")}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.durationDays} jours — {r.status}</span>
                    {(r.status === "pending_activation" || r.status === "active") && (
                      <button type="button" onClick={() => revokeReward(r.id)} className="text-[12px] font-semibold text-red-700">Révoquer</button>
                    )}
                  </div>
                  <p className="text-[12px] text-zinc-400 mt-1">
                    Octroyé le {new Date(r.grantedAt).toLocaleDateString()}
                    {r.activatedAt && ` · actif depuis le ${new Date(r.activatedAt).toLocaleDateString()}`}
                    {r.expiresAt && ` jusqu'au ${new Date(r.expiresAt).toLocaleDateString()}`}
                    {r.revokedReason && ` · révoqué : ${r.revokedReason}`}
                  </p>
                </li>
              ))}
              {selected.rewards.length === 0 && <p className="text-[13px] text-zinc-400">Aucune récompense.</p>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
