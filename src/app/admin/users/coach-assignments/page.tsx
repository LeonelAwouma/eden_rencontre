"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { CoachAvatar } from "@/components/coach/coach-avatar";

type CoachInfo = { id: string; name: string; email: string | null; active: boolean; avatar_url: string | null };
type Item = {
  id: string; name: string; pseudo: string | null; email: string | null; status: string | null; avatar_url: string | null;
  situation: "none" | "pending" | "active" | "to_reassign";
  coach: CoachInfo | null;
  assignment: { id: string; status: string; assigned_at: string } | null;
};
type CoachOption = { user_id: string; display_name: string; email: string | null; active: boolean; avatar_url: string | null; active_count: number; pending_count: number };
type Pending = { kind: "assign" | "reassign" | "remove"; item: Item; coachId?: string } | null;

const SITUATION: Record<Item["situation"], { label: string; cls: string }> = {
  none: { label: "Sans coach", cls: "bg-[#EEF0EE] text-[#56615A]" },
  pending: { label: "En attente du membre", cls: "bg-[#FBF3E0] text-[#8A6A1F]" },
  active: { label: "Suivi actif", cls: "bg-[#EEF5EC] text-[#486B46]" },
  to_reassign: { label: "À réaffecter", cls: "bg-[#F4ECEA] text-[#8A3B2E]" },
};
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : "—");

/** Affectation des membres aux coachs. Le membre doit accepter la proposition avant que le coach le voie. */
export default function CoachAssignmentsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [total, setTotal] = useState(0);
  const [toReassign, setToReassign] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [memberStatus, setMemberStatus] = useState("approved");
  const [situation, setSituation] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [chosen, setChosen] = useState("");

  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(page), member_status: memberStatus });
      if (debouncedQ) sp.set("q", debouncedQ);
      if (situation) sp.set("situation", situation);
      if (coachFilter) sp.set("coach", coachFilter);
      const res = await fetch(`/api/admin/coach-assignments?${sp}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items || []); setCoaches(data.coaches || []); setTotal(data.total || 0);
      setToReassign(data.to_reassign_count || 0); setPageSize(data.page_size || 25); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur de chargement"); }
    finally { setLoading(false); }
  }, [page, debouncedQ, memberStatus, situation, coachFilter]);
  useEffect(() => { void load(); }, [load]);

  const call = async (coachId: string, method: "POST" | "PATCH", body: unknown) => {
    const res = await fetch(`/api/admin/coaches/${coachId}/assignments`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Opération refusée");
  };

  const confirm = async () => {
    if (!pending) return;
    const { kind, item } = pending;
    setBusy(true); setError(""); setNotice("");
    try {
      if (kind === "remove") {
        if (!item.coach || !item.assignment) throw new Error("Aucune affectation à retirer.");
        await call(item.coach.id, "PATCH", { assignment_id: item.assignment.id, reason: "admin_terminated" });
        setNotice("Affectation retirée.");
      } else {
        if (!chosen) throw new Error("Choisissez un coach.");
        // La réaffectation clôt l'ancien dossier dans la même transaction SQL (historique conservé).
        await call(chosen, "POST", { member_id: item.id });
        setNotice("Proposition envoyée : le membre doit accepter le suivi.");
      }
      setPending(null); setChosen(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  };

  const usable = coaches.filter((c) => c.active);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const selectCls = "h-10 border rounded-lg px-3 text-sm bg-white";

  return (
    <main className="space-y-5">
      <Link href="/admin/users" className="inline-flex gap-2 items-center text-sm text-primary font-semibold"><ArrowLeft className="h-4 w-4" />Retour aux utilisateurs</Link>
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-primary" />Affectation aux coachs</h1>
        <p className="text-sm text-[#56615A]">Un membre a au plus un coach référent. Il doit accepter la proposition avant que le coach puisse le suivre. L&apos;historique des changements est conservé.</p>
      </header>

      {toReassign > 0 && (
        <button onClick={() => { setSituation("to_reassign"); setPage(1); }} className="w-full text-left rounded-xl border border-[#E3C5BF] bg-[#FBF3F1] px-4 py-3 text-sm text-[#8A3B2E]">
          <b>{toReassign}</b> membre{toReassign > 1 ? "s" : ""} suivi{toReassign > 1 ? "s" : ""} par un coach désactivé {toReassign > 1 ? "attendent" : "attend"} une nouvelle attribution. Afficher la liste.
        </button>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#56615A]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prénom, pseudo ou e-mail…" aria-label="Rechercher un membre" className="w-full h-10 border rounded-lg pl-9 pr-3 text-sm bg-white" />
        </label>
        <select value={memberStatus} onChange={(e) => { setMemberStatus(e.target.value); setPage(1); }} aria-label="Statut du membre" className={selectCls}>
          <option value="approved">Membres approuvés</option><option value="pending">En attente</option>
          <option value="suspended">Suspendus</option><option value="rejected">Refusés</option><option value="all">Tous</option>
        </select>
        <select value={situation} onChange={(e) => { setSituation(e.target.value); setPage(1); }} aria-label="Situation d'affectation" className={selectCls}>
          <option value="">Toutes les situations</option><option value="none">Sans coach</option><option value="pending">En attente du membre</option>
          <option value="active">Suivi actif</option><option value="to_reassign">À réaffecter</option>
        </select>
        <select value={coachFilter} onChange={(e) => { setCoachFilter(e.target.value); setPage(1); }} aria-label="Coach" className={selectCls}>
          <option value="">Tous les coachs</option>
          {coaches.map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name} ({c.active_count + c.pending_count})</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#56615A] border-b">
            <tr><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Coach attribué</th><th className="px-4 py-3">Statut de l&apos;affectation</th><th className="px-4 py-3">Date d&apos;affectation</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {loading ? <tr><td colSpan={5} className="px-4 py-6">Chargement…</td></tr>
              : items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#56615A]">Aucun membre ne correspond à ces critères.</td></tr>
              : items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3"><p className="font-medium">{i.name}</p><p className="text-xs text-[#56615A] break-all">{i.email || i.pseudo || "—"}</p></td>
                  <td className="px-4 py-3">
                    {i.coach ? (
                      <span className="flex items-center gap-2">
                        <CoachAvatar url={i.coach.avatar_url} name={i.coach.name} />
                        <span className="min-w-0"><span className="block font-medium truncate">{i.coach.name}{!i.coach.active && <span className="ml-1 text-xs text-[#8A3B2E]">(désactivé)</span>}</span><span className="block text-xs text-[#56615A] truncate">{i.coach.email}</span></span>
                      </span>
                    ) : <span className="text-[#56615A]">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SITUATION[i.situation].cls}`}>{SITUATION[i.situation].label}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(i.assignment?.assigned_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {i.status === "approved" && (
                      <button disabled={busy || usable.length === 0} onClick={() => { setChosen(""); setPending({ kind: i.situation === "pending" || i.situation === "active" ? "reassign" : "assign", item: i }); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50"><UserPlus className="h-3.5 w-3.5" />{i.situation === "pending" || i.situation === "active" ? "Modifier" : "Attribuer"}</button>
                    )}
                    {(i.situation === "pending" || i.situation === "active") && (
                      <button disabled={busy} onClick={() => setPending({ kind: "remove", item: i })} className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E3C5BF] text-[#8A3B2E] px-2.5 py-1.5 text-xs disabled:opacity-50"><UserMinus className="h-3.5 w-3.5" />Retirer</button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#56615A]">
        <span>{total} membre{total > 1 ? "s" : ""}</span>
        <span className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="border rounded-lg px-3 py-1.5 disabled:opacity-50">Précédent</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="border rounded-lg px-3 py-1.5 disabled:opacity-50">Suivant</button>
        </span>
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="assign-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
            <h2 id="assign-title" className="text-lg font-semibold">
              {pending.kind === "remove" ? "Retirer cette affectation ?" : pending.kind === "reassign" ? "Changer de coach référent ?" : "Attribuer un coach"}
            </h2>
            <p className="text-sm text-[#56615A]">
              {pending.kind === "remove"
                ? `${pending.item.name} ne sera plus suivi par ${pending.item.coach?.name}. L'historique est conservé.`
                : pending.kind === "reassign"
                  ? `${pending.item.name} est actuellement suivi par ${pending.item.coach?.name}. Son dossier actuel sera clos (historique conservé) et le nouveau coach devra recevoir l'accord du membre.`
                  : `Le membre ${pending.item.name} recevra une proposition qu'il devra accepter.`}
            </p>
            {pending.kind !== "remove" && (
              <ul className="max-h-56 overflow-y-auto border rounded-lg divide-y" role="radiogroup" aria-label="Coach">
                {usable.filter((c) => c.user_id !== pending.item.coach?.id).map((c) => (
                  <li key={c.user_id}>
                    <label className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <input type="radio" name="coach" checked={chosen === c.user_id} onChange={() => setChosen(c.user_id)} />
                      <CoachAvatar url={c.avatar_url} name={c.display_name} />
                      <span className="min-w-0"><span className="block text-sm font-medium truncate">{c.display_name}</span><span className="block text-xs text-[#56615A] truncate">{c.email}</span></span>
                    </label>
                  </li>
                ))}
                {usable.length === 0 && <li className="px-3 py-3 text-sm text-[#56615A]">Aucun coach actif disponible.</li>}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setPending(null)} className="border rounded-lg px-4 py-2 text-sm">Annuler</button>
              <button disabled={busy || (pending.kind !== "remove" && !chosen)} onClick={() => void confirm()} className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${pending.kind === "remove" ? "bg-[#8A3B2E]" : "bg-[#486B46]"}`}>
                {busy ? "…" : pending.kind === "remove" ? "Retirer" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </main>
  );
}
