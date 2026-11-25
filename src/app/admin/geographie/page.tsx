"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Layers, MapPin, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { MemberDistribution } from "@/components/admin/geo/member-distribution";
import {
  Badge, Card, EmptyBlock, ErrorState, FilterTabs, LoadingBlock, Pagination, SectionTitle, StatTile, Toast, btn, inputClass,
} from "@/components/admin/admin-ui";

interface Overview {
  units: Array<{ level: number; total: number; withGeometry: number; withSimplified: number }>;
  places: Record<string, number>;
  sources: Array<{ source: string; version: string | null; license: string | null; retrievedAt: string | null; units: number }>;
  placeSources: Array<{ source: string; version: string | null; license: string | null; retrievedAt: string | null; places: number }>;
  members: { located: number; unverified: number; searchEnabled: number; discoverable: number; consentRecorded: number; byDisplayLevel: Record<string, number> };
  regionCounts: Array<{ unitId: string; name: string; count: number | null }>;
}
interface ImportRun {
  id: string; started_at: string; finished_at: string | null; source: string; source_version: string | null; mode: string;
  stats: Record<string, unknown>; anomalies: number; conflicts: number;
}
interface Inconsistency { kind: string; code: string; name: string; detail: string }
interface Place { id: string; name: string; place_type: string; verification_status: string; admin_unit_id: string | null; population: number | null; source: string }
interface ArrOption { id: string; label: string }

const LEVEL_LABELS: Record<number, string> = { 1: "Régions", 2: "Départements", 3: "Arrondissements" };
const DISPLAY_LABELS: Record<string, string> = {
  none: "Ne pas afficher", country: "Pays", region: "Région", department: "Département", arrondissement: "Arrondissement", city: "Ville",
};
const KIND_LABELS: Record<string, string> = {
  unit_orphan: "Unité sans parent", unit_wrong_parent_level: "Parent de mauvais niveau", unit_no_geometry: "Sans géométrie",
  unit_invalid_geometry: "Géométrie invalide", place_wrong_unit_level: "Localité mal rattachée", place_verified_without_unit: "Vérifiée sans arrondissement",
};
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function AdminGeographyPage() {
  const [data, setData] = useState<{ overview: Overview; importRuns: ImportRun[]; inconsistencies: Inconsistency[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/geography", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error || "Impossible de charger le référentiel."); return; }
      setError(null); setData(j);
    } catch { setError("Impossible de charger le référentiel."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorState description={error ?? undefined} onRetry={load} />;
  const { overview: o, importRuns, inconsistencies } = data;
  const totalPlaces = Object.values(o.places).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Géographie" subtitle="Répartition des membres au Cameroun et dans le monde, qualité du référentiel. Aucune coordonnée ni localisation individuelle n'est visible ici." />

      <MemberDistribution />

      <section className="space-y-3">
        <SectionTitle title="Référentiel importé" />
        {o.units.length === 0 ? (
          <EmptyBlock icon={Layers} title="Aucune unité importée" description="Lancez l'import du référentiel (scripts/geo/import-cameroon.mjs) puis rechargez cette page." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {o.units.map((u) => (
              <StatTile key={u.level} icon={Layers} label={LEVEL_LABELS[u.level] ?? `Niveau ${u.level}`} value={u.total}
                hint={`${u.withGeometry} avec géométrie · ${u.withSimplified} simplifiées`} tone={u.withGeometry < u.total ? "amber" : "green"} />
            ))}
            <StatTile icon={MapPin} label="Localités" value={totalPlaces}
              hint={`${o.places.verified ?? 0} vérifiées · ${o.places.unverified ?? 0} à valider · ${o.places.rejected ?? 0} rejetées`} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle title="Sources, versions et licences" subtitle="Les attributions s'affichent sous la carte pour les membres." />
        <Card className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[#5F6B63]"><th className="p-3">Source</th><th className="p-3">Version</th><th className="p-3">Licence</th><th className="p-3">Récupérée le</th><th className="p-3">Éléments</th></tr></thead>
            <tbody>
              {[...o.sources.map((s) => ({ ...s, n: s.units })), ...o.placeSources.map((s) => ({ ...s, n: s.places }))].map((s, i) => (
                <tr key={i} className="border-t border-[#E8E5E0]">
                  <td className="p-3 font-medium text-[#1F2A23]">{s.source}</td>
                  <td className="p-3">{s.version ?? <Badge tone="amber">non renseignée</Badge>}</td>
                  <td className="p-3">{s.license ?? <Badge tone="amber">non renseignée</Badge>}</td>
                  <td className="p-3">{fmtDate(s.retrievedAt)}</td>
                  <td className="p-3 tabular-nums">{s.n}</td>
                </tr>
              ))}
              {o.sources.length + o.placeSources.length === 0 && <tr><td className="p-3 text-[#5F6B63]" colSpan={5}>Aucune source enregistrée.</td></tr>}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle title="Derniers imports" />
        {importRuns.length === 0 ? (
          <EmptyBlock icon={Eye} title="Aucun import enregistré" />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[#5F6B63]"><th className="p-3">Date</th><th className="p-3">Source</th><th className="p-3">Mode</th><th className="p-3">Anomalies</th><th className="p-3">Conflits signalés</th></tr></thead>
              <tbody>
                {importRuns.map((r) => (
                  <tr key={r.id} className="border-t border-[#E8E5E0]">
                    <td className="p-3">{fmtDate(r.started_at)}</td>
                    <td className="p-3">{r.source}{r.source_version ? ` · ${r.source_version}` : ""}</td>
                    <td className="p-3"><Badge tone={r.mode === "apply" ? "green" : "neutral"}>{r.mode === "apply" ? "appliqué" : "simulation"}</Badge></td>
                    <td className="p-3"><Badge tone={r.anomalies ? "amber" : "green"}>{r.anomalies}</Badge></td>
                    <td className="p-3"><Badge tone={r.conflicts ? "amber" : "green"}>{r.conflicts}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle title="Incohérences du référentiel" subtitle="Contrôles parent-enfant, géométries et rattachements." />
        {inconsistencies.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-[14px] text-[#486B46]"><CheckCircle2 className="w-5 h-5" /> Aucune incohérence détectée.</Card>
        ) : (
          <Card className="divide-y divide-[#E8E5E0]">
            {inconsistencies.map((i, k) => (
              <div key={k} className="flex flex-wrap items-center gap-3 p-3 text-[13px]">
                <Badge tone="amber" icon={AlertTriangle}>{KIND_LABELS[i.kind] ?? i.kind}</Badge>
                <span className="font-medium text-[#1F2A23]">{i.name}</span>
                <span className="text-[#5F6B63]">{i.code} — {i.detail}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Consentements de localisation (découverte entre membres)"
          subtitle="Réglages choisis par les membres pour la recherche par zone. Ces chiffres ne représentent pas l'ensemble des membres : la répartition réelle figure dans les cartes ci-dessus."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Users} label="Localisation renseignée" value={o.members.located} />
          <StatTile icon={ShieldCheck} label="Peuvent apparaître dans les recherches" value={o.members.discoverable} />
          <StatTile icon={MapPin} label="Utilisent la recherche par zone" value={o.members.searchEnabled} />
          <StatTile icon={AlertTriangle} label="Localisation non vérifiée" value={o.members.unverified} tone="amber" />
        </div>
        <Card className="p-4 space-y-2 text-[13px]">
          <p className="font-semibold text-[#1F2A23]">Niveau d'affichage choisi</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DISPLAY_LABELS).map(([k, label]) => <Badge key={k} tone="neutral">{label} : {o.members.byDisplayLevel[k] ?? 0}</Badge>)}
          </div>
        </Card>
      </section>

      <PlacesReview />
    </div>
  );
}

function PlacesReview() {
  const [status, setStatus] = useState<"unverified" | "verified" | "rejected">("unverified");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [places, setPlaces] = useState<Place[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [options, setOptions] = useState<ArrOption[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ status, page: String(page) });
    if (q.trim()) p.set("q", q.trim());
    if (options.length === 0) p.set("options", "1");
    try {
      const res = await fetch(`/api/admin/geography/places?${p}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Lecture impossible."); return; }
      setErr(null); setPlaces(j.places); setTotal(j.total); setPageSize(j.pageSize);
      if (j.options) setOptions(j.options);
    } catch { setErr("Lecture impossible."); }
  }, [status, q, page, options.length]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const act = async (id: string, body: Record<string, unknown>, done: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/geography/places/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Échec.");
      setNotice({ kind: "success", text: done }); await load();
    } catch (e) { setNotice({ kind: "error", text: (e as Error).message }); }
    finally { setBusy(null); setTimeout(() => setNotice(null), 3500); }
  };

  const arrLabel = (id: string | null) => options.find((o) => o.id === id)?.label;

  return (
    <section className="space-y-3">
      <SectionTitle title="Localités à valider" subtitle="Une localité n'est « vérifiée » qu'une fois rattachée à un arrondissement." />
      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs label="Statut" value={status} onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ value: "unverified", label: "À valider" }, { value: "verified", label: "Vérifiées" }, { value: "rejected", label: "Rejetées" }]} />
        <input className={`${inputClass} max-w-xs`} placeholder="Rechercher une localité" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {err && <p className="text-sm text-[#B83333]">{err}</p>}
      {places.length === 0 && !err ? (
        <EmptyBlock icon={CheckCircle2} title="Rien à traiter ici" description="Aucune localité ne correspond à ce filtre." />
      ) : (
        <Card className="divide-y divide-[#E8E5E0]">
          {places.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-[13px]">
              <div className="min-w-0">
                <p className="font-semibold text-[#1F2A23]">{p.name}{p.population ? <span className="ml-2 font-normal text-[#5F6B63]">{p.population.toLocaleString("fr-FR")} hab.</span> : null}</p>
                <p className="text-[#5F6B63]">{p.place_type} · {p.source} · {p.admin_unit_id ? (arrLabel(p.admin_unit_id) ?? "arrondissement rattaché") : "sans arrondissement"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${inputClass} !h-8 max-w-[220px] !text-[13px]`} value={pick[p.id] ?? ""} onChange={(e) => setPick((s) => ({ ...s, [p.id]: e.target.value }))} aria-label="Arrondissement">
                  <option value="">Rattacher à…</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <button className={btn.small} disabled={busy === p.id || !pick[p.id]} onClick={() => act(p.id, { action: "attach", arrondissementId: pick[p.id] }, "Localité rattachée et vérifiée.")}>Rattacher</button>
                {p.verification_status !== "verified" && p.admin_unit_id && <button className={btn.small} disabled={busy === p.id} onClick={() => act(p.id, { action: "validate" }, "Localité validée.")}>Valider</button>}
                {p.verification_status !== "rejected" && <button className={btn.small} disabled={busy === p.id} onClick={() => act(p.id, { action: "reject" }, "Localité rejetée.")}>Rejeter</button>}
                {p.verification_status !== "unverified" && <button className={btn.small} disabled={busy === p.id} onClick={() => act(p.id, { action: "reopen" }, "Localité rouverte.")}>Rouvrir</button>}
              </div>
            </div>
          ))}
        </Card>
      )}
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} onPage={setPage} />
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </section>
  );
}
