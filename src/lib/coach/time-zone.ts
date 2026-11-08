/**
 * Fuseaux horaires des séances (module PUR).
 *
 * Règles : on stocke toujours un instant UTC ; le fuseau IANA sert à l'affichage. L'API n'accepte JAMAIS une date
 * « naïve » : soit un instant ISO avec décalage explicite (« Z » ou « ±hh:mm »), soit une heure locale
 * `{ local, timezone, disambiguation? }`. Aux changements d'heure :
 *   - heure locale INEXISTANTE (saut de printemps)  → rejet `nonexistent_local_time` ;
 *   - heure locale AMBIGUË (retour d'automne)       → rejet `ambiguous_local_time` avec les DEUX instants, sauf si
 *     `disambiguation` ("earlier" | "later") est fourni.
 * `Intl.DateTimeFormat` ne résout pas ces cas à lui seul : on calcule tous les instants dont l'affichage dans le
 * fuseau vaut l'heure demandée et on compte les candidats.
 */

export type ZoneErrorCode =
  | "bad_timezone" | "bad_datetime" | "naive_datetime" | "nonexistent_local_time" | "ambiguous_local_time";

export type ZonedResult =
  | { ok: true; utc: Date; timezone: string }
  | { ok: false; code: ZoneErrorCode; candidates?: [string, string] };

const TZ_NAME = /^[A-Za-z0-9_+\-/]{1,64}$/;

/** Fuseau IANA reconnu par le moteur d'exécution (jamais un nom arbitraire). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !TZ_NAME.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Décalage (en minutes) du fuseau à l'instant donné : heure locale − heure UTC. */
export function offsetMinutes(tz: string, atMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(atMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(atMs / 1000) * 1000) / 60000);
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const ABSOLUTE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Tous les instants UTC (triés, sans doublon) dont l'heure affichée dans `tz` est exactement `local`.
 * 0 = heure inexistante ; 1 = cas normal ; 2 = heure ambiguë.
 */
export function localToUtcCandidates(local: string, tz: string): Date[] | null {
  const m = LOCAL_RE.exec(local);
  if (!m || !isValidTimeZone(tz)) return null;
  const [y, mo, d, h, mi] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(naive);
  // Date calendaire impossible (30 février, 25 h…) : rejet.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || check.getUTCHours() !== h || check.getUTCMinutes() !== mi) return null;
  const DAY = 24 * 3600_000;
  const offsets = new Set([offsetMinutes(tz, naive - DAY), offsetMinutes(tz, naive), offsetMinutes(tz, naive + DAY)]);
  const found = new Set<number>();
  for (const off of offsets) {
    const candidate = naive - off * 60_000;
    if (offsetMinutes(tz, candidate) === off) found.add(candidate);
  }
  return [...found].sort((a, b) => a - b).map((ms) => new Date(ms));
}

/** Convertit une heure locale en instant UTC selon la règle explicite ci-dessus. */
export function zonedLocalToUtc(local: string, tz: string, disambiguation?: "earlier" | "later"): ZonedResult {
  if (!isValidTimeZone(tz)) return { ok: false, code: "bad_timezone" };
  const candidates = localToUtcCandidates(local, tz);
  if (!candidates) return { ok: false, code: "bad_datetime" };
  if (candidates.length === 0) return { ok: false, code: "nonexistent_local_time" };
  if (candidates.length === 1) return { ok: true, utc: candidates[0], timezone: tz };
  if (disambiguation === "earlier") return { ok: true, utc: candidates[0], timezone: tz };
  if (disambiguation === "later") return { ok: true, utc: candidates[1], timezone: tz };
  return { ok: false, code: "ambiguous_local_time", candidates: [candidates[0].toISOString(), candidates[1].toISOString()] };
}

export interface InstantInput {
  scheduled_at?: unknown;
  local?: unknown;
  timezone?: unknown;
  disambiguation?: unknown;
}

/**
 * Entrée d'API : `{ scheduled_at, timezone }` (instant avec décalage explicite) OU `{ local, timezone, disambiguation? }`.
 * Les deux à la fois, ou aucun, sont refusés ; une date naïve (sans décalage) est refusée.
 */
export function parseInstantInput(input: InstantInput): ZonedResult {
  if (!isValidTimeZone(input.timezone)) return { ok: false, code: "bad_timezone" };
  const tz = input.timezone;
  const hasAbs = input.scheduled_at !== undefined && input.scheduled_at !== null;
  const hasLocal = input.local !== undefined && input.local !== null;
  if (hasAbs === hasLocal) return { ok: false, code: "bad_datetime" };
  if (hasAbs) {
    if (typeof input.scheduled_at !== "string") return { ok: false, code: "bad_datetime" };
    if (!ABSOLUTE_RE.test(input.scheduled_at)) {
      return { ok: false, code: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.scheduled_at) ? "naive_datetime" : "bad_datetime" };
    }
    const d = new Date(input.scheduled_at);
    return Number.isNaN(d.getTime()) ? { ok: false, code: "bad_datetime" } : { ok: true, utc: d, timezone: tz };
  }
  if (typeof input.local !== "string") return { ok: false, code: "bad_datetime" };
  const dis = input.disambiguation;
  if (dis !== undefined && dis !== null && dis !== "earlier" && dis !== "later") return { ok: false, code: "bad_datetime" };
  return zonedLocalToUtc(input.local, tz, (dis ?? undefined) as "earlier" | "later" | undefined);
}

/** Affichage d'un instant dans un fuseau donné (navigateur ou serveur). */
export function formatInZone(iso: string, tz: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || !isValidTimeZone(tz)) return "";
  return new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(d);
}

/** Heure locale `YYYY-MM-DDTHH:mm` d'un instant dans un fuseau (préremplissage des formulaires). */
export function utcToLocalInput(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || !isValidTimeZone(tz)) return "";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}
