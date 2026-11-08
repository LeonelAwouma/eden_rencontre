"use client";

import Link from "next/link";
import { Sprout } from "lucide-react";
import { Card, MemberAvatar, SectionTitle } from "@/components/admin/admin-ui";
import { CoverageNotice, DataState, EmptyBlock, FormationStateBadge, PageTitle, ProgressBar } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import type { Coverage, FormationOverviewPillar, FormationOverviewRow } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";

type FormationResponse = Coverage & { pillars: FormationOverviewPillar[]; rows: FormationOverviewRow[] };

/** Progression « Bâtir sur le roc » de l'ensemble des membres accompagnés (données persistées uniquement). */
export default function CoachFormationPage() {
  const { t, locale } = useI18n();
  const { state, reload } = useCoachData<FormationResponse>(`/api/coach/formation?lang=${locale === "en" ? "en" : "fr"}`);

  return (
    <>
      <PageTitle title={t("coachFormation.title")} subtitle={t("coachFormation.subtitle")} />
      <DataState state={state} reload={reload}>
        {(r) => (
          <div className="space-y-6">
            <CoverageNotice coverage={r} />
            {r.loadedMembers === 0 ? (
              <EmptyBlock icon={Sprout} title={t("coachFormation.emptyTitle")} description={t("coachFormation.emptyDesc")} />
            ) : (
              <>
                <Card as="section" className="p-5">
                  <SectionTitle title={t("coachFormation.pillarsTitle")} />
                  {r.pillars.length === 0 ? (
                    <p className="text-sm text-[#56615A]">{t("coachFormation.noPillarData")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-[#6B746E]">
                            <th scope="col" className="py-2 pr-4 font-semibold">{t("coachFormation.colPillar")}</th>
                            <th scope="col" className="py-2 px-3 font-semibold text-right">{t("coachFormation.colDone")}</th>
                            <th scope="col" className="py-2 px-3 font-semibold text-right">{t("coachFormation.colInProgress")}</th>
                            <th scope="col" className="py-2 pl-3 font-semibold text-right">{t("coachFormation.colNotStarted")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F2EF]">
                          {r.pillars.map((p) => (
                            <tr key={p.number}>
                              <th scope="row" className="py-3 pr-4 text-left font-medium text-[#1C241F]">{t("coachMembers.pillar", { n: p.number })} — {p.title}</th>
                              <td className="py-3 px-3 text-right tabular-nums">{p.membersDone}</td>
                              <td className="py-3 px-3 text-right tabular-nums">{p.membersInProgress}</td>
                              <td className="py-3 pl-3 text-right tabular-nums">{p.membersNotStarted}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-[#56615A]">{t("coachFormation.declarativeNote")}</p>
                </Card>

                <Card as="section" className="p-5">
                  <SectionTitle title={t("coachFormation.membersTitle")} />
                  <ul className="divide-y divide-[#F0F2EF]">
                    {r.rows.map((m) => (
                      <li key={m.id}>
                        <Link href={`/coach/members/${m.id}`} className="flex flex-wrap items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-[#F6FAF5]">
                          <MemberAvatar name={m.pseudo ?? ""} url={m.avatarUrl ?? undefined} size={36} />
                          <span className="min-w-0 flex-1 basis-40">
                            <span className="block text-sm font-semibold text-[#1C241F] truncate">{m.pseudo ?? t("coachMembers.noPseudo")}</span>
                            <span className="block text-xs text-[#56615A] truncate">
                              {m.nextLesson ? t("coachMembers.nextLesson", { number: m.nextLesson.number, title: m.nextLesson.title }) : m.formationState === "completed" ? t("coachMembers.allDone") : "—"}
                            </span>
                          </span>
                          <span className="w-32 shrink-0">
                            {m.percent !== null
                              ? <><ProgressBar percent={m.percent} label={t("coachMembers.progressLabel")} /><span className="text-xs text-[#56615A] tabular-nums">{m.percent}%</span></>
                              : <span className="text-xs text-[#8A6A1F]">{t("coachMembers.formationUnavailable")}</span>}
                          </span>
                          <FormationStateBadge state={m.formationState} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}
          </div>
        )}
      </DataState>
    </>
  );
}
