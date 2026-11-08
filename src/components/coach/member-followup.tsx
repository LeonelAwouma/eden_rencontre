"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Badge, Card, SectionTitle } from "@/components/admin/admin-ui";
import { DataState, fmtDate } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { Field, NewSessionForm, SessionRows, errorText, inputClass, primaryButton, secondaryButton, useSessionWhen, type SessionListItem } from "@/components/coach/session-ui";
import { coachApi } from "@/lib/coach/client";
import type { CoachActionDto, CoachReportDto } from "@/lib/coach/content-dto";
import type { CoachNoteDto } from "@/lib/coach/notes-dto";
import { ACTION_STATUSES, NOTE_FIELDS } from "@/lib/coach/notes-model";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Sélecteur facultatif « Rattacher à une séance » : séances DU membre uniquement, réalisées d'abord, puis à venir. */
function SessionPicker({ sessions, value, onChange, labelKey, helpKey, noneKey }: {
  sessions: SessionListItem[]; value: string; onChange: (v: string) => void; labelKey: string; helpKey: string; noneKey: string;
}) {
  const { t } = useI18n();
  const when = useSessionWhen();
  const order = (s: SessionListItem) => (s.status === "completed" ? 0 : s.status === "scheduled" ? 1 : 2);
  const options = [...sessions].filter((s) => s.status === "completed" || s.status === "scheduled").sort((a, b) => order(a) - order(b) || b.scheduledAt.localeCompare(a.scheduledAt));
  return (
    <Field label={t(labelKey)} help={t(helpKey)}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t(noneKey)}</option>
        {options.map((s) => <option key={s.id} value={s.id}>{`${when(s.scheduledAt, s.timezone).own} — ${t(`coachSessions.status.${s.status}`)}`}</option>)}
      </select>
    </Field>
  );
}

function useSend(ns: string, onDone: () => void) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (path: string, method: string, body?: unknown) => {
    if (busy) return false;
    setBusy(true); setError(null);
    const res = await coachApi(path, { method, body });
    setBusy(false);
    if (res.ok) { onDone(); return true; }
    setError(errorText(t, ns, res.code));
    return false;
  };
  return { send, busy, error };
}

// ── Notes privées ────────────────────────────────────────────────────────────
function NotesSection({ memberId, sessions }: { memberId: string; sessions: SessionListItem[] }) {
  const { t, locale } = useI18n();
  const { state, reload } = useCoachData<{ notes: CoachNoteDto[] }>(`/api/coach/members/${memberId}/notes`);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState("");
  const { send, busy, error } = useSend("coachNotes", () => { reload(); setOpen(false); setFields({}); setSessionId(""); });
  const when = useSessionWhen();

  return (
    <Card as="section" className="p-5">
      <SectionTitle title={t("coachNotes.title")} actions={!open && <button type="button" className={secondaryButton} onClick={() => setOpen(true)}>{t("coachNotes.add")}</button>} />
      <p className="mb-4 rounded-xl border border-[#E8D9B0] bg-[#FBF6E6] px-3 py-2 text-xs text-[#6B5A1F]" role="note">{t("coachNotes.privateBanner")}</p>
      {open && (
        <form className="mb-5 space-y-3" onSubmit={(e) => { e.preventDefault(); void send(`/api/coach/members/${memberId}/notes`, "POST", { ...fields, ...(sessionId ? { session_id: sessionId } : {}) }); }}>
          {NOTE_FIELDS.map((f) => (
            <Field key={f} label={t(`coachNotes.fields.${f}`)}>
              <textarea rows={2} maxLength={2000} className={inputClass} value={fields[f] ?? ""} onChange={(e) => setFields({ ...fields, [f]: e.target.value })} />
            </Field>
          ))}
          <p className="text-xs text-[#56615A]">{t("coachNotes.maxLength")}</p>
          <SessionPicker sessions={sessions} value={sessionId} onChange={setSessionId} labelKey="coachNotes.linkSession" helpKey="coachNotes.linkHelp" noneKey="coachNotes.noSession" />
          {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className={primaryButton} disabled={busy}>{busy ? t("coachNotes.saving") : t("coachNotes.save")}</button>
            <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>{t("coachNotes.cancel")}</button>
          </div>
        </form>
      )}
      <DataState state={state} reload={reload}>
        {(d) => d.notes.length === 0 ? <p className="text-sm text-[#56615A]">{t("coachNotes.empty")}</p> : (
          <ul className="space-y-4">
            {d.notes.map((n) => {
              const linked = sessions.find((s) => s.id === n.sessionId);
              return (
                <li key={n.id} className="rounded-xl border border-[#E8ECE9] p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#56615A]">
                    <span>{fmtDate(n.createdAt, locale)}{linked ? ` · ${t("coachNotes.linkedSession", { date: when(linked.scheduledAt, linked.timezone).own })}` : ""}</span>
                    <button type="button" className="font-semibold text-[#8A3B2E] hover:underline" disabled={busy}
                      onClick={() => { if (window.confirm(t("coachNotes.deleteConfirm"))) void send(`/api/coach/notes/${n.id}`, "DELETE"); }}>{t("coachNotes.delete")}</button>
                  </div>
                  {([["objectives", n.objectives], ["topics", n.topics], ["points_to_support", n.pointsToSupport], ["observations", n.observations], ["next_steps", n.nextSteps]] as const)
                    .filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}><div className="text-xs font-semibold text-[#56615A]">{t(`coachNotes.fields.${k}`)}</div><p className="whitespace-pre-wrap text-sm text-[#1C241F]">{v}</p></div>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </DataState>
    </Card>
  );
}

// ── Comptes rendus partagés ──────────────────────────────────────────────────
export function ReportEditor({ report, onChanged }: { report: CoachReportDto; onChanged: () => void }) {
  const { t, locale } = useI18n();
  const [title, setTitle] = useState(report.title);
  const [summary, setSummary] = useState(report.summary);
  const { send, busy, error } = useSend("coachReports", onChanged);
  const dirty = title !== report.title || summary !== report.summary;
  return (
    <div className="rounded-xl border border-[#E8ECE9] p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={report.publishedAt ? "green" : "amber"}>{report.publishedAt ? t("coachReports.published") : t("coachReports.draft")}</Badge>
        {report.publishedAt && <span className="text-xs text-[#56615A]">{t("coachReports.publishedOn", { date: fmtDate(report.publishedAt, locale) })}</span>}
      </div>
      <Field label={t("coachReports.titleLabel")} help={t("coachReports.titleHelp")}>
        <input maxLength={120} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={t("coachReports.summaryLabel")} help={t("coachReports.summaryHelp")}>
        <textarea rows={4} maxLength={5000} className={inputClass} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} disabled={busy || !dirty} onClick={() => void send(`/api/coach/reports/${report.id}`, "PATCH", { title, summary })}>
          {busy ? t("coachReports.saving") : t("coachReports.saveDraft")}
        </button>
        {report.publishedAt ? (
          <button type="button" className={secondaryButton} disabled={busy || dirty} onClick={() => void send(`/api/coach/reports/${report.id}`, "PATCH", { action: "unpublish" })}>{t("coachReports.unpublish")}</button>
        ) : (
          <button type="button" className={primaryButton} disabled={busy || dirty} onClick={() => void send(`/api/coach/reports/${report.id}`, "PATCH", { action: "publish" })}>{t("coachReports.publish")}</button>
        )}
      </div>
      <p className="text-xs text-[#56615A]">{report.publishedAt ? t("coachReports.unpublishHelp") : t("coachReports.publishHelp")}</p>
      {title.trim() && summary.trim() && (
        <div className="rounded-xl bg-[#F6FAF5] p-3">
          <div className="text-xs font-semibold text-[#56615A]">{t("coachReports.preview")}</div>
          <div className="mt-1 text-sm font-semibold text-[#1C241F]">{title}</div>
          <p className="whitespace-pre-wrap text-sm text-[#1C241F]">{summary}</p>
        </div>
      )}
    </div>
  );
}

function ReportsSection({ memberId, sessions }: { memberId: string; sessions: SessionListItem[] }) {
  const { t } = useI18n();
  const { state, reload } = useCoachData<{ reports: CoachReportDto[] }>(`/api/coach/members/${memberId}/reports`);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const { send, busy, error } = useSend("coachReports", () => { reload(); setOpen(false); setSessionId(""); });
  return (
    <Card as="section" className="p-5">
      <SectionTitle title={t("coachReports.sectionTitle")} actions={!open && <button type="button" className={secondaryButton} onClick={() => setOpen(true)}>{t("coachReports.create")}</button>} />
      <p className="mb-4 rounded-xl border border-[#D9E4DC] bg-[#F6FAF5] px-3 py-2 text-xs text-[#28543C]" role="note">{t("coachReports.sharedBanner")}</p>
      {open && (
        <form className="mb-5 space-y-3" onSubmit={(e) => { e.preventDefault(); void send(`/api/coach/members/${memberId}/reports`, "POST", sessionId ? { session_id: sessionId } : {}); }}>
          <SessionPicker sessions={sessions} value={sessionId} onChange={setSessionId} labelKey="coachReports.linkSession" helpKey="coachReports.linkHelp" noneKey="coachReports.noSession" />
          {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className={primaryButton} disabled={busy}>{t("coachReports.create")}</button>
            <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>{t("coachNotes.cancel")}</button>
          </div>
        </form>
      )}
      <DataState state={state} reload={reload}>
        {(d) => d.reports.length === 0 ? <p className="text-sm text-[#56615A]">{t("coachReports.empty")}</p> : (
          <ul className="space-y-4">{d.reports.map((r) => <li key={r.id}><ReportEditor report={r} onChanged={reload} /></li>)}</ul>
        )}
      </DataState>
    </Card>
  );
}

// ── Plan d'action ────────────────────────────────────────────────────────────
export function ActionRows({ actions, reload, showMember }: { actions: (CoachActionDto & { member?: { pseudo: string | null } })[]; reload: () => void; showMember?: boolean }) {
  const { t, locale } = useI18n();
  const { send, busy, error } = useSend("coachActions", reload);
  return (
    <>
      {error && <p role="alert" className="mb-2 text-sm text-[#8A3B2E]">{error}</p>}
      <ul className="divide-y divide-[#F0F2EF]">
        {actions.map((a) => (
          <li key={a.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold text-[#1C241F]", a.status === "cancelled" && "line-through opacity-70")}>{a.title}</div>
              {a.description && <p className="whitespace-pre-wrap text-xs text-[#56615A]">{a.description}</p>}
              <div className="mt-1 text-xs text-[#56615A]">
                {[showMember ? (a.member?.pseudo ?? t("coachMembers.noPseudo")) : null, a.owner === "member" ? t("coachActions.ownerMember") : t("coachActions.ownerCoach"),
                  a.dueDate ? t("coachActions.dueOn", { date: fmtDate(a.dueDate, locale) }) : t("coachActions.noDue"),
                  a.completedAt ? t("coachActions.completedOn", { date: fmtDate(a.completedAt, locale) }) : null].filter(Boolean).join(" · ")}
              </div>
            </div>
            <select aria-label={t("coachActions.setStatus")} className={cn(inputClass, "w-auto")} value={a.status} disabled={busy}
              onChange={(e) => void send(`/api/coach/actions/${a.id}`, "PATCH", { status: e.target.value })}>
              {ACTION_STATUSES.map((s) => <option key={s} value={s}>{t(`coachActions.status.${s}`)}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </>
  );
}

function ActionsSection({ memberId, sessions }: { memberId: string; sessions: SessionListItem[] }) {
  const { t } = useI18n();
  const { state, reload } = useCoachData<{ actions: CoachActionDto[] }>(`/api/coach/actions?member_id=${memberId}`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due: "", owner: "member", visible: true, sessionId: "" });
  const { send, busy, error } = useSend("coachActions", () => { reload(); setOpen(false); setForm({ title: "", description: "", due: "", owner: "member", visible: true, sessionId: "" }); });
  return (
    <Card as="section" className="p-5">
      <SectionTitle title={t("coachActions.title")} actions={!open && <button type="button" className={secondaryButton} onClick={() => setOpen(true)}>{t("coachActions.add")}</button>} />
      {open && (
        <form className="mb-5 space-y-3" onSubmit={(e) => {
          e.preventDefault();
          void send("/api/coach/actions", "POST", {
            member_id: memberId, title: form.title, description: form.description, ...(form.due ? { due_date: form.due } : {}),
            owner: form.owner, visible_to_member: form.owner === "member" ? true : form.visible, ...(form.sessionId ? { session_id: form.sessionId } : {}),
          });
        }}>
          <Field label={t("coachActions.titleLabel")}><input required maxLength={120} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={t("coachActions.descriptionLabel")}><textarea rows={2} maxLength={1000} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("coachActions.due")}><input type="date" className={inputClass} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field>
            <Field label={t("coachActions.owner")}>
              <select className={inputClass} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                <option value="member">{t("coachActions.ownerMember")}</option>
                <option value="coach">{t("coachActions.ownerCoach")}</option>
              </select>
            </Field>
          </div>
          {form.owner === "coach" && (
            <label className="flex items-center gap-2 text-sm text-[#1C241F]">
              <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> {t("coachActions.visible")}
            </label>
          )}
          <p className="text-xs text-[#56615A]">{t("coachActions.visibleHelp")}</p>
          <SessionPicker sessions={sessions} value={form.sessionId} onChange={(v) => setForm({ ...form, sessionId: v })} labelKey="coachActions.linkSession" helpKey="coachActions.linkHelp" noneKey="coachActions.noSession" />
          {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className={primaryButton} disabled={busy}>{busy ? t("coachActions.saving") : t("coachActions.save")}</button>
            <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>{t("coachNotes.cancel")}</button>
          </div>
        </form>
      )}
      <DataState state={state} reload={reload}>
        {(d) => d.actions.length === 0 ? <p className="text-sm text-[#56615A]">{t("coachActions.emptyDesc")}</p> : <ActionRows actions={d.actions} reload={reload} />}
      </DataState>
    </Card>
  );
}

/** Suivi d'un membre accompagné : séances, notes privées, compte rendu partagé, actions — tout se rattache à une séance dès la création. */
export function MemberFollowUp({ memberId, pseudo }: { memberId: string; pseudo: string | null }) {
  const { t } = useI18n();
  const { state, reload } = useCoachData<{ sessions: SessionListItem[] }>(`/api/coach/sessions?member_id=${memberId}`);
  const [creating, setCreating] = useState(false);
  const sessions = state.status === "ready" ? state.data.sessions : [];
  return (
    <div className="space-y-6">
      <Card as="section" className="p-5">
        <SectionTitle title={t("coachSessions.memberSection")} actions={!creating && <button type="button" className={secondaryButton} onClick={() => setCreating(true)}><CalendarClock className="w-4 h-4" aria-hidden="true" />{t("coachSessions.newSession")}</button>} />
        {creating && (
          <div className="mb-5">
            <NewSessionForm members={[{ id: memberId, pseudo }]} defaultMemberId={memberId} onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
          </div>
        )}
        <DataState state={state} reload={reload}>
          {(d) => d.sessions.length === 0 ? <p className="text-sm text-[#56615A]">{t("coachSessions.noneForMember")}</p> : <SessionRows sessions={d.sessions} showMember={false} />}
        </DataState>
      </Card>
      <NotesSection memberId={memberId} sessions={sessions} />
      <ReportsSection memberId={memberId} sessions={sessions} />
      <ActionsSection memberId={memberId} sessions={sessions} />
    </div>
  );
}

