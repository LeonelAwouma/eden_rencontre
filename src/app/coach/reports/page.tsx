"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, ListChecks } from "lucide-react";
import { Card } from "@/components/admin/admin-ui";
import { DataState, EmptyBlock, PageTitle } from "@/components/coach/coach-ui";
import { ActionRows, ReportEditor } from "@/components/coach/member-followup";
import { inputClass } from "@/components/coach/session-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import type { CoachActionDto, CoachReportDto } from "@/lib/coach/content-dto";
import { ACTION_STATUSES } from "@/lib/coach/notes-model";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ReportItem = CoachReportDto & { member?: { pseudo: string | null } };
type ActionItem = CoachActionDto & { member?: { pseudo: string | null } };

/** Comptes rendus partagés et plan d'action, tous membres accompagnés confondus. Les notes privées ne sont jamais listées ici. */
export default function CoachReportsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"reports" | "actions">("reports");
  return (
    <>
      <PageTitle title={t("coachReports.title")} subtitle={t("coachReports.subtitle")} />
      <div className="mb-5 flex gap-2" role="tablist">
        {(["reports", "actions"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn("rounded-xl px-4 py-2 text-sm font-semibold", tab === k ? "bg-[#1F4D3A] text-white" : "border border-[#D5DBD6] bg-white text-[#1C241F] hover:bg-[#F6FAF5]")}>
            {k === "reports" ? t("coachReports.tabReports") : t("coachReports.tabActions")}
          </button>
        ))}
      </div>
      {tab === "reports" ? <ReportsTab /> : <ActionsTab />}
    </>
  );
}

function ReportsTab() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");
  const { state, reload } = useCoachData<{ reports: ReportItem[] }>(`/api/coach/reports?state=${filter}`);
  return (
    <>
      <div className="mb-4">
        <select aria-label={t("coachSessions.filterStatus")} className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{t("coachSessions.all")}</option>
          <option value="draft">{t("coachReports.draft")}</option>
          <option value="published">{t("coachReports.published")}</option>
        </select>
      </div>
      <DataState state={state} reload={reload}>
        {(d) => d.reports.length === 0 ? <EmptyBlock icon={ClipboardList} title={t("coachReports.emptyAll")} description={t("coachReports.emptyAllDesc")} /> : (
          <ul className="space-y-4">
            {d.reports.map((r) => (
              <li key={r.id}>
                <Card className="p-4 space-y-3">
                  <Link href={`/coach/members/${r.memberId}`} className="text-sm font-semibold text-[#28543C] hover:underline">{t("coachReports.forMember", { pseudo: r.member?.pseudo ?? t("coachMembers.noPseudo") })}</Link>
                  <ReportEditor report={r} onChanged={reload} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  );
}

function ActionsTab() {
  const { t } = useI18n();
  const [status, setStatus] = useState("all");
  const { state, reload } = useCoachData<{ actions: ActionItem[] }>(`/api/coach/actions?status=${status}`);
  return (
    <>
      <div className="mb-4">
        <select aria-label={t("coachSessions.filterStatus")} className={`${inputClass} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">{t("coachActions.allStatuses")}</option>
          {ACTION_STATUSES.map((s) => <option key={s} value={s}>{t(`coachActions.status.${s}`)}</option>)}
        </select>
      </div>
      <DataState state={state} reload={reload}>
        {(d) => d.actions.length === 0 ? <EmptyBlock icon={ListChecks} title={t("coachActions.empty")} description={t("coachActions.emptyDesc")} /> : (
          <Card as="section" className="p-5"><ActionRows actions={d.actions} reload={reload} showMember /></Card>
        )}
      </DataState>
    </>
  );
}
