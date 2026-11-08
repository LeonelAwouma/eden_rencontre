"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Sprout, Users } from "lucide-react";
import { Card, MemberAvatar } from "@/components/admin/admin-ui";
import { CoverageNotice, DataState, EmptyBlock, FormationStateBadge, PageTitle, Pager, ProgressBar, fmtDate } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { COACH_STATE_FILTERS, MAX_QUERY_LENGTH, type Coverage, type MemberListItem, type MemberStateFilter } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MembersResponse = Coverage & { members: MemberListItem[]; page: number; totalPages: number; totalMatching: number };

/** Liste des membres accompagnés (consentement accepté). Recherche et filtre portent sur les membres chargés. */
export default function CoachMembersPage() {
  const { t, locale } = useI18n();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<MemberStateFilter>("all");
  const [page, setPage] = useState(1);

  // Recherche différée : un appel réseau par pause de frappe, pas par touche.
  useEffect(() => {
    const id = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [qInput]);

  const params = new URLSearchParams({ state: filter, page: String(page) });
  if (q) params.set("q", q);
  const { state, reload } = useCoachData<MembersResponse>(`/api/coach/members?${params.toString()}`);

  return (
    <>
      <PageTitle title={t("coachMembers.title")} subtitle={t("coachMembers.subtitle")}
        actions={
          <button type="button" onClick={reload} aria-label={t("coachCommon.refresh")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6EAE5] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F0F4EF]">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> {t("coachCommon.refresh")}
          </button>
        } />

      <div className="mb-5 space-y-3">
        <label className="relative block">
          <span className="sr-only">{t("coachMembers.searchLabel")}</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#6B746E]" aria-hidden="true" />
          <input type="search" value={qInput} maxLength={MAX_QUERY_LENGTH} onChange={(e) => setQInput(e.target.value)}
            placeholder={t("coachMembers.searchPlaceholder")}
            className="w-full rounded-xl border border-[#E6EAE5] bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3F704D]/40" />
        </label>
        <div role="group" aria-label={t("coachMembers.filterLabel")} className="flex flex-wrap gap-2">
          {COACH_STATE_FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "border-[#28543C] bg-[#EEF5EE] text-[#28543C]" : "border-[#E6EAE5] bg-white text-[#4A564F] hover:bg-[#F0F4EF]")}>
              {t(`coachMembers.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <DataState state={state} reload={reload}>
        {(r) => {
          const noMembersAtAll = r.loadedMembers === 0;
          return (
            <>
              <CoverageNotice coverage={r} />
              {noMembersAtAll ? (
                <EmptyBlock icon={Sprout} title={t("coachMembers.emptyTitle")} description={t("coachMembers.emptyDesc")} />
              ) : r.totalMatching === 0 ? (
                <EmptyBlock icon={Users} title={t("coachMembers.noMatchTitle")} description={t("coachMembers.noMatchDesc")} />
              ) : (
                <>
                  <p className="mb-3 text-sm text-[#56615A]" aria-live="polite">
                    {r.truncated
                      ? t("coachMembers.resultsTruncated", { count: r.totalMatching, loaded: r.loadedMembers })
                      : t("coachMembers.results", { count: r.totalMatching })}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {r.members.map((m) => (
                      <li key={m.id}>
                        <Link href={`/coach/members/${m.id}`}
                          className="block h-full rounded-2xl border border-[#E6EAE5] bg-white p-4 hover:border-[#3F704D]/60 hover:shadow-sm transition">
                          <Card as="div" className="border-0 shadow-none p-0">
                            <div className="flex items-start gap-3">
                              <MemberAvatar name={m.pseudo ?? ""} url={m.avatarUrl ?? undefined} size={44} />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[#1C241F] truncate">{m.pseudo ?? t("coachMembers.noPseudo")}</p>
                                <p className="text-xs text-[#56615A] truncate">{[m.city, m.country].filter(Boolean).join(", ") || "—"}</p>
                                <p className="text-xs text-[#56615A]">{t("coachMembers.since", { date: fmtDate(m.consentAt ?? m.assignedAt, locale) })}</p>
                              </div>
                              <FormationStateBadge state={m.formationState} />
                            </div>
                            <div className="mt-3">
                              {m.formationPercent !== null && m.formationDone !== null && m.formationTotal !== null ? (
                                <>
                                  <ProgressBar percent={m.formationPercent} label={t("coachMembers.progressLabel")} />
                                  <p className="mt-1 text-xs text-[#56615A]">{t("coachMembers.lessonsDone", { done: m.formationDone, total: m.formationTotal })}</p>
                                </>
                              ) : (
                                <p className="text-xs text-[#8A6A1F]">{t("coachMembers.formationUnavailable")}</p>
                              )}
                            </div>
                          </Card>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Pager page={r.page} totalPages={r.totalPages} onPage={setPage} />
                </>
              )}
            </>
          );
        }}
      </DataState>
    </>
  );
}
