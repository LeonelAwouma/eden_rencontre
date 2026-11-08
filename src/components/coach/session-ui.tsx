"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/admin/admin-ui";
import { coachApi } from "@/lib/coach/client";
import { SESSION_TYPES, isValidDuration, type SessionStatus, type SessionType } from "@/lib/coach/sessions-model";
import { formatInZone, utcToLocalInput } from "@/lib/coach/time-zone";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Texte d'erreur traduit ; un code inconnu retombe sur le message générique (jamais de clé brute à l'écran). */
export function errorText(t: T, ns: string, code?: string): string {
  if (code) {
    const key = `${ns}.errors.${code}`;
    const text = t(key);
    if (text !== key) return text;
  }
  return t(`${ns}.errors.generic`);
}

const STATUS_TONE: Record<SessionStatus, "green" | "amber" | "red" | "neutral" | "blue"> = {
  scheduled: "blue", completed: "green", cancelled: "red", postponed: "amber", no_show: "neutral",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const { t } = useI18n();
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{t(`coachSessions.status.${status}`)}</Badge>;
}

export interface SessionListItem {
  id: string; memberId: string; type: SessionType; status: SessionStatus; scheduledAt: string; durationMinutes: number;
  timezone: string; topic: string | null; member?: { pseudo: string | null };
}

/** Heure d'une séance : dans le fuseau du navigateur (« votre heure ») et, si différent, dans celui de la séance. */
export function useSessionWhen() {
  const { locale } = useI18n();
  const mine = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return useCallback((iso: string, tz: string) => {
    const own = formatInZone(iso, mine, locale);
    return { own, sessionZone: tz !== mine ? formatInZone(iso, tz, locale) : null, mine };
  }, [locale, mine]);
}

export function SessionRows({ sessions, showMember = true }: { sessions: SessionListItem[]; showMember?: boolean }) {
  const { t } = useI18n();
  const when = useSessionWhen();
  return (
    <ul className="divide-y divide-[#F0F2EF]">
      {sessions.map((s) => {
        const w = when(s.scheduledAt, s.timezone);
        return (
          <li key={s.id}>
            <Link href={`/coach/sessions/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 -mx-2 px-2 rounded-lg hover:bg-[#F6FAF5]">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#1C241F]">{w.own}</span>
                <span className="block text-xs text-[#56615A]">
                  {[showMember ? (s.member?.pseudo ?? t("coachMembers.noPseudo")) : null, t(`coachSessions.type.${s.type}`), t("coachSessions.minutes", { minutes: s.durationMinutes })].filter(Boolean).join(" · ")}
                </span>
                {s.topic && <span className="block text-xs text-[#56615A] truncate max-w-[32rem]">{s.topic}</span>}
              </span>
              <SessionStatusBadge status={s.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Tous les membres accompagnés (pages de 12 de l'API existante, plafonné) — pour le sélecteur de membre. */
export function useAcceptedMembers() {
  const [members, setMembers] = useState<{ id: string; pseudo: string | null }[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: { id: string; pseudo: string | null }[] = [];
      for (let page = 1; page <= 20; page++) {
        const res = await coachApi<{ members: { id: string; pseudo: string | null }[]; totalPages: number }>(`/api/coach/members?page=${page}`);
        if (!res.ok) break;
        all.push(...res.data.members.map((m) => ({ id: m.id, pseudo: m.pseudo })));
        if (page >= res.data.totalPages) break;
      }
      if (!cancelled) setMembers(all);
    })();
    return () => { cancelled = true; };
  }, []);
  return members;
}

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 180, 240];

function timeZoneChoices(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    return fn ? fn("timeZone") : [];
  } catch { return []; }
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-[#1C241F]">{label}</span>
      {children}
      {help && <span className="block text-xs text-[#56615A]">{help}</span>}
    </label>
  );
}

export const inputClass = "w-full rounded-xl border border-[#D5DBD6] bg-white px-3 py-2 text-sm text-[#1C241F] focus:outline-none focus:ring-2 focus:ring-[#28543C]/30";
export const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F4D3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173b2d] disabled:opacity-60";
export const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#D5DBD6] bg-white px-4 py-2 text-sm font-semibold text-[#1C241F] hover:bg-[#F6FAF5] disabled:opacity-60";

/**
 * Sélecteur d'horaire commun (création, reprogrammation, report) : heure locale + fuseau + durée. L'heure est envoyée
 * comme `{ local, timezone, disambiguation? }` : le serveur refuse une heure inexistante et demande un choix pour une
 * heure ambiguë (changement d'heure) — l'interface propose alors les deux occurrences.
 */
export function ScheduleFields({ value, onChange, candidates }: {
  value: { local: string; timezone: string; duration: number; disambiguation: "" | "earlier" | "later" };
  onChange: (v: { local: string; timezone: string; duration: number; disambiguation: "" | "earlier" | "later" }) => void;
  candidates?: [string, string] | null;
}) {
  const { t, locale } = useI18n();
  const zones = useMemo(timeZoneChoices, []);
  const listId = useRef(`tz-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label={t("coachSessions.date")}>
        <input type="datetime-local" required className={inputClass} value={value.local}
          onChange={(e) => onChange({ ...value, local: e.target.value, disambiguation: "" })} />
      </Field>
      <Field label={t("coachSessions.timezone")} help={t("coachSessions.timezoneHelp")}>
        <input list={zones.length ? listId : undefined} required className={inputClass} value={value.timezone}
          onChange={(e) => onChange({ ...value, timezone: e.target.value, disambiguation: "" })} />
        {zones.length > 0 && <datalist id={listId}>{zones.map((z) => <option key={z} value={z} />)}</datalist>}
      </Field>
      <Field label={t("coachSessions.duration")}>
        <select className={inputClass} value={value.duration} onChange={(e) => onChange({ ...value, duration: Number(e.target.value) })}>
          {DURATIONS.filter(isValidDuration).map((d) => <option key={d} value={d}>{t("coachSessions.minutes", { minutes: d })}</option>)}
        </select>
      </Field>
      {candidates && (
        <fieldset className="sm:col-span-2 rounded-xl border border-[#E8D9B0] bg-[#FBF6E6] p-3 space-y-2" role="group">
          <legend className="px-1 text-sm font-semibold text-[#6B5A1F]">{t("coachSessions.ambiguousTitle")}</legend>
          <p className="text-xs text-[#6B5A1F]">{t("coachSessions.ambiguousHelp")}</p>
          {(["earlier", "later"] as const).map((k, i) => (
            <label key={k} className="flex items-center gap-2 text-sm text-[#1C241F]">
              <input type="radio" name="disambiguation" checked={value.disambiguation === k} onChange={() => onChange({ ...value, disambiguation: k })} />
              {t(`coachSessions.${k}`, { time: formatInZone(candidates[i], value.timezone, locale) })}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

export function defaultSchedule() {
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return { local: "", timezone: tz, duration: 60, disambiguation: "" as "" | "earlier" | "later" };
}

/** Corps d'API pour un horaire (heure locale + fuseau, `disambiguation` seulement si choisie). */
export function scheduleBody(v: ReturnType<typeof defaultSchedule>) {
  return { local: v.local, timezone: v.timezone, duration_minutes: v.duration, ...(v.disambiguation ? { disambiguation: v.disambiguation } : {}) };
}

export function NewSessionForm({ members, defaultMemberId, onCreated, onCancel }: {
  members: { id: string; pseudo: string | null }[]; defaultMemberId?: string; onCreated: () => void; onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const [type, setType] = useState<SessionType>("individual");
  const [topic, setTopic] = useState("");
  const [schedule, setSchedule] = useState(defaultSchedule());
  const [candidates, setCandidates] = useState<[string, string] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    const res = await coachApi("/api/coach/sessions", { method: "POST", body: { member_id: memberId, type, topic: topic || null, ...scheduleBody(schedule) } });
    lock.current = false; setBusy(false);
    if (res.ok) { setCandidates(null); onCreated(); return; }
    if (res.code === "ambiguous_local_time" && res.candidates) { setCandidates(res.candidates); setError(null); return; }
    setCandidates(null);
    setError(errorText(t, "coachSessions", res.code));
  };

  if (members.length === 0) return <p className="text-sm text-[#56615A]">{t("coachSessions.noMembers")}</p>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t("coachSessions.member")}>
          <select required className={inputClass} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">{t("coachSessions.chooseMember")}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.pseudo ?? t("coachMembers.noPseudo")}</option>)}
          </select>
        </Field>
        <Field label={t("coachSessions.type_label")}>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as SessionType)}>
            {SESSION_TYPES.map((k) => <option key={k} value={k}>{t(`coachSessions.type.${k}`)}</option>)}
          </select>
        </Field>
      </div>
      <ScheduleFields value={schedule} onChange={setSchedule} candidates={candidates} />
      <Field label={t("coachSessions.topic")} help={t("coachSessions.topicHelp")}>
        <input maxLength={200} className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </Field>
      {error && <p role="alert" className="text-sm text-[#8A3B2E]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton} disabled={busy || !memberId || !schedule.local || (candidates !== null && !schedule.disambiguation)}>
          {busy ? t("coachSessions.creating") : t("coachSessions.create")}
        </button>
        {onCancel && <button type="button" className={secondaryButton} onClick={onCancel}>{t("coachSessions.cancelForm")}</button>}
      </div>
    </form>
  );
}

/** Heure locale préremplie pour reprogrammer / reporter (dans le fuseau de la séance). */
export const prefillLocal = utcToLocalInput;

export { Card, cn };
