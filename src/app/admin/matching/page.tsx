"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Heart, HeartHandshake, Gem, Clock, XCircle, Search, X, ChevronLeft, ChevronRight, MessageCircle, UserRound,
  Sparkles, CalendarHeart, Users, Gauge,
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
  id: string; stage: Stage; requested_at: string; relation_at: string | null; matched_at: string | null; updated_at: string;
  requester: CoupleProfile; addressee: CoupleProfile;
  engagement: { status: string; requested_at: string; responded_at: string | null; requester_id: string } | null;
  conversation: { id: string | null; message_count: number; last_message_at: string | null };
}
interface Stats { match: number; matchThisWeek: number; engagement_pending: number; relation: number; alliance_pending: number; declined: number; all: number }
type TabKey = "match" | "engagement_pending" | "relation" | "alliance_pending" | "declined" | "all";

const TABS: { value: TabKey; label: string; icon: typeof Heart }[] = [
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
  const [stats, setStats] = useState<Stats>({ match: 0, matchThisWeek: 0, engagement_pending: 0, relation: 0, alliance_pending: 0, declined: 0, all: 0 });
  const [stage, setStage] = useState<TabKey>("match");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ stage, page: String(page), limit: "20" });
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/admin/matching/couples?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Impossible de charger les couples."); return; }
      setError(null);
      setCouples(data.couples || []);
      setStats(data.stats);
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

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">Matching</h1>
        <p className="text-sm text-[#56615A] mt-1 max-w-2xl">
          Un match, c&apos;est quand un membre clique sur « S&apos;engager » et que l&apos;autre valide. Suivez ici chaque couple, de la demande d&apos;alliance jusqu&apos;au match.
        </p>
      </div>

      {/* Statistiques compactes, monochromes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Matchs" value={stats.match} icon={Gem} hint={`${stats.matchThisWeek} cette semaine · engagement validé`} />
        <StatTile label="Engagements à valider" value={stats.engagement_pending} icon={HeartHandshake} hint="« S'engager » envoyé, en attente" />
        <StatTile label="En relation" value={stats.relation} icon={MessageCircle} hint="alliance acceptée, sans engagement" />
        <StatTile label="Demandes d'alliance" value={stats.alliance_pending} icon={Clock} hint="pas encore de réponse" />
      </div>

      {/* Étapes + recherche sur une ligne */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0" role="tablist" aria-label="Étape">
          {TABS.map((t) => {
            const active = stage === t.value;
            return (
              <button key={t.value} role="tab" aria-selected={active} onClick={() => { setStage(t.value); setPage(1); }}
                className={cn("flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors",
                  active ? "bg-primary text-white border-primary" : "bg-white text-[#3F4A43] border-border hover:border-primary/40")}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                <span className={cn("text-[11px] tabular-nums px-1.5 rounded-full", active ? "bg-white/20" : "bg-muted text-[#6B746E]")}>{tabCount(t.value)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-0 lg:max-w-xs lg:ml-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" />
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Pseudo, nom ou email…" aria-label="Rechercher un membre"
            className="w-full h-10 pl-10 pr-9 bg-white border border-border rounded-xl text-[13px] font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} aria-label="Effacer la recherche"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#6B746E] hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>

      {error && <div role="alert" className="mb-4 p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[13px] font-medium text-[#B42318]">{error}</div>}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[132px] bg-white rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : couples.length === 0 && !error ? (
        <div className="bg-white rounded-2xl border border-border py-14 px-6 text-center">
          <HeartHandshake className="w-9 h-9 text-primary/70 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-foreground">
            {debounced ? "Aucun couple ne correspond" : stage === "match" ? "Pas encore de match" : "Rien dans cette étape pour l'instant"}
          </p>
          <p className="text-[13px] text-[#56615A] mt-1 max-w-md mx-auto">
            {debounced ? "Essayez un autre pseudo, nom ou email."
              : stage === "match" ? "Dès qu'un membre valide la demande d'engagement de l'autre, leur match apparaît ici."
              : "Les couples apparaîtront ici au fil de leur parcours."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {couples.map((c) => <CoupleCard key={c.id} c={c} score={scores.get(c.id) ?? null} />)}
        </ul>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-3 mt-5">
          <p className="text-[12px] text-[#6B746E] font-medium">{total} couple{total > 1 ? "s" : ""}</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Page précédente"
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-[12px] font-semibold text-[#56615A] px-2 tabular-nums">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Page suivante"
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
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

      {/* Repères du couple */}
      <div className="mt-4 pt-3.5 border-t border-border/70 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-[12.5px]">
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
