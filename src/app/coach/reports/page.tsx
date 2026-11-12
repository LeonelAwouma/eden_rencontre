"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ListChecks, Users } from "lucide-react";
import { Card } from "@/components/admin/admin-ui";
import { DataState, EmptyBlock, PageTitle } from "@/components/coach/coach-ui";
import { ActionRows, ReportEditor, SessionPicker } from "@/components/coach/member-followup";
import { Field, errorText, inputClass, primaryButton, secondaryButton, type SessionListItem } from "@/components/coach/session-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { coachApi } from "@/lib/coach/client";
import type { CoachActionDto, CoachReportDto } from "@/lib/coach/content-dto";
import { ACTION_STATUSES, REPORT_SUMMARY_MAX, REPORT_TITLE_MAX } from "@/lib/coach/notes-model";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ReportItem = CoachReportDto & { member?: { pseudo: string | null } };
type ActionItem = CoachActionDto & { member?: { pseudo: string | null } };
interface AcceptedMember { id: string; pseudo: string | null }

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

/**
 * Création d'un compte rendu DIRECTEMENT depuis cette page : choisir le membre, un titre, un résumé, et
 * rattacher éventuellement une séance DE CE MEMBRE (chargée une fois le membre choisi). Même route de création
 * que depuis la fiche du membre (`POST /api/coach/members/[id]/reports`) ; même sécurité, même brouillon.
 */
function NewReportForm({ members, onCreated, onCancel }: { members: AcceptedMember[]; onCreated: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionId("");
    if (!memberId) { setSessions([]); return; }
    let cancelled = false;
    void coachApi<{ sessions: SessionListItem[] }>(`/api/coach/sessions?member_id=${memberId}`).then((res) => {
      if (!cancelled && res.ok) setSessions(res.data.sessions);
    });
    return () => { cancelled = true; };
  }, [memberId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || busy) return;
    setBusy(true); setError(null);
    const res = await coachApi(`/api/coach/members/${memberId}/reports`, { method: "POST", body: { title, summary, ...(sessionId ? { session_id: sessionId } : {}) } });
    setBusy(false);
    if (res.ok) { onCreated(); return; }
    setError(errorText(t, "coachReports", res.code));
  };

  return (
    <Card className="mb-5 p-5">
      <form className="space-y-3" onSubmit={submit}>
        <Field label={t("coachReports.memberLabel")}>
          <select className={inputClass} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.pseudo ?? t("coachMembers.noPseudo")}</option>)}
          </select>
        </Field>
        <Field label={t("coachReports.titleLabel")} help={t("coachReports.titleHelp")}>
          <input maxLength={REPORT_TITLE_MAX} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t("coachReports.summaryLabel")} help={t("coachReports.summaryHelp")}>
          <textarea rows={4} maxLength={REPORT_SUMMARY_MAX} className={inputClass} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <SessionPicker sessions={sessions} value={sessionId} onChange={setSessionId} labelKey="coachReports.linkSession" helpKey="coachReports.linkHelp" noneKey="coachReports.noSession" />
        {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className={primaryButton} disabled={busy || !memberId}>{busy ? t("coachReports.saving") : t("coachReports.create")}</button>
          <button type="button" className={secondaryButton} onClick={onCancel}>{t("coachNotes.cancel")}</button>
        </div>
      </form>
    </Card>
  );
}

function ReportsTab() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const { state, reload } = useCoachData<{ reports: ReportItem[]; members: AcceptedMember[] }>(`/api/coach/reports?state=${filter}`);

  return (
    <DataState state={state} reload={reload}>
      {(d) => (
        <>
          {d.members.length === 0 ? (
            // Aucun membre n'a encore accepté le suivi : rien à créer — explication claire plutôt qu'un bouton inopérant.
            <EmptyBlock icon={Users} title={t("coachReports.noMembersTitle")} description={t("coachReports.noMembersDesc")}
              action={<Link href="/coach/members" className={primaryButton}>{t("coachReports.goToMembers")}</Link>} />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <select aria-label={t("coachSessions.filterStatus")} className={`${inputClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">{t("coachSessions.all")}</option>
                  <option value="draft">{t("coachReports.draft")}</option>
                  <option value="published">{t("coachReports.published")}</option>
                </select>
                {!creating && <button type="button" className={primaryButton} onClick={() => setCreating(true)}>{t("coachReports.create")}</button>}
              </div>
              {creating && <NewReportForm members={d.members} onCreated={() => { setCreating(false); reload(); }} onCancel={() => setCreating(false)} />}
              {d.reports.length === 0 ? (
                <EmptyBlock icon={ClipboardList} title={t("coachReports.emptyAll")} description={t("coachReports.emptyAllDesc")} />
              ) : (
                <ul className="space-y-4">
                  {d.reports.map((r) => (
                    <li key={r.id}>
                      <Card className="p-4 space-y-3">
                        <Link href={`/coach/members/${r.memberId}#reports`} className="text-sm font-semibold text-[#28543C] hover:underline">
                          {t("coachReports.forMember", { pseudo: r.member?.pseudo ?? t("coachMembers.noPseudo") })}
                        </Link>
                        <ReportEditor report={r} onChanged={reload} />
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </DataState>
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
