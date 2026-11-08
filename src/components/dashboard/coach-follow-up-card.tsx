"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, ClipboardList, ListChecks } from "lucide-react";
import { authHeaders } from "@/lib/auth";
import type { MemberActionDto, MemberReportDto } from "@/lib/coach/content-dto";
import type { MemberSessionDto } from "@/lib/coach/sessions-dto";
import { canMemberTransition } from "@/lib/coach/notes-model";
import { formatInZone } from "@/lib/coach/time-zone";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Load =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sessions: MemberSessionDto[]; reports: MemberReportDto[]; actions: MemberActionDto[] };

async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  const res = await fetch(url, { headers: await authHeaders(), cache: "no-store" });
  return { status: res.status, body: res.ok ? ((await res.json().catch(() => null)) as T | null) : null };
}

/**
 * « Mon accompagnement » : séances (lecture seule), comptes rendus PUBLIÉS et actions du membre connecté.
 * L'identité vient de la session côté serveur ; aucune note privée n'existe dans ces réponses. La carte n'apparaît que
 * s'il existe au moins une séance, un compte rendu ou une action. Le membre ne peut que faire avancer le statut de SES
 * actions (commencer, terminer) : aucun texte libre, aucune réponse au coach.
 */
export function CoachFollowUpCard() {
  const { t, locale } = useI18n();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [openReport, setOpenReport] = useState<string | null>(null);
  const lock = useRef(false); // verrou synchrone : pas de double soumission avant le re-rendu
  const viewerZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const reload = useCallback(async () => {
    try {
      const [s, r, a] = await Promise.all([
        getJson<{ sessions: MemberSessionDto[] }>("/api/member/coach/sessions"),
        getJson<{ reports: MemberReportDto[] }>("/api/member/coach/reports"),
        getJson<{ actions: MemberActionDto[] }>("/api/member/coach/actions"),
      ]);
      // Pas membre approuvé (inscription en cours, coach…) : aucune carte, aucun message.
      if ([s, r, a].some((x) => x.status === 401 || x.status === 403)) { setLoad({ kind: "ready", sessions: [], reports: [], actions: [] }); return; }
      if (!s.body || !r.body || !a.body) { setLoad({ kind: "error" }); return; }
      setLoad({ kind: "ready", sessions: s.body.sessions, reports: r.body.reports, actions: a.body.actions });
    } catch {
      setLoad({ kind: "error" });
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const advance = async (action: MemberActionDto, to: "in_progress" | "done") => {
    if (lock.current || !canMemberTransition(action.status, to)) return;
    lock.current = true; setBusyId(action.id); setActionError(false);
    try {
      const res = await fetch(`/api/member/coach/actions/${action.id}`, {
        method: "PATCH", headers: { ...(await authHeaders()), "Content-Type": "application/json" }, body: JSON.stringify({ status: to }),
      });
      // Aucun succès annoncé avant la réponse du serveur ; en cas de refus (transition obsolète), l'état est rechargé.
      if (!res.ok) setActionError(true);
      await reload();
    } catch {
      setActionError(true);
    } finally {
      lock.current = false; setBusyId(null);
    }
  };

  if (load.kind === "loading") return null;
  if (load.kind === "error") {
    return (
      <section className="rounded-2xl border border-[#E3C5BF] bg-[#FBF3F1] p-5 text-sm text-[#8A3B2E]" role="alert">
        <p>{t("coachFollowUp.error")}</p>
        <button type="button" onClick={() => void reload()} className="mt-2 font-semibold underline">{t("coachFollowUp.retry")}</button>
      </section>
    );
  }
  const { sessions, reports, actions } = load;
  if (sessions.length + reports.length + actions.length === 0) return null;

  const nowIso = new Date().toISOString();
  const upcoming = sessions.filter((s) => s.status === "scheduled" && s.scheduledAt >= nowIso).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const history = sessions.filter((s) => !upcoming.includes(s));
  const next = upcoming[0];
  const fmt = (s: MemberSessionDto) => {
    const own = formatInZone(s.scheduledAt, viewerZone, locale);
    return s.timezone !== viewerZone ? `${own} (${formatInZone(s.scheduledAt, s.timezone, locale)} — ${s.timezone})` : own;
  };
  const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

  return (
    <section aria-labelledby="coach-follow-up-title" className="rounded-2xl border border-primary/15 bg-white p-5 sm:p-6 space-y-6">
      <header>
        <h2 id="coach-follow-up-title" className="text-lg font-semibold text-foreground">{t("coachFollowUp.title")}</h2>
        <p className="text-sm text-foreground/60">{t("coachFollowUp.subtitle")}</p>
      </header>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarClock className="w-4 h-4" aria-hidden="true" />{t("coachFollowUp.nextSession")}</h3>
        {next ? (
          <div className="rounded-xl bg-primary/[0.06] p-3 text-sm">
            <div className="font-semibold text-foreground">{fmt(next)}</div>
            <div className="text-foreground/70">
              {[t(`coachSessions.type.${next.type}`), t("coachSessions.minutes", { minutes: next.durationMinutes }), next.coachName ? t("coachFollowUp.with", { name: next.coachName }) : null].filter(Boolean).join(" · ")}
            </div>
            {next.topic && <div className="text-foreground/70">{next.topic}</div>}
          </div>
        ) : <p className="text-sm text-foreground/60">{t("coachFollowUp.noUpcoming")}</p>}
        {history.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary" aria-expanded={showHistory}>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showHistory && "rotate-180")} aria-hidden="true" />
              {t("coachFollowUp.history")} ({history.length}) — {showHistory ? t("coachFollowUp.hide") : t("coachFollowUp.show")}
            </button>
            {showHistory && (
              <ul className="mt-2 divide-y divide-foreground/10 text-sm">
                {history.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{fmt(s)} · {t(`coachSessions.type.${s.type}`)}</span>
                    <span className="text-xs font-semibold text-foreground/70">{t(`coachSessions.status.${s.status}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList className="w-4 h-4" aria-hidden="true" />{t("coachFollowUp.reportsTitle")}</h3>
        {reports.length === 0 ? <p className="text-sm text-foreground/60">{t("coachFollowUp.noReports")}</p> : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-foreground/10">
                <button type="button" className="flex w-full items-center justify-between gap-2 p-3 text-left" aria-expanded={openReport === r.id} onClick={() => setOpenReport(openReport === r.id ? null : r.id)}>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{r.title}</span>
                    <span className="block text-xs text-foreground/60">{[r.coachName ? t("coachFollowUp.fromCoach", { name: r.coachName }) : null, t("coachFollowUp.publishedOn", { date: fmtDay(r.publishedAt) })].filter(Boolean).join(" · ")}</span>
                  </span>
                  <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", openReport === r.id && "rotate-180")} aria-hidden="true" />
                </button>
                {openReport === r.id && <p className="whitespace-pre-wrap border-t border-foreground/10 p-3 text-sm text-foreground/90">{r.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><ListChecks className="w-4 h-4" aria-hidden="true" />{t("coachFollowUp.actionsTitle")}</h3>
        {actions.length === 0 ? <p className="text-sm text-foreground/60">{t("coachFollowUp.noActions")}</p> : (
          <ul className="space-y-2">
            {actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-foreground/10 p-3">
                <div className="min-w-0">
                  <div className={cn("text-sm font-semibold text-foreground", a.status === "cancelled" && "line-through opacity-70")}>{a.title}</div>
                  {a.description && <p className="whitespace-pre-wrap text-xs text-foreground/70">{a.description}</p>}
                  <div className="mt-1 text-xs text-foreground/60">
                    {[a.dueDate ? t("coachFollowUp.due", { date: fmtDay(a.dueDate) }) : t("coachFollowUp.noDue"), a.canUpdate ? t("coachFollowUp.yourAction") : t("coachFollowUp.coachAction"),
                      t(`coachActions.status.${a.status}`), a.completedAt ? t("coachFollowUp.doneOn", { date: fmtDay(a.completedAt) }) : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {a.canUpdate && (a.status === "todo" || a.status === "in_progress") && (
                  <div className="flex gap-2">
                    {a.status === "todo" && (
                      <button type="button" disabled={busyId !== null} onClick={() => void advance(a, "in_progress")}
                        className="rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-semibold hover:bg-foreground/5 disabled:opacity-50">
                        {busyId === a.id ? t("coachFollowUp.updating") : t("coachFollowUp.start")}
                      </button>
                    )}
                    <button type="button" disabled={busyId !== null} onClick={() => void advance(a, "done")}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{busyId === a.id ? t("coachFollowUp.updating") : t("coachFollowUp.finish")}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {actionError && <p role="alert" className="mt-2 text-sm text-[#8A3B2E]">{t("coachFollowUp.actionError")}</p>}
      </div>
    </section>
  );
}
