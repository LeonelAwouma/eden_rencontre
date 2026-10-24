"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Heart, HeartHandshake, Gem, Clock, XCircle, Search, X, ChevronLeft, ChevronRight, MessageCircle, UserRound,
  Sparkles, CalendarHeart, Users, Gauge, RefreshCw, CheckCircle2, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { computeDisplayMatch, type AdapterInput } from "@/lib/matching/adapter";
import { pickMatchFields } from "@/lib/social";

/**
 * Admin → Matching : chaque couple et son parcours.
 * Un VRAI match : un membre clique sur « S'engager » et l'autre valide.
 * Avant cela : demande d'alliance, puis « en relation » (alliance acceptée).
 * Données : /api/admin/matching/couples.
 */

type Stage = "alliance_pending" | "relation" | "engagement_pending" | "match" | "engagement_declined" | "declined";

interface CoupleProfile {
  id: string; name?: string | null; pseudo?: string | null; email?: string | null; gender?: string | null;
  birth_date?: string | null; city?: string | null; country?: string | null; region?: string | null;
  civil_status?: string | null; profession?: string | null; avatar_url?: string | null;
  verification_status?: string | null; status?: string | null; questionnaire?: Record<string, unknown> | null;
}
interface Couple {
  id: string; stage: Stage; alliance_status: string; requested_at: string; relation_at: string | null; matched_at: string | null; updated_at: string;
  requester: CoupleProfile; addressee: CoupleProfile;
  engagement: { status: string; requested_at: string; responded_at: string | null; requester_id: string } | null;
  conversation: { id: string | null; message_count: number; last_message_at: string | null };
}
interface Stats { accepted: number; engagement_declined: number; match: number; matchThisWeek: number; engagement_pending: number; relation: number; alliance_pending: number; declined: number; all: number }
type TabKey = "accepted" | "match" | "engagement_pending" | "relation" | "alliance_pending" | "declined" | "all";

const TABS: { value: TabKey; label: string; icon: typeof Heart }[] = [
  { value: "accepted", label: "Alliances acceptées", icon: HeartHandshake },
  { value: "match", label: "Matchs", icon: Gem },
  { value: "engagement_pending", label: "Engagement à valider", icon: HeartHandshake },
  { value: "relation", label: "En relation", icon: MessageCircle },
  { value: "alliance_pending", label: "Demandes d'alliance", icon: Clock },
  { value: "declined", label: "Refusés", icon: XCircle },
  { value: "all", label: "Tout", icon: Users },
];

const STAGE: Record<Stage, { label: string; className: string; icon: typeof Heart }> = {
  alliance_pending: { label: "Demande d'alliance", className: "bg-[#F4F1EA] text-[#6B5A2E]", icon: Clock },
  relation: { label: "En relation", className: "bg-primary/10 text-primary", icon: MessageCircle },
  engagement_pending: { label: "Engagement à valider", className: "bg-primary/15 text-primary", icon: HeartHandshake },
  match: { label: "Match", className: "bg-primary text-white", icon: Gem },
  engagement_declined: { label: "Engagement refusé", className: "bg-muted text-[#6B746E]", icon: XCircle },
  declined: { label: "Alliance refusée", className: "bg-muted text-[#6B746E]", icon: XCircle },
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

function relative(iso: string | null): string {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `il y a ${Math.floor(s / 86400)} j`;
  return formatDate(iso);
}

function age(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

const toInput = (p: CoupleProfile, questionnaire: Record<string, unknown> | null | undefined): AdapterInput => ({
  id: p.id, name: p.pseudo || p.name, email: p.email, gender: p.gender, birthDate: p.birth_date, city: p.city,
  country: p.country, region: p.region, civilStatus: p.civil_status, profession: p.profession,
  avatar_url: p.avatar_url, verification_status: p.verification_status, questionnaire: (questionnaire || {}) as Record<string, any>,
});

/** Même calcul que celui affiché aux membres (questionnaire complet d'un côté, champs « matching » de l'autre). */
function compatibility(c: Couple): number | null {
  if (!c.requester.questionnaire && !c.addressee.questionnaire) return null;
  try {
    return computeDisplayMatch(toInput(c.requester, c.requester.questionnaire), toInput(c.addressee, pickMatchFields(c.addressee.questionnaire))).score;
  } catch {
    return null;
  }
}

export default function AdminMatchingPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [stats, setStats] = useState<Stats>({ accepted: 0, engagement_declined: 0, match: 0, matchThisWeek: 0, engagement_pending: 0, relation: 0, alliance_pending: 0, declined: 0, all: 0 });
  const [stage, setStage] = useState<TabKey>("accepted");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagementsAvailable, setEngagementsAvailable] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ stage, page: String(page), limit: "20" });
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/admin/matching/couples?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Impossible de charger les couples."); return; }
      setError(null);
      setCouples(data.couples || []);
      setStats(data.stats);
      setEngagementsAvailable(data.engagementsAvailable !== false);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("Impossible de charger les couples.");
    } finally {
      setLoading(false);
    }
  }, [stage, page, debounced]);

  useEffect(() => { load(); }, [load]);

  const scores = useMemo(() => new Map(couples.map((c) => [c.id, compatibility(c)])), [couples]);
  const tabCount = (v: TabKey) => stats[v];

  const currentTabLabel = TABS.find((t) => t.value === stage)?.label || "Tous les duos";
  return (
    <div className="max-w-6xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Matching et alliances</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-[#56615A] max-w-2xl">
            Suivez chaque demande, les alliances acceptées et les engagements confirmés. Chaque duo est comptabilisé une seule fois.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-white text-xs font-semibold text-[#3F4A43] hover:border-primary/50 disabled:opacity-50">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" /> Actualiser
        </button>
      </header>

      <section aria-labelledby="overview-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="overview-title" className="text-[16px] font-bold text-foreground">Vue d'ensemble</h2>
          <span className="text-xs text-[#56615A]">Dossiers distincts, tous statuts confondus</span>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatTile label="Duos suivis" value={stats.all} icon={Users} hint="Ensemble des demandes" />
          <StatTile label="En attente de réponse" value={stats.alliance_pending} icon={Clock} hint="Demandes d'alliance reçues" />
          <StatTile label="Alliances acceptées" value={stats.accepted} icon={HeartHandshake} hint="Inclut les étapes suivantes" />
          <StatTile label="Alliances refusées" value={stats.declined - stats.engagement_declined} icon={XCircle} hint="Demandes déclinées" />
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <h3 className="text-[13px] font-bold text-foreground">Où en sont les {stats.accepted} alliances acceptées ?</h3>
            <span className="text-[12px] text-[#6B746E]">Répartition par étape actuelle, sans doublons</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "En relation", value: stats.relation, icon: MessageCircle },
              { label: "Engagement à valider", value: stats.engagement_pending, icon: HeartHandshake },
              { label: "Match confirmé", value: stats.match, icon: Gem },
              { label: "Engagement refusé", value: stats.engagement_declined, icon: XCircle },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/80 bg-[#FAFAF9] px-3 py-2.5 flex items-center gap-3">
                <item.icon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xl leading-none font-bold tabular-nums text-foreground">{item.value}</p>
                  <p className="mt-1 text-[11px] leading-tight text-[#56615A]">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#6B746E]">
            « Alliance acceptée » ne signifie pas encore « match confirmé » : ce dernier nécessite un engagement accepté par les deux membres.
          </p>
        </div>
      </section>

      <section aria-labelledby="results-title" className="space-y-4">
        <div className="rounded-2xl border border-border bg-white px-4 py-4 sm:px-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="results-title" className="text-[16px] font-bold text-foreground">Suivi des duos</h2>
              <p className="text-xs text-[#56615A] mt-0.5">Choisissez un état pour afficher les dossiers correspondants.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Nom, pseudo ou e-mail" aria-label="Rechercher un membre"
                className="w-full h-10 pl-9 pr-9 border border-border bg-white rounded-xl text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              {search && <button type="button" onClick={() => { setSearch(""); setPage(1); }} aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6B746E] hover:bg-muted"><X className="w-4 h-4" /></button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les duos selon leur état">
            {TABS.map((t) => {
              const active = stage === t.value;
              return <button key={t.value} type="button" aria-pressed={active}
                onClick={() => { setStage(t.value); setPage(1); }}
                className={cn("inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors",
                  active ? "bg-primary border-primary text-white" : "bg-white border-border text-[#3F4A43] hover:bg-muted hover:border-primary/40")}>
                <t.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t.label}
                <span className={cn("rounded-md min-w-[20px] px-1 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-muted text-[#56615A]")}>{tabCount(t.value)}</span>
              </button>;
            })}
          </div>
        </div>

        {!engagementsAvailable && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Les engagements ne sont pas disponibles ; les matchs confirmés peuvent être sous-estimés.
        </p>}
        {error && <p role="alert" className="rounded-xl border border-[#B42318]/20 bg-[#B42318]/10 p-3 text-sm text-[#B42318]">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[14px] font-bold text-foreground">{currentTabLabel}</h3>
          <span className="text-[12px] text-[#56615A] tabular-nums">{total} résultat{total > 1 ? "s" : ""}{debounced ? " pour cette recherche" : ""}</span>
        </div>

        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl border border-border animate-pulse" />)}
          </div>
        ) : couples.length === 0 && !error ? (
          <div className="bg-white rounded-2xl border border-border py-12 px-6 text-center">
            <HeartHandshake className="w-8 h-8 text-primary/60 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">{debounced ? "Aucun duo trouvé" : "Aucun dossier dans cette catégorie"}</p>
            <p className="text-xs text-[#56615A] mt-1">{debounced ? "Essayez un autre nom ou pseudonyme." : "Les dossiers apparaîtront ici au fil de leur progression."}</p>
          </div>
        ) : !error ? (
          <ul className="space-y-2.5">
            {couples.map((c) => <CoupleCard key={c.id} c={c} score={scores.get(c.id) ?? null} />)}
          </ul>
        ) : null}

        {!loading && !error && total > 0 && (
          <nav aria-label="Pagination des duos" className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#6B746E]">Page {page} sur {totalPages} · {total} duo{total > 1 ? "s" : ""}</p>
            {totalPages > 1 && <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                aria-label="Page précédente" className="w-9 h-9 rounded-lg border border-border bg-white grid place-items-center disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                aria-label="Page suivante" className="w-9 h-9 rounded-lg border border-border bg-white grid place-items-center disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>}
          </nav>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, hint }: { label: string; value: number; icon: typeof Heart; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#56615A]">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="mt-1.5 text-[28px] leading-none font-bold text-foreground tabular-nums tracking-tight">{value.toLocaleString("fr-FR")}</p>
      {hint && <p className="mt-1 text-[11.5px] text-[#6B746E]">{hint}</p>}
    </div>
  );
}

function Member({ p, align }: { p: CoupleProfile; align: "left" | "right" }) {
  const display = p.pseudo || p.name || "Membre";
  const a = age(p.birth_date);
  const place = [p.city, p.country].filter(Boolean).join(", ");
  return (
    <Link href={`/admin/users/${p.id}`} className={cn("group flex items-center gap-3 min-w-0", align === "right" && "sm:flex-row-reverse sm:text-right")}>
      <Avatar className="w-12 h-12 border-2 border-white shadow-sm shrink-0">
        <AvatarImage src={avatarSrc(p.avatar_url ?? undefined, 128)} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold">{display.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-bold text-foreground truncate group-hover:text-primary">{display}</span>
        {p.name && p.pseudo && <span className="block text-[12px] text-[#6B746E] truncate">{p.name}</span>}
        <span className="block text-[12px] text-[#56615A] truncate">{[a !== null ? `${a} ans` : null, place].filter(Boolean).join(" · ") || "—"}</span>
      </span>
    </Link>
  );
}

function CoupleCard({ c, score }: { c: Couple; score: number | null }) {
  const st = STAGE[c.stage];
  const isMatch = c.stage === "match";
  const inRelation = c.stage !== "alliance_pending" && c.stage !== "declined";
  const engagementBy = c.engagement?.requester_id === c.requester.id ? c.requester : c.addressee;
  return (
    <li className={cn("bg-white rounded-2xl border p-4 sm:p-5", isMatch ? "border-primary/40" : "border-border")}>
      {/* Les deux membres, reliés par le cœur du match */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
        <Member p={c.requester} align="left" />
        <div className="flex sm:flex-col items-center gap-2 justify-center">
          <span className={cn("w-10 h-10 rounded-full flex items-center justify-center",
            isMatch ? "bg-primary text-white" : inRelation ? "bg-primary/10 text-primary" : "bg-muted text-[#8A938C]")}>
            <st.icon className="w-5 h-5" />
          </span>
          <span className={cn("inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-bold whitespace-nowrap", st.className)}>{st.label}</span>
        </div>
        <Member p={c.addressee} align="right" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        {([
          { label: "Demande d’alliance", active: true, done: c.alliance_status === "accepted", date: c.requested_at },
          { label: "Alliance acceptée", active: c.alliance_status === "accepted", done: c.alliance_status === "accepted", date: c.relation_at },
          { label: "Engagement demandé", active: !!c.engagement, done: !!c.engagement, date: c.engagement?.requested_at || null },
          { label: "Match confirmé", active: isMatch, done: isMatch, date: c.matched_at },
        ]).map((step, index) => <div key={step.label} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#A0A9A2]" aria-hidden />}
          <span title={step.date ? formatDate(step.date) : undefined}
            className={cn("inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
              step.done ? "bg-primary/10 text-primary" : "bg-muted text-[#6B746E]")}>
            {step.done ? "✓ " : ""}{step.label}
          </span>
        </div>)}
        {(c.stage === "declined" || c.stage === "engagement_declined") && <span className="text-xs font-semibold text-[#9A4D3C]">· {st.label}</span>}
      </div>
      {/* Repères du couple */}
      <div className="mt-3 pt-3.5 border-t border-border/70 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-[12.5px]">
        <Fact icon={Gauge} label="Compatibilité">
          {score === null ? <span className="text-[#6B746E]">Questionnaire incomplet</span>
            : <span className="font-bold text-foreground tabular-nums">{score} %</span>}
        </Fact>
        <Fact icon={isMatch ? CalendarHeart : Clock} label={isMatch ? "Match le" : inRelation ? "En relation depuis" : "Demande d'alliance le"}>
          {formatDate(isMatch ? c.matched_at : inRelation ? c.relation_at : c.requested_at)}
        </Fact>
        <Fact icon={MessageCircle} label="Conversation">
          {c.conversation.id
            ? <>{c.conversation.message_count} message{c.conversation.message_count > 1 ? "s" : ""}{c.conversation.last_message_at && <span className="text-[#6B746E]"> · {relative(c.conversation.last_message_at)}</span>}</>
            : <span className="text-[#6B746E]">Pas encore commencée</span>}
        </Fact>
        <Fact icon={Gem} label="Engagement">
          {!c.engagement ? <span className="text-[#6B746E]">—</span>
            : c.engagement.status === "accepted" ? <>Validé · demandé par {engagementBy.pseudo || engagementBy.name || "un membre"}</>
            : c.engagement.status === "pending" ? <>Demandé par {engagementBy.pseudo || engagementBy.name || "un membre"} le {formatDate(c.engagement.requested_at)}</>
            : <span className="text-[#6B746E]">Refusé</span>}
        </Fact>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <Link href={`/admin/users/${c.requester.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
          <UserRound className="w-3.5 h-3.5" /> {c.requester.pseudo || c.requester.name || "Profil"}
        </Link>
        <Link href={`/admin/users/${c.addressee.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
          <UserRound className="w-3.5 h-3.5" /> {c.addressee.pseudo || c.addressee.name || "Profil"}
        </Link>
        {c.conversation.id && (
          <Link href={`/admin/chat-monitoring?user=${c.requester.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-primary hover:bg-primary/5">
            <Sparkles className="w-3.5 h-3.5" /> Voir leur conversation
          </Link>
        )}
      </div>
    </li>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Heart; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8A938C]"><Icon className="w-3.5 h-3.5 text-primary" /> {label}</p>
      <p className="mt-0.5 text-[#3F4A43] truncate">{children}</p>
    </div>
  );
}
