"use client";

import { useState } from "react";
import { CalendarClock, Plus, RefreshCw } from "lucide-react";
import { Card } from "@/components/admin/admin-ui";
import { DataState, EmptyBlock, PageTitle, Pager } from "@/components/coach/coach-ui";
import { NewSessionForm, SessionRows, inputClass, primaryButton, secondaryButton, useAcceptedMembers, type SessionListItem } from "@/components/coach/session-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { SESSION_STATUSES } from "@/lib/coach/sessions-model";
import { useI18n } from "@/lib/i18n";

interface SessionsResponse { sessions: SessionListItem[]; page: number; totalPages: number; total: number }

/** Rendez-vous : séances du coach pour les membres qu'il accompagne ; création, filtre par statut, pagination. */
export default function CoachSessionsPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const members = useAcceptedMembers();
  const { state, reload } = useCoachData<SessionsResponse>(`/api/coach/sessions?status=${status}&page=${page}`);

  return (
    <>
      <PageTitle title={t("coachSessions.title")} subtitle={t("coachSessions.subtitle")} actions={
        <div className="flex gap-2">
          <button type="button" className={secondaryButton} onClick={reload} aria-label={t("coachCommon.retry")}><RefreshCw className="w-4 h-4" aria-hidden="true" /></button>
          {!creating && <button type="button" className={primaryButton} onClick={() => setCreating(true)}><Plus className="w-4 h-4" aria-hidden="true" />{t("coachSessions.newSession")}</button>}
        </div>
      } />
      {creating && (
        <Card as="section" className="mb-6 p-5">
          {members === null ? <p className="text-sm text-[#56615A]">{t("coachCommon.loading")}</p> : (
            <NewSessionForm members={members} onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); setPage(1); reload(); }} />
          )}
        </Card>
      )}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-semibold text-[#1C241F]" htmlFor="session-status">{t("coachSessions.filterStatus")}</label>
        <select id="session-status" className={`${inputClass} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">{t("coachSessions.all")}</option>
          {SESSION_STATUSES.map((s) => <option key={s} value={s}>{t(`coachSessions.status.${s}`)}</option>)}
        </select>
      </div>
      <DataState state={state} reload={reload}>
        {(d) => d.sessions.length === 0 ? (
          <EmptyBlock icon={CalendarClock} title={t("coachSessions.empty")} description={t("coachSessions.emptyDesc")} />
        ) : (
          <Card as="section" className="p-5">
            <SessionRows sessions={d.sessions} />
            <Pager page={d.page} totalPages={d.totalPages} onPage={setPage} />
          </Card>
        )}
      </DataState>
    </>
  );
}
