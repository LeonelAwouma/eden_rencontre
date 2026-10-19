"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, Clock, ExternalLink, Lightbulb, RefreshCw, Smartphone, TriangleAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, DetailItem, EmptyBlock, FilterTabs, LoadingBlock, StatTile, btn, inputClass } from "@/components/admin/admin-ui";
import { CATEGORY_LABELS, type IncidentCategory, type IncidentGroup, type IncidentSummary, type IncidentSeverity } from "@/lib/incidents";

interface Member { id: string; name: string | null; pseudo: string | null; email: string | null; status: string | null }
type Row = IncidentGroup & { member: Member | null };
interface Payload { incidents: Row[]; summary: IncidentSummary; truncated: boolean }

type Period = "7" | "30" | "all";
type CategoryFilter = "all" | IncidentCategory;

const SEVERITY: Record<IncidentSeverity, { tone: "red" | "amber" | "neutral"; label: string }> = {
  high: { tone: "red", label: "Membre bloqué" },
  medium: { tone: "amber", label: "À surveiller" },
  low: { tone: "neutral", label: "Information" },
};
/** Le contrôle des comptes ne bloque pas un membre : « action requise » plutôt que « membre bloqué ». */
const severityFor = (row: { category: IncidentCategory; severity: IncidentSeverity }) =>
  row.category === "health" && row.severity === "high" ? { tone: "red" as const, label: "Action requise" } : SEVERITY[row.severity];
const ACCOUNT_STATUS: Record<string, string> = { pending: "en attente", approved: "approuvé", rejected: "rejeté", suspended: "suspendu" };

const fullDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
function relative(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Paramètres → Pannes : les pannes vécues par les membres (notifications
 * « Panne vécue par un membre », échecs d'inscription, contrôle des comptes),
 * avec leur cause, l'appareil, ce que cela signifie et quoi faire.
 */
export function IncidentsPanel({ initial }: { initial?: Payload }) {
  const [data, setData] = useState<Payload | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [kind, setKind] = useState("");
  const [period, setPeriod] = useState<Period>("30");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ days: period });
      if (category !== "all") qs.set("category", category);
      if (kind) qs.set("kind", kind);
      const res = await fetch(`/api/admin/incidents?${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Lecture des pannes impossible.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture des pannes impossible.");
    } finally {
      setLoading(false);
    }
  }, [period, category, kind]);

  // `initial` (aperçu) évite l'appel réseau.
  useEffect(() => { if (!initial) void load(); }, [load, initial]);

  const summary = data?.summary;
  const kinds = summary ? Object.entries(summary.byKind).filter(([, k]) => category === "all" || k.category === category) : [];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Pannes vécues par les membres</h2>
          <p className="text-[13px] text-[#5F6B63] mt-0.5 max-w-2xl">
            Le détail des notifications « Panne vécue par un membre », des échecs d'inscription et du contrôle des comptes : qui est touché, où, pourquoi, et quoi faire.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className={btn.secondary}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Actualiser
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <StatTile icon={TriangleAlert} label={period === "all" ? "Pannes enregistrées" : `Pannes sur ${period} jours`} value={summary.total}
            hint={summary.groups !== summary.total ? `${summary.groups} cas distincts` : undefined} />
          <StatTile icon={Users} label="Membres touchés" value={summary.members} />
          <StatTile icon={Clock} label="Dernière panne" value={summary.lastAt ? relative(summary.lastAt) : "—"} />
        </div>
      )}

      {/* Filtres sur une ligne */}
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <FilterTabs<CategoryFilter> label="Catégorie de panne" value={category} onChange={(v) => { setCategory(v); setKind(""); setOpenKey(null); }}
          options={[
            { value: "all", label: "Toutes", count: summary?.total },
            { value: "access", label: "Accès", count: summary?.byCategory.access },
            { value: "registration", label: "Inscription", count: summary?.byCategory.registration },
            { value: "health", label: "Contrôle des comptes", count: summary?.byCategory.health },
          ]} />
        {kinds.length > 1 && (
          <select value={kind} onChange={(e) => { setKind(e.target.value); setOpenKey(null); }} aria-label="Type de panne" className={cn(inputClass, "w-auto min-w-[200px]")}>
            <option value="">Tous les types</option>
            {kinds.map(([k, info]) => <option key={k} value={k}>{info.label} ({info.count})</option>)}
          </select>
        )}
        <FilterTabs<Period> label="Période" value={period} onChange={(v) => { setPeriod(v); setOpenKey(null); }} className="ml-auto"
          options={[{ value: "7", label: "7 jours" }, { value: "30", label: "30 jours" }, { value: "all", label: "Tout" }]} />
      </div>

      <div className="mt-4 space-y-3">
        {loading && !data ? (
          <LoadingBlock label="Chargement des pannes…" />
        ) : error ? (
          <p role="alert" className="p-4 rounded-xl bg-[#D64545]/[0.08] border border-[#D64545]/20 text-[14px] font-medium text-[#B83333] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </p>
        ) : !data || data.incidents.length === 0 ? (
          <EmptyBlock icon={CheckCircle2} title="Aucune panne sur cette période"
            description="Aucun membre n'a signalé de problème : tout fonctionne. Les pannes s'affichent ici dès qu'elles surviennent." />
        ) : (
          data.incidents.map((row) => <IncidentCard key={row.id} row={row}
            open={openKey === row.id} onToggle={() => setOpenKey(openKey === row.id ? null : row.id)} />)
        )}
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-[#6B746E]">
        Une même panne vécue plusieurs fois par le même membre est regroupée (« ×N »). Le site n'envoie qu'une notification par membre, par type de panne et par période de 6 heures :
        les répétitions plus rapprochées peuvent donc ne pas apparaître.
        {data?.truncated && " Seules les 500 notifications les plus récentes sont analysées."}
      </p>
    </>
  );
}

function IncidentCard({ row, open, onToggle }: { row: Row; open: boolean; onToggle: () => void }) {
  const sev = severityFor(row);
  const who = row.member
    ? (row.member.pseudo || row.member.name || row.member.email || "Membre")
    : row.email || (row.category === "health" ? "Contrôle automatique" : "Membre non identifié");
  const status = row.member?.status ? ACCOUNT_STATUS[row.member.status] ?? row.member.status : null;
  const memberHref = row.member ? `/admin/users/${row.member.id}` : row.userId ? `/admin/users/${row.userId}` : null;

  return (
    <article className="rounded-2xl border border-[#E8E5E0] bg-white overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="w-full flex items-start gap-3 px-4 sm:px-5 py-4 text-left hover:bg-[#FAF8F5] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
        <span className="mt-0.5 shrink-0 hidden sm:block"><Badge tone={sev.tone}>{sev.label}</Badge></span>
        <span className="min-w-0 flex-1">
          {/* Petit écran : le badge passe au-dessus du titre pour laisser la place au texte */}
          <span className="sm:hidden mb-1.5 flex items-center justify-between gap-2">
            <Badge tone={sev.tone}>{sev.label}</Badge>
            <span className="text-[12px] text-[#6B746E] tabular-nums">{relative(row.lastSeen)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] font-semibold text-[#1F2A23] leading-snug">{row.label}</span>
            {row.count > 1 && <Badge tone="neutral" dot={false}>×{row.count}</Badge>}
          </span>
          <span className="block text-[13px] text-[#5F6B63] mt-0.5 break-words">
            {who}{status && <span className="text-[#8A938D]"> · compte {status}</span>}
            {row.path && <span className="text-[#8A938D]"> · {row.path}</span>}
          </span>
        </span>
        <span className="hidden sm:block text-[12px] text-[#6B746E] shrink-0 mt-0.5 tabular-nums" title={fullDate(row.lastSeen)}>{relative(row.lastSeen)}</span>
        <ChevronDown className={cn("w-4 h-4 text-[#8A938D] shrink-0 mt-1 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="border-t border-[#F1EEE9] px-4 sm:px-5 py-4 space-y-4">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <DetailItem label="Dernière occurrence">{fullDate(row.lastSeen)}</DetailItem>
            {row.count > 1 && <DetailItem label="Première occurrence">{fullDate(row.firstSeen)}</DetailItem>}
            {row.path && <DetailItem label="Page concernée">{row.path}</DetailItem>}
            {row.flow && <DetailItem label="Type d'inscription">{row.flow === "google" ? "Google" : "Classique"}</DetailItem>}
            {row.device && (
              <DetailItem label="Appareil">
                <span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-[#6B746E]" aria-hidden="true" />{row.device.browser} · {row.device.os}</span>
                {row.device.inApp && <span className="block text-[12px] text-[#8A4F05] mt-0.5">Ouvert depuis l'application {row.device.inApp} : ces navigateurs intégrés peuvent perturber les envois.</span>}
              </DetailItem>
            )}
            {row.ip && <DetailItem label="Adresse IP">{row.ip}</DetailItem>}
          </div>

          {row.cause && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B746E]">Cause technique</p>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-[#FAF8F5] border border-[#F1EEE9] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#2F3A33] font-mono">{row.cause}</pre>
            </div>
          )}

          <div className="rounded-xl bg-[#FAF8F5] px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B746E]">Ce que cela signifie</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#2F3A33]">{row.explanation}</p>
          </div>
          <div className="rounded-xl bg-primary/[0.06] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-primary"><Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> Que faire</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#2F3A33]">{row.advice}</p>
          </div>

          {memberHref && (
            <Link href={memberHref} className={btn.small}>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Ouvrir la fiche du membre
            </Link>
          )}
          <p className="text-[11px] text-[#8A938D]">{CATEGORY_LABELS[row.category]}</p>
        </div>
      )}
    </article>
  );
}
