"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Card, DetailItem, SectionTitle } from "@/components/admin/admin-ui";
import { DataState, EmptyBlock } from "@/components/coach/coach-ui";
import {
  Field, ScheduleFields, SessionStatusBadge, defaultSchedule, errorText, inputClass, prefillLocal, primaryButton, scheduleBody, secondaryButton, useSessionWhen,
  type SessionListItem,
} from "@/components/coach/session-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { coachApi } from "@/lib/coach/client";
import type { CoachActionDto, CoachReportDto } from "@/lib/coach/content-dto";
import { SESSION_TYPES, canTransition, type SessionAction } from "@/lib/coach/sessions-model";
import { useI18n } from "@/lib/i18n";

type Detail = { session: SessionListItem & { rescheduledTo: string | null } };

/** Détail d'une séance : actions (réalisée, annulée, absence), Reprogrammer et Reporter — deux opérations distinctes. */
export default function CoachSessionPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { state, reload } = useCoachData<Detail>(`/api/coach/sessions/${encodeURIComponent(id)}`);
  const when = useSessionWhen();
  const [mode, setMode] = useState<null | "reschedule" | "postpone">(null);
  const [schedule, setSchedule] = useState(defaultSchedule());
  const [candidates, setCandidates] = useState<[string, string] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  const act = async (action: SessionAction, extra: Record<string, unknown> = {}) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await coachApi<{ session: { id: string } }>(`/api/coach/sessions/${id}`, { method: "PATCH", body: { action, ...extra } });
    setBusy(false);
    if (res.ok) {
      setCandidates(null); setMode(null);
      if (action === "postpone") { setNotice(t("coachSessions.postponedTo")); router.push(`/coach/sessions/${res.data.session.id}`); return; }
      setNotice(action === "reschedule" ? t("coachSessions.rescheduled") : t("coachSessions.saved"));
      reload();
      return;
    }
    if (res.code === "ambiguous_local_time" && res.candidates) { setCandidates(res.candidates); return; }
    setCandidates(null);
    setError(errorText(t, "coachSessions", res.code));
  };

  return (
    <>
      <Link href="/coach/sessions" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#28543C] hover:underline">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("coachSessions.detailBack")}
      </Link>
      <DataState state={state} reload={reload}
        notFound={<EmptyBlock icon={Search} title={t("coachSessions.notFoundTitle")} description={t("coachSessions.notFoundDesc")} />}>
        {({ session: s }) => {
          const w = when(s.scheduledAt, s.timezone);
          const gate = (a: SessionAction) => canTransition(s.status, a, new Date(s.scheduledAt).getTime(), Date.now()).ok;
          const editable = s.status === "scheduled";
          return (
            <div className="space-y-6">
              <header className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1C241F] font-headline">{t(`coachSessions.type.${s.type}`)}</h1>
                <SessionStatusBadge status={s.status} />
              </header>

              <Card as="section" className="p-5">
                <dl className="grid sm:grid-cols-2 gap-4">
                  <DetailItem label={t("coachSessions.member")}>
                    <Link href={`/coach/members/${s.memberId}`} className="text-[#28543C] font-semibold hover:underline">{s.member?.pseudo ?? t("coachMembers.noPseudo")}</Link>
                  </DetailItem>
                  <DetailItem label={t("coachSessions.yourTime")}>{w.own}</DetailItem>
                  {w.sessionZone && <DetailItem label={t("coachSessions.sessionTime", { tz: s.timezone })}>{w.sessionZone}</DetailItem>}
                  <DetailItem label={t("coachSessions.duration")}>{t("coachSessions.minutes", { minutes: s.durationMinutes })}</DetailItem>
                </dl>
                {s.rescheduledTo && (
                  <p className="mt-4 text-sm"><Link href={`/coach/sessions/${s.rescheduledTo}`} className="font-semibold text-[#28543C] hover:underline">{t("coachSessions.seeNew")}</Link></p>
                )}
              </Card>

              {editable && (
                <Card as="section" className="p-5 space-y-4">
                  <SectionTitle title={t("coachSessions.topic")} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={t("coachSessions.topic")} help={t("coachSessions.topicHelp")}>
                      <input maxLength={200} className={inputClass} value={topic ?? s.topic ?? ""} onChange={(e) => setTopic(e.target.value)} />
                    </Field>
                    <Field label={t("coachSessions.type_label")}>
                      <select className={inputClass} value={s.type} onChange={async (e) => {
                        const res = await coachApi(`/api/coach/sessions/${id}`, { method: "PATCH", body: { type: e.target.value } });
                        if (res.ok) reload(); else setError(errorText(t, "coachSessions", res.ok ? undefined : res.code));
                      }}>
                        {SESSION_TYPES.map((k) => <option key={k} value={k}>{t(`coachSessions.type.${k}`)}</option>)}
                      </select>
                    </Field>
                  </div>
                  <button type="button" className={secondaryButton} disabled={topic === null || busy} onClick={async () => {
                    const res = await coachApi(`/api/coach/sessions/${id}`, { method: "PATCH", body: { topic } });
                    if (res.ok) { setTopic(null); setNotice(t("coachSessions.saved")); reload(); } else setError(errorText(t, "coachSessions", res.code));
                  }}>{t("coachNotes.save")}</button>
                </Card>
              )}
              {!editable && s.topic && (
                <Card as="section" className="p-5"><DetailItem label={t("coachSessions.topic")}>{s.topic}</DetailItem></Card>
              )}

              {editable && (
                <Card as="section" className="p-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={primaryButton} disabled={busy || !gate("complete")} onClick={() => void act("complete")}>{t("coachSessions.actions.complete")}</button>
                    <button type="button" className={secondaryButton} disabled={busy || !gate("no_show")} onClick={() => void act("no_show")}>{t("coachSessions.actions.noShow")}</button>
                    <button type="button" className={secondaryButton} disabled={busy} onClick={() => { setMode("reschedule"); setSchedule({ ...defaultSchedule(), local: prefillLocal(s.scheduledAt, s.timezone), timezone: s.timezone, duration: s.durationMinutes }); setCandidates(null); }}>{t("coachSessions.actions.reschedule")}</button>
                    <button type="button" className={secondaryButton} disabled={busy} onClick={() => { setMode("postpone"); setSchedule({ ...defaultSchedule(), local: prefillLocal(s.scheduledAt, s.timezone), timezone: s.timezone, duration: s.durationMinutes }); setCandidates(null); }}>{t("coachSessions.actions.postpone")}</button>
                    <button type="button" className={secondaryButton} disabled={busy} onClick={() => { if (window.confirm(t("coachSessions.confirmCancel"))) void act("cancel"); }}>{t("coachSessions.actions.cancel")}</button>
                  </div>
                  <ul className="text-xs text-[#56615A] space-y-1">
                    <li>{t("coachSessions.actionHelp.reschedule")}</li>
                    <li>{t("coachSessions.actionHelp.postpone")}</li>
                  </ul>
                  {mode && (
                    <form className="space-y-4 border-t border-[#F0F2EF] pt-4" onSubmit={(e) => { e.preventDefault(); void act(mode, scheduleBody(schedule)); }}>
                      <h3 className="text-sm font-semibold text-[#1C241F]">{t("coachSessions.newDate")} — {t(`coachSessions.actions.${mode}`)}</h3>
                      <ScheduleFields value={schedule} onChange={setSchedule} candidates={candidates} />
                      <div className="flex gap-2">
                        <button type="submit" className={primaryButton} disabled={busy || !schedule.local || (candidates !== null && !schedule.disambiguation)}>{t("coachSessions.confirm")}</button>
                        <button type="button" className={secondaryButton} onClick={() => { setMode(null); setCandidates(null); }}>{t("coachSessions.cancelForm")}</button>
                      </div>
                    </form>
                  )}
                </Card>
              )}

              {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
              {notice && <p role="status" className="text-sm text-[#28543C]">{notice}</p>}

              <LinkedContent sessionId={s.id} memberId={s.memberId} />
            </div>
          );
        }}
      </DataState>
    </>
  );
}

/** Éléments rattachés à la séance : notes (comptage seulement, elles sont privées), comptes rendus, actions. */
function LinkedContent({ sessionId, memberId }: { sessionId: string; memberId: string }) {
  const { t } = useI18n();
  const notes = useCoachData<{ notes: { sessionId: string | null }[] }>(`/api/coach/members/${memberId}/notes`);
  const reports = useCoachData<{ reports: CoachReportDto[] }>(`/api/coach/members/${memberId}/reports`);
  const actions = useCoachData<{ actions: CoachActionDto[] }>(`/api/coach/actions?member_id=${memberId}`);
  const n = notes.state.status === "ready" ? notes.state.data.notes.filter((x) => x.sessionId === sessionId).length : 0;
  const r = reports.state.status === "ready" ? reports.state.data.reports.filter((x) => x.sessionId === sessionId) : [];
  const a = actions.state.status === "ready" ? actions.state.data.actions.filter((x) => x.sessionId === sessionId) : [];
  return (
    <Card as="section" className="p-5">
      <SectionTitle title={t("coachSessions.linkedContent")} actions={<Link href={`/coach/members/${memberId}`} className="text-sm font-semibold text-[#28543C] hover:underline">{t("coachReports.seeMember")}</Link>} />
      {n + r.length + a.length === 0 ? <p className="text-sm text-[#56615A]">{t("coachSessions.noLinked")}</p> : (
        <ul className="text-sm text-[#1C241F] space-y-1">
          {n > 0 && <li>{t("coachNotes.title")} : {n}</li>}
          {r.map((x) => <li key={x.id}>{t("coachReports.sectionTitle")} — {x.title || "…"} ({x.publishedAt ? t("coachReports.published") : t("coachReports.draft")})</li>)}
          {a.map((x) => <li key={x.id}>{t("coachActions.title")} — {x.title} ({t(`coachActions.status.${x.status}`)})</li>)}
        </ul>
      )}
    </Card>
  );
}
