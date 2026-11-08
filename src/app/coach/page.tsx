"use client";

import Link from "next/link";
import { BookOpen, CalendarClock, ClipboardList, GraduationCap, Hourglass, ListChecks, Sprout, Users } from "lucide-react";
import { Card, MemberAvatar, SectionTitle, StatTile } from "@/components/admin/admin-ui";
import { CoverageNotice, DataState, EmptyBlock, PageTitle, fmtDate } from "@/components/coach/coach-ui";
import { useCoachChrome } from "@/components/coach/coach-chrome";
import { useCoachData } from "@/components/coach/use-coach-data";
import { SessionRows, type SessionListItem } from "@/components/coach/session-ui";
import type { DashboardStats } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Vue d'ensemble : indicateurs réels uniquement (aucune estimation). */
interface FollowUpStats {
  upcomingSessions: number; pendingActions: number; reportsToComplete: number;
  nextSessions: { id: string; memberId: string; scheduledAt: string; durationMinutes: number; timezone: string; type: string; topic: string | null }[];
}
export default function CoachOverviewPage() {
  const { t, locale } = useI18n();
  const { coach } = useCoachChrome();
  const { state, reload } = useCoachData<DashboardStats & { followUp: FollowUpStats }>("/api/coach/dashboard");

  return (
    <>
      <PageTitle title={t("coachDashboard.title")} subtitle={t("coachDashboard.subtitle", { name: coach.name })} />
      <DataState state={state} reload={reload}>
        {(s) => {
          const empty = s.activeMembers === 0 && s.pendingProposals === 0;
          return (
            <div className="space-y-8">
              <CoverageNotice coverage={s} />

              <section aria-label={t("coachDashboard.cardsLabel")} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatTile icon={Users} tone="green" label={t("coachDashboard.cardActive")} value={s.activeMembers} />
                <StatTile icon={Hourglass} tone="amber" label={t("coachDashboard.cardPending")} value={s.pendingProposals}
                  hint={s.pendingProposals > 0 ? t("coachDashboard.cardPendingHint") : undefined} />
                <StatTile icon={GraduationCap} tone="green" label={t("coachDashboard.cardCompleted")} value={s.formationCompleted} />
                <StatTile icon={BookOpen} tone="blue" label={t("coachDashboard.cardInProgress")} value={s.formationInProgress} />
              </section>

              <section aria-label={t("coachSessions.title")} className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <StatTile icon={CalendarClock} tone="blue" label={t("coachSessions.dash.cardUpcoming")} value={s.followUp.upcomingSessions} />
                <StatTile icon={ListChecks} tone="amber" label={t("coachSessions.dash.cardActions")} value={s.followUp.pendingActions} />
                <StatTile icon={ClipboardList} tone="green" label={t("coachSessions.dash.cardReports")} value={s.followUp.reportsToComplete} hint={t("coachSessions.dash.cardReportsHint")} />
              </section>

              {empty && (
                <EmptyBlock icon={Sprout} title={t("coachDashboard.emptyTitle")} description={t("coachDashboard.emptyDesc")} />
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                <Card as="section" className="p-5">
                  <SectionTitle title={t("coachDashboard.recentMembersTitle")} />
                  {s.recentMembers.length === 0 ? (
                    <p className="text-sm text-[#56615A]">{t("coachDashboard.recentMembersEmpty")}</p>
                  ) : (
                    <ul className="divide-y divide-[#F0F2EF]">
                      {s.recentMembers.map((m) => (
                        <li key={m.id}>
                          <Link href={`/coach/members/${m.id}`} className="flex items-center gap-3 py-3 rounded-lg hover:bg-[#F6FAF5] -mx-2 px-2">
                            <MemberAvatar name={m.pseudo ?? ""} url={m.avatarUrl ?? undefined} size={40} />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-[#1C241F] truncate">{m.pseudo ?? t("coachMembers.noPseudo")}</span>
                              <span className="block text-xs text-[#56615A]">{t("coachDashboard.consentedOn", { date: fmtDate(m.consentAt, locale) })}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card as="section" className="p-5">
                  <SectionTitle title={t("coachDashboard.activityTitle")} />
                  {s.recentActivity.length === 0 ? (
                    <p className="text-sm text-[#56615A]">{t("coachDashboard.activityEmpty")}</p>
                  ) : (
                    <ul className="divide-y divide-[#F0F2EF]">
                      {s.recentActivity.map((a) => (
                        <li key={a.id} className="py-3 flex items-start gap-2">
                          <span aria-hidden="true" className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", a.read ? "bg-[#D5DBD6]" : "bg-[#28543C]")} />
                          <span className="min-w-0">
                            <span className={cn("block text-sm text-[#1C241F]", !a.read && "font-semibold")}>{t(`coachDashboard.activity.${a.kind}`)}</span>
                            <span className="block text-xs text-[#56615A]">{fmtDate(a.createdAt, locale)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <Card as="section" className="p-5">
                <SectionTitle title={t("coachSessions.dash.upcomingTitle")}
                  actions={<Link href="/coach/sessions" className="text-sm font-semibold text-[#28543C] hover:underline">{t("coachSessions.dash.seeSessions")}</Link>} />
                {s.followUp.nextSessions.length === 0 ? (
                  <p className="text-sm text-[#56615A]">{t("coachSessions.dash.upcomingEmpty")}</p>
                ) : (
                  <SessionRows showMember={false} sessions={s.followUp.nextSessions.map((n) => ({ ...n, type: n.type as SessionListItem["type"], status: "scheduled" as const }))} />
                )}
              </Card>

              <Card as="section" className="p-5">
                <SectionTitle title={t("coachDashboard.formationPanelTitle")}
                  subtitle={s.truncated ? t("coachDashboard.formationScopeTruncated", { loaded: s.loadedMembers }) : undefined}
                  actions={<Link href="/coach/formation" className="text-sm font-semibold text-[#28543C] hover:underline">{t("coachDashboard.seeFormation")}</Link>} />
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {([
                    ["completed", s.formationCompleted],
                    ["inProgress", s.formationInProgress],
                    ["notStarted", s.formationNotStarted],
                    ["unavailable", s.formationUnavailable],
                  ] as const).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs text-[#56615A]">{t(`coachMembers.state.${key}`)}</dt>
                      <dd className="text-2xl font-bold text-[#1C241F] tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-[#56615A]">{t("coachDashboard.evaluated", { count: s.formationEvaluatedMembers })}</p>
              </Card>
            </div>
          );
        }}
      </DataState>
    </>
  );
}
