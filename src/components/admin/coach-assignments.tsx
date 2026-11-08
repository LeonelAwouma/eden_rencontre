"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, UserMinus, UserPlus } from "lucide-react";

type Assignment = {
  id: string; member_id: string; member_pseudo: string | null; status: string; consent_status: string;
  assigned_by: string; assigned_at: string; consent_at: string | null; ended_at: string | null; end_reason: string | null;
};
type Candidate = { id: string; name: string | null; pseudo: string | null; email: string | null };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente du membre", cls: "bg-[#FBF3E0] text-[#8A6A1F]" },
  active: { label: "Actif (consentement donné)", cls: "bg-[#EEF5EC] text-[#486B46]" },
  declined: { label: "Refusé par le membre", cls: "bg-[#F4ECEA] text-[#8A3B2E]" },
  revoked: { label: "Consentement retiré", cls: "bg-[#F4ECEA] text-[#8A3B2E]" },
  ended: { label: "Terminé", cls: "bg-[#EEF0EE] text-[#56615A]" },
};
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

/** Attributions d'un coach : historique, attribution (le membre doit accepter) et fin d'accompagnement. */
export function CoachAssignments({ coachId, coachActive }: { coachId: string; coachActive: boolean }) {
  const base = `/api/admin/coaches/${coachId}/assignments`;
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(base, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.assignments || []); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur de chargement"); }
    finally { setLoading(false); }
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  // Recherche limitée aux comptes membres : le filtre est aussi appliqué côté serveur (kind=member).
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?kind=member&limit=8&q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
        const data = await res.json();
        setResults(res.ok ? data.users || [] : []);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (method: "POST" | "PATCH", body: unknown, ok: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(base, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Opération refusée");
      setNotice(ok); setQ(""); setResults([]); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  };

  const open = items.filter((a) => a.status === "pending" || a.status === "active");
  const history = items.filter((a) => a.status !== "pending" && a.status !== "active");

  return (
    <div className="rounded-xl border bg-[#FAF9F6] p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Membres accompagnés</h3>
        <p className="text-xs text-[#56615A]">Un membre ne devient visible par le coach qu&apos;après avoir accepté le suivi. Réattribuer un membre clôt son dossier précédent (l&apos;historique est conservé).</p>
      </div>

      {coachActive ? (
        <div className="space-y-2">
          <label className="relative block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#56615A]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un membre (nom, pseudo, e-mail)…" aria-label="Rechercher un membre" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-white" />
          </label>
          {results.length > 0 && (
            <ul className="border rounded-lg bg-white divide-y">
              {results.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{m.pseudo || m.name || "Membre"} <span className="text-xs text-[#56615A]">{m.email}</span></span>
                  <button disabled={busy} onClick={() => void act("POST", { member_id: m.id }, "Proposition envoyée : le membre doit accepter le suivi.")} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs disabled:opacity-50"><UserPlus className="h-3.5 w-3.5" />Attribuer</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : <p className="text-xs text-[#8A3B2E]">Ce coach est suspendu : aucune attribution possible.</p>}

      {loading ? <p className="text-sm">Chargement…</p> : (
        <>
          {open.length === 0 ? <p className="text-sm text-[#56615A]">Aucun membre en cours d&apos;accompagnement.</p> : (
            <ul className="divide-y">
              {open.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0"><b>{a.member_pseudo || "Membre"}</b> <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[a.status]?.cls}`}>{STATUS[a.status]?.label}</span>
                    <span className="block text-xs text-[#56615A]">Proposé le {fmt(a.assigned_at)}{a.consent_at ? ` · accepté le ${fmt(a.consent_at)}` : ""}</span></span>
                  <button disabled={busy} onClick={() => void act("PATCH", { assignment_id: a.id, reason: "admin_terminated" }, "Accompagnement terminé.")} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs disabled:opacity-50"><UserMinus className="h-3.5 w-3.5" />Mettre fin</button>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">Historique ({history.length})</summary>
              <ul className="mt-2 divide-y">
                {history.map((a) => (
                  <li key={a.id} className="py-1.5 text-xs text-[#56615A]">
                    <b className="text-foreground">{a.member_pseudo || "Membre"}</b> · {STATUS[a.status]?.label} · {fmt(a.assigned_at)} → {fmt(a.ended_at)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </div>
  );
}
