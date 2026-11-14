"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Heart, HeartHandshake, Gem, Clock, XCircle, Search, X, ChevronLeft, ChevronRight, MessageCircle, UserRound,
  Sparkles, CalendarHeart, Users, Gauge, Check, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { computeDisplayMatch, type AdapterInput } from "@/lib/matching/adapter";
import { pickMatchFields } from "@/lib/social";
import { useI18n } from "@/lib/i18n";
import { journeySteps, type Stage, type StepStatus } from "@/lib/admin-matching-stats";

/**
 * Admin → Matching : chaque duo et son parcours.
 * Un VRAI match : un membre clique sur « S'engager » et l'autre valide.
 * Avant cela : demande d'alliance, puis « en relation » (alliance acceptée).
 * Données : /api/admin/matching/couples.
 *
 * Les cinq catégories principales sont exclusives (leur somme = total des duos).
 * « Toutes les alliances acceptées » est une vue cumulative, à part.
 */

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
interface Stats {
  accepted: number; engagement_declined: number; match: number; matchThisWeek: number; engagement_pending: number;
  relation: number; alliance_pending: number; declined: number; declined_alliance?: number; all: number;
}
type TabKey = "alliance_pending" | "relation" | "engagement_pending" | "match" | "declined" | "all" | "accepted";

const EMPTY_STATS: Stats = {
  accepted: 0, engagement_declined: 0, match: 0, matchThisWeek: 0, engagement_pending: 0,
  relation: 0, alliance_pending: 0, declined: 0, all: 0,
};

/** Étapes exclusives, dans l'ordre chronologique du parcours. */
const JOURNEY: { value: Exclude<TabKey, "all" | "accepted">; tabKey: string; cardKey: string; icon: typeof Heart }[] = [
  { value: "alliance_pending", tabKey: "pending", cardKey: "pending", icon: Clock },
  { value: "relation", tabKey: "relation", cardKey: "relation", icon: MessageCircle },
  { value: "engagement_pending", tabKey: "engagementPending", cardKey: "engagementPending", icon: HeartHandshake },
  { value: "match", tabKey: "match", cardKey: "match", icon: Gem },
  { value: "declined", tabKey: "declined", cardKey: "declined", icon: XCircle },
];

const STAGE: Record<Stage, { key: string; className: string; icon: typeof Heart }> = {
  alliance_pending: { key: "allianceRequest", className: "bg-[#F4F1EA] text-[#6B5A2E]", icon: Clock },
  relation: { key: "relation", className: "bg-primary/10 text-primary", icon: MessageCircle },
  engagement_pending: { key: "engagementPending", className: "bg-primary/15 text-primary", icon: HeartHandshake },
  match: { key: "match", className: "bg-primary text-white", icon: Gem },
  engagement_declined: { key: "engagementDeclined", className: "bg-muted text-[#6B746E]", icon: XCircle },
  declined: { key: "allianceDeclined", className: "bg-muted text-[#6B746E]", icon: XCircle },
};

const STEP_STYLE: Record<StepStatus, string> = {
  done: "bg-primary/10 text-primary",
  current: "bg-primary text-white",
  waiting: "bg-[#F4F1EA] text-[#6B5A2E]",
  declined: "bg-[#B42318]/10 text-[#B42318]",
  notReached: "bg-muted text-[#6B746E]",
};

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
  const { t, locale } = useI18n();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [stage, setStage] = useState<TabKey>("alliance_pending");
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
      const res = await fetch(`/api/admin/matching/couples?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || ""); return; }
      setError(null);
      setCouples(data.couples || []);
      setStats({ ...EMPTY_STATS, ...data.stats });
      setEngagementsAvailable(data.engagementsAvailable !== false);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("");
    } finally {
      setLoading(false);
    }
  }, [stage, page, debounced]);

  useEffect(() => { load(); }, [load]);

  const scores = useMemo(() => new Map(couples.map((c) => [c.id, compatibility(c)])), [couples]);
  const select = (v: TabKey) => { setStage(v); setPage(1); };
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }) : "—";
  const relative = (iso: string | null): string => {
    if (!iso) return "—";
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return t("adminMatching.agoMin", { n: Math.max(1, Math.floor(s / 60)) });
    if (s < 86400) return t("adminMatching.agoHour", { n: Math.floor(s / 3600) });
    if (s < 86400 * 30) return t("adminMatching.agoDay", { n: Math.floor(s / 86400) });
    return fmtDate(iso);
  };

  const countOf = (v: TabKey) => stats[v];
  const sum = stats.alliance_pending + stats.relation + stats.engagement_pending + stats.match + stats.declined;
  const emptyKey = debounced ? "search" : stage === "match" ? "match" : stage === "accepted" ? "accepted" : "default";

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">{t("adminMatching.title")}</h1>
        <p className="text-sm text-[#56615A] mt-1 max-w-2xl">{t("adminMatching.intro")}</p>
      </div>

      {/* Niveau 1 : vue d'ensemble — six catégories, chacune cliquable. */}
      <section aria-labelledby="matching-overview" className="mb-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
          <h2 id="matching-overview" className="text-[15px] font-bold text-foreground">{t("adminMatching.overviewTitle")}</h2>
          <p className="text-[12px] text-[#6B746E] tabular-nums" aria-live="polite">
            {stats.alliance_pending} + {stats.relation} + {stats.engagement_pending} + {stats.match} + {stats.declined} = <strong className="text-foreground">{sum}</strong>
            {sum === stats.all ? ` · ${t("adminMatching.sumOk")}` : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {JOURNEY.map((j) => (
            <StatTile key={j.value} active={stage === j.value} onClick={() => select(j.value)}
              label={t(`adminMatching.cards.${j.cardKey}.label`)} value={stats[j.value]} icon={j.icon} locale={dateLocale}
              hint={t(`adminMatching.cards.${j.cardKey}.hint`, {
                week: stats.matchThisWeek,
                alliance: stats.declined_alliance ?? Math.max(0, stats.declined - stats.engagement_declined),
                engagement: stats.engagement_declined,
              })} />
          ))}
          <StatTile active={stage === "all"} onClick={() => select("all")} locale={dateLocale}
            label={t("adminMatching.cards.total.label")} value={stats.all} icon={Users} hint={t("adminMatching.cards.total.hint")} />
        </div>
      </section>

      {/* Niveau 2 : parcours des alliances, dans l'ordre chronologique. */}
      <section aria-labelledby="matching-journey" className="mb-5">
        <h2 id="matching-journey" className="text-[15px] font-bold text-foreground mb-3">{t("adminMatching.journeyTitle")}</h2>

        {/* Mobile : une liste déroulante compacte, pas de défilement horizontal. */}
        <div className="sm:hidden">
          <label htmlFor="matching-stage" className="sr-only">{t("adminMatching.stageSelect")}</label>
          <select id="matching-stage" value={stage} onChange={(e) => select(e.target.value as TabKey)}
            className="w-full h-11 px-3 bg-white border border-border rounded-xl text-[14px] font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
            {JOURNEY.map((j, i) => <option key={j.value} value={j.value}>{i + 1}. {t(`adminMatching.tabs.${j.tabKey}`)} ({countOf(j.value)})</option>)}
            <option value="all">{t("adminMatching.tabs.all")} ({stats.all})</option>
            <option value="accepted">{t("adminMatching.cumulative")} ({stats.accepted})</option>
          </select>
        </div>

        {/* Tablette / ordinateur : onglets numérotés + vue cumulative séparée. */}
        <div className="hidden sm:flex flex-wrap items-center gap-2" role="tablist" aria-label={t("adminMatching.stageAria")}>
          {JOURNEY.map((j, i) => <TabButton key={j.value} active={stage === j.value} onClick={() => select(j.value)}
            icon={j.icon} count={countOf(j.value)} prefix={`${i + 1}`}>{t(`adminMatching.tabs.${j.tabKey}`)}</TabButton>)}
          <span className="w-px h-6 bg-border mx-1" aria-hidden />
          <TabButton active={stage === "all"} onClick={() => select("all")} icon={Users} count={stats.all}>{t("adminMatching.tabs.all")}</TabButton>
        </div>

        <div className="hidden sm:block mt-3">
          <button role="tab" aria-selected={stage === "accepted"} onClick={() => select("accepted")}
            className={cn("inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[13px] font-semibold border border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              stage === "accepted" ? "bg-primary/10 text-primary border-primary" : "bg-white text-[#3F4A43] border-border hover:border-primary/40")}>
            <Layers className="w-3.5 h-3.5" aria-hidden /> {t("adminMatching.cumulative")}
            <span className="text-[10.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#F4F1EA] text-[#6B5A2E]">{t("adminMatching.cumulativeBadge")}</span>
            <span className="text-[11px] tabular-nums px-1.5 rounded-full bg-muted text-[#6B746E]">{stats.accepted}</span>
          </button>
        </div>
        {stage === "accepted" && <p className="mt-2 text-[12px] text-[#6B746E]" role="note">{t("adminMatching.cumulativeHint")}</p>}
      </section>

      {/* Niveau 3 : recherche et liste. */}
      <div className="relative mb-5 lg:max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B746E]" aria-hidden />
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t("adminMatching.searchPlaceholder")} aria-label={t("adminMatching.searchAria")}
          className="w-full h-10 pl-10 pr-9 bg-white border border-border rounded-xl text-[13px] font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
        {search && (
          <button onClick={() => { setSearch(""); setPage(1); }} aria-label={t("adminMatching.searchClear")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#6B746E] hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        )}
      </div>

      {!engagementsAvailable && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t("adminMatching.engagementsUnavailable")}</div>}
      {error !== null && <div role="alert" className="mb-4 p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[13px] font-medium text-[#B42318]">{error || t("adminMatching.errorLoad")}</div>}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label={t("adminMatching.loading")}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[132px] bg-white rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : couples.length === 0 && error === null ? (
        <div className="bg-white rounded-2xl border border-border py-14 px-6 text-center">
          <HeartHandshake className="w-9 h-9 text-primary/70 mx-auto mb-3" aria-hidden />
          <p className="text-[15px] font-semibold text-foreground">{t(`adminMatching.empty.${emptyKey}.title`)}</p>
          <p className="text-[13px] text-[#56615A] mt-1 max-w-md mx-auto">{t(`adminMatching.empty.${emptyKey}.body`)}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {couples.map((c) => <CoupleCard key={c.id} c={c} score={scores.get(c.id) ?? null} fmtDate={fmtDate} relative={relative} />)}
        </ul>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-3 mt-5">
          <p className="text-[12px] text-[#6B746E] font-medium">{t(total > 1 ? "adminMatching.duoCountMany" : "adminMatching.duoCountOne", { count: total })}</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label={t("adminMatching.prev")}
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-[12px] font-semibold text-[#56615A] px-2 tabular-nums">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label={t("adminMatching.next")}
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-white hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, hint, active, onClick, locale }: {
  label: string; value: number; icon: typeof Heart; hint?: string; active?: boolean; onClick?: () => void; locale: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("text-left bg-white rounded-2xl border px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#56615A]">{label}</span>
        <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden />
      </div>
      <p className="mt-1.5 text-[28px] leading-none font-bold text-foreground tabular-nums tracking-tight">{value.toLocaleString(locale)}</p>
      {hint && <p className="mt-1.5 text-[11.5px] leading-snug text-[#6B746E]">{hint}</p>}
    </button>
  );
}

function TabButton({ active, onClick, icon: Icon, count, prefix, children }: {
  active: boolean; onClick: () => void; icon: typeof Heart; count: number; prefix?: string; children: React.ReactNode;
}) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={cn("flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active ? "bg-primary text-white border-primary" : "bg-white text-[#3F4A43] border-border hover:border-primary/40")}>
      {prefix && <span className={cn("w-4 h-4 rounded-full text-[10px] flex items-center justify-center", active ? "bg-white/25" : "bg-primary/10 text-primary")} aria-hidden>{prefix}</span>}
      <Icon className="w-3.5 h-3.5" aria-hidden /> {children}
      <span className={cn("text-[11px] tabular-nums px-1.5 rounded-full", active ? "bg-white/20" : "bg-muted text-[#6B746E]")}>{count}</span>
    </button>
  );
}

function Member({ p, align, fallback }: { p: CoupleProfile; align: "left" | "right"; fallback: string }) {
  const { t } = useI18n();
  const display = p.pseudo || p.name || fallback;
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
        <span className="block text-[12px] text-[#56615A] truncate">{[a !== null ? t("adminMatching.years", { n: a }) : null, place].filter(Boolean).join(" · ") || "—"}</span>
      </span>
    </Link>
  );
}

function CoupleCard({ c, score, fmtDate, relative }: {
  c: Couple; score: number | null; fmtDate: (iso: string | null) => string; relative: (iso: string | null) => string;
}) {
  const { t } = useI18n();
  const st = STAGE[c.stage];
  const isMatch = c.stage === "match";
  const inRelation = c.stage !== "alliance_pending" && c.stage !== "declined";
  const member = t("adminMatching.aMember");
  const engagementBy = c.engagement?.requester_id === c.requester.id ? c.requester : c.addressee;
  const engagementByName = engagementBy.pseudo || engagementBy.name || member;
  const dates: Record<string, string | null> = {
    request: c.requested_at, alliance: c.relation_at, engagement: c.engagement?.requested_at || null, match: c.matched_at,
  };
  const lastActivity = c.conversation.last_message_at && c.conversation.last_message_at > c.updated_at ? c.conversation.last_message_at : c.updated_at;
  return (
    <li className={cn("bg-white rounded-2xl border p-4 sm:p-5", isMatch ? "border-primary/40" : "border-border")}>
      {/* Les deux membres, reliés par l'étape actuelle */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
        <Member p={c.requester} align="left" fallback={member} />
        <div className="flex sm:flex-col items-center gap-2 justify-center">
          <span className={cn("w-10 h-10 rounded-full flex items-center justify-center",
            isMatch ? "bg-primary text-white" : inRelation ? "bg-primary/10 text-primary" : "bg-muted text-[#8A938C]")}>
            <st.icon className="w-5 h-5" aria-hidden />
          </span>
          <span className={cn("inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-bold whitespace-nowrap", st.className)}>{t(`adminMatching.stage.${st.key}`)}</span>
        </div>
        <Member p={c.addressee} align="right" fallback={member} />
      </div>

      {/* Progression visuelle : demande → alliance → engagement → match */}
      <ol className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border/70 pt-3" aria-label={t("adminMatching.journeyAria")}>
        {journeySteps(c.stage).map((step) => (
          <li key={step.key} className={cn("rounded-xl px-3 py-2 min-w-0", STEP_STYLE[step.status])}>
            <p className="flex items-center gap-1 text-[11.5px] font-bold leading-tight">
              {step.status === "done" && <Check className="w-3 h-3 shrink-0" aria-hidden />}
              {step.status === "declined" && <XCircle className="w-3 h-3 shrink-0" aria-hidden />}
              <span className="truncate">{t(`adminMatching.steps.${step.key}`)}</span>
            </p>
            <p className="mt-0.5 text-[11px] opacity-90 truncate">
              {t(`adminMatching.stepStatus.${step.status}`)}{dates[step.key] && step.status !== "notReached" ? ` · ${fmtDate(dates[step.key])}` : ""}
            </p>
          </li>
        ))}
      </ol>

      {/* Repères du duo */}
      <div className="mt-3 pt-3.5 border-t border-border/70 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-[12.5px]">
        <Fact icon={Gauge} label={t("adminMatching.facts.compatibility")}>
          {score === null ? <span className="text-[#6B746E]">{t("adminMatching.facts.incompleteQuestionnaire")}</span>
            : <span className="font-bold text-foreground tabular-nums">{score} %</span>}
        </Fact>
        <Fact icon={isMatch ? CalendarHeart : Clock} label={t(isMatch ? "adminMatching.facts.matchOn" : inRelation ? "adminMatching.facts.relationSince" : "adminMatching.facts.requestOn")}>
          {fmtDate(isMatch ? c.matched_at : inRelation ? c.relation_at : c.requested_at)}
        </Fact>
        <Fact icon={MessageCircle} label={t("adminMatching.facts.conversation")}>
          {c.conversation.id
            ? <>{t(c.conversation.message_count > 1 ? "adminMatching.facts.messageMany" : "adminMatching.facts.messageOne", { count: c.conversation.message_count })}{c.conversation.last_message_at && <span className="text-[#6B746E]"> · {relative(c.conversation.last_message_at)}</span>}</>
            : <span className="text-[#6B746E]">{t("adminMatching.facts.notStarted")}</span>}
        </Fact>
        <Fact icon={Gem} label={t("adminMatching.facts.engagement")}>
          {!c.engagement ? <span className="text-[#6B746E]">—</span>
            : c.engagement.status === "accepted" ? t("adminMatching.facts.validated", { name: engagementByName })
            : c.engagement.status === "pending" ? t("adminMatching.facts.requestedBy", { name: engagementByName, date: fmtDate(c.engagement.requested_at) })
            : <span className="text-[#6B746E]">{t("adminMatching.facts.declinedShort")}</span>}
        </Fact>
        <Fact icon={Sparkles} label={t("adminMatching.facts.lastActivity")}>{relative(lastActivity)}</Fact>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <Link href={`/admin/users/${c.requester.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
          <UserRound className="w-3.5 h-3.5" aria-hidden /> {c.requester.pseudo || c.requester.name || t("adminMatching.profile")}
        </Link>
        <Link href={`/admin/users/${c.addressee.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted">
          <UserRound className="w-3.5 h-3.5" aria-hidden /> {c.addressee.pseudo || c.addressee.name || t("adminMatching.profile")}
        </Link>
        {c.conversation.id && (
          <Link href={`/admin/chat-monitoring?user=${c.requester.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] font-semibold text-primary hover:bg-primary/5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> {t("adminMatching.viewConversation")}
          </Link>
        )}
      </div>
    </li>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Heart; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8A938C]"><Icon className="w-3.5 h-3.5 text-primary" aria-hidden /> {label}</p>
      <p className="mt-0.5 text-[#3F4A43] truncate">{children}</p>
    </div>
  );
}
