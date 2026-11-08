import { describe, expect, it } from "vitest";
import {
  PAST_GRACE_MS, SESSION_ERROR_STATUS, SESSION_TYPES, canTransition, cleanTopic, isValidDuration, mapSessionDbError,
  parsePatchSession, validateCreateSession, validateNewSchedule, type SessionAction, type SessionStatus,
} from "./sessions-model";
import { formatInZone, isValidTimeZone, localToUtcCandidates, offsetMinutes, parseInstantInput, utcToLocalInput, zonedLocalToUtc } from "./time-zone";

const M = "11111111-1111-4111-8111-111111111111";
const NOW = Date.UTC(2026, 5, 1, 9, 0, 0);
const body = (over: Record<string, unknown> = {}) => ({ member_id: M, type: "individual", duration_minutes: 60, timezone: "Africa/Douala", local: "2026-06-02T10:00", ...over });

describe("fuseaux : changements d'heure", () => {
  it("fuseaux IANA : valides acceptés, noms arbitraires refusés", () => {
    for (const tz of ["Africa/Douala", "Europe/Paris", "America/New_York", "UTC"]) expect(isValidTimeZone(tz), tz).toBe(true);
    for (const tz of ["", "Mars/Olympus", "../etc/passwd", "Europe/Paris; drop", 5, null, undefined, "x".repeat(80)]) expect(isValidTimeZone(tz as never), String(tz)).toBe(false);
  });
  it("décalages connus (hiver / été)", () => {
    expect(offsetMinutes("Europe/Paris", Date.UTC(2026, 0, 15, 12))).toBe(60);
    expect(offsetMinutes("Europe/Paris", Date.UTC(2026, 6, 15, 12))).toBe(120);
    expect(offsetMinutes("Africa/Douala", Date.UTC(2026, 0, 15, 12))).toBe(60);
    expect(offsetMinutes("America/New_York", Date.UTC(2026, 0, 15, 12))).toBe(-300);
  });
  it("heure normale : un seul candidat, conversion exacte", () => {
    const r = zonedLocalToUtc("2026-06-02T10:00", "Europe/Paris");
    expect(r.ok && r.utc.toISOString()).toBe("2026-06-02T08:00:00.000Z");
    const d = zonedLocalToUtc("2026-06-02T10:00", "Africa/Douala");
    expect(d.ok && d.utc.toISOString()).toBe("2026-06-02T09:00:00.000Z");
  });
  it("Europe/Paris 2026-03-29 02:30 : heure INEXISTANTE → rejet", () => {
    expect(localToUtcCandidates("2026-03-29T02:30", "Europe/Paris")).toEqual([]);
    expect(zonedLocalToUtc("2026-03-29T02:30", "Europe/Paris")).toEqual({ ok: false, code: "nonexistent_local_time" });
    expect(zonedLocalToUtc("2026-03-29T02:30", "Europe/Paris", "earlier")).toEqual({ ok: false, code: "nonexistent_local_time" });
  });
  it("Europe/Paris 2026-10-25 02:30 : heure AMBIGUË → rejet avec les deux instants, ou choix explicite", () => {
    const r = zonedLocalToUtc("2026-10-25T02:30", "Europe/Paris");
    expect(r).toEqual({ ok: false, code: "ambiguous_local_time", candidates: ["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"] });
    const e = zonedLocalToUtc("2026-10-25T02:30", "Europe/Paris", "earlier");
    const l = zonedLocalToUtc("2026-10-25T02:30", "Europe/Paris", "later");
    expect(e.ok && e.utc.toISOString()).toBe("2026-10-25T00:30:00.000Z");
    expect(l.ok && l.utc.toISOString()).toBe("2026-10-25T01:30:00.000Z");
  });
  it("America/New_York 2026-11-01 01:30 : AMBIGUË ; 2026-03-08 02:30 : INEXISTANTE", () => {
    expect(zonedLocalToUtc("2026-11-01T01:30", "America/New_York")).toMatchObject({ ok: false, code: "ambiguous_local_time" });
    expect(zonedLocalToUtc("2026-03-08T02:30", "America/New_York")).toEqual({ ok: false, code: "nonexistent_local_time" });
  });
  it("Africa/Douala (aucun changement d'heure) : jamais ambiguë ni inexistante, toute l'année", () => {
    for (const day of ["2026-03-29", "2026-10-25", "2026-11-01", "2026-03-08"]) {
      for (const hm of ["00:30", "01:30", "02:30", "03:30"]) expect(zonedLocalToUtc(`${day}T${hm}`, "Africa/Douala").ok, `${day} ${hm}`).toBe(true);
    }
  });
  it("dates impossibles ou mal formées refusées", () => {
    for (const l of ["2026-02-30T10:00", "2026-13-01T10:00", "2026-06-02T25:00", "2026-06-02", "2026-06-02T10:00:00", "pas une date"]) {
      expect(zonedLocalToUtc(l, "Europe/Paris"), l).toEqual({ ok: false, code: "bad_datetime" });
    }
    expect(zonedLocalToUtc("2026-06-02T10:00", "Mars/Olympus")).toEqual({ ok: false, code: "bad_timezone" });
  });
  it("entrée d'API : instant avec décalage OK ; date NAÏVE refusée ; les deux formes ou aucune refusées", () => {
    const abs = parseInstantInput({ scheduled_at: "2026-06-02T10:00:00+02:00", timezone: "Europe/Paris" });
    expect(abs.ok && abs.utc.toISOString()).toBe("2026-06-02T08:00:00.000Z");
    expect(parseInstantInput({ scheduled_at: "2026-06-02T10:00:00Z", timezone: "UTC" }).ok).toBe(true);
    expect(parseInstantInput({ scheduled_at: "2026-06-02T10:00", timezone: "Europe/Paris" })).toEqual({ ok: false, code: "naive_datetime" });
    expect(parseInstantInput({ scheduled_at: "2026-06-02T10:00:00", timezone: "Europe/Paris" })).toEqual({ ok: false, code: "naive_datetime" });
    expect(parseInstantInput({ scheduled_at: "2026-06-02T10:00:00Z", local: "2026-06-02T10:00", timezone: "UTC" })).toMatchObject({ ok: false });
    expect(parseInstantInput({ timezone: "UTC" })).toMatchObject({ ok: false });
    expect(parseInstantInput({ local: "2026-06-02T10:00", timezone: "Nope" })).toEqual({ ok: false, code: "bad_timezone" });
    expect(parseInstantInput({ local: "2026-10-25T02:30", timezone: "Europe/Paris", disambiguation: "middle" })).toMatchObject({ ok: false });
  });
  it("affichage et prérempli de formulaire dans un fuseau", () => {
    expect(utcToLocalInput("2026-06-02T08:00:00.000Z", "Europe/Paris")).toBe("2026-06-02T10:00");
    expect(utcToLocalInput("2026-06-02T08:00:00.000Z", "Africa/Douala")).toBe("2026-06-02T09:00");
    expect(formatInZone("2026-06-02T08:00:00.000Z", "Europe/Paris", "fr-FR")).toContain("10:00");
    expect(formatInZone("pas une date", "Europe/Paris", "fr-FR")).toBe("");
  });
});

describe("durée : 15 à 240 minutes par pas de 5", () => {
  it.each([[15, true], [20, true], [60, true], [240, true], [14, false], [17, false], [245, false], [0, false], [-15, false], [60.5, false], [NaN, false], ["60", false], [null, false]])("%j → %s", (n, ok) => {
    expect(isValidDuration(n)).toBe(ok);
  });
});

describe("types de séance : exactement trois (aucun « couple »)", () => {
  it("liste exacte", () => expect([...SESSION_TYPES]).toEqual(["individual", "follow_up", "review"]));
  it("« couple » et tout autre type refusés à la création", () => {
    for (const type of ["couple", "group", "", null, 3]) expect(validateCreateSession(body({ type }), NOW)).toEqual({ ok: false, code: "bad_type" });
  });
  it("une séance ne concerne qu'UN membre : un tableau ou deux identifiants sont refusés", () => {
    expect(validateCreateSession(body({ member_id: [M, M] }), NOW)).toEqual({ ok: false, code: "bad_member" });
    expect(validateCreateSession(body({ member_id: M, member_ids: [M] }), NOW).ok).toBe(true); // clé inconnue ignorée, jamais utilisée
    const v = validateCreateSession(body({ member_ids: ["x", "y"] }), NOW);
    expect(v.ok && Object.keys(v.value).sort()).toEqual(["durationMinutes", "memberId", "scheduledAtIso", "timezone", "topic", "type"]);
  });
});

describe("validateCreateSession", () => {
  it("corps valide (heure locale)", () => {
    const v = validateCreateSession(body({ topic: "  Bilan  " }), NOW);
    expect(v).toEqual({ ok: true, value: { memberId: M, type: "individual", scheduledAtIso: "2026-06-02T09:00:00.000Z", durationMinutes: 60, timezone: "Africa/Douala", topic: "Bilan" } });
  });
  it("passé refusé, tolérance de 5 minutes", () => {
    expect(validateCreateSession(body({ local: undefined, scheduled_at: new Date(NOW - PAST_GRACE_MS - 1000).toISOString() }), NOW)).toEqual({ ok: false, code: "past" });
    expect(validateCreateSession(body({ local: undefined, scheduled_at: new Date(NOW - PAST_GRACE_MS + 1000).toISOString() }), NOW).ok).toBe(true);
  });
  it("heure ambiguë : refus avec les deux candidats ; inexistante : refus", () => {
    const amb = validateCreateSession(body({ timezone: "Europe/Paris", local: "2026-10-25T02:30" }), Date.UTC(2026, 9, 1));
    expect(amb).toMatchObject({ ok: false, code: "ambiguous_local_time", candidates: ["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"] });
    expect(validateCreateSession(body({ timezone: "Europe/Paris", local: "2026-03-29T02:30" }), Date.UTC(2026, 2, 1))).toMatchObject({ ok: false, code: "nonexistent_local_time" });
  });
  it.each([
    [{ member_id: "pas-uuid" }, "bad_member"], [{ duration_minutes: 17 }, "bad_duration"], [{ timezone: "Mars/Olympus" }, "bad_timezone"],
    [{ topic: "x".repeat(201) }, "bad_topic"], [{ topic: 5 }, "bad_topic"], [{ local: "2026-06-02T10:00:00" }, "bad_datetime"],
  ] as const)("%j → %s", (over, code) => expect(validateCreateSession(body(over as Record<string, unknown>), NOW)).toMatchObject({ ok: false, code }));
  it("corps non objet refusé", () => { for (const b of [null, "x", 3, []]) expect(validateCreateSession(b, NOW)).toEqual({ ok: false, code: "bad_input" }); });
});

describe("validateNewSchedule (reprogrammation et report)", () => {
  it("valide, passé refusé, durée invalide refusée", () => {
    expect(validateNewSchedule({ duration_minutes: 45, timezone: "UTC", scheduled_at: "2026-06-03T10:00:00Z" }, NOW).ok).toBe(true);
    expect(validateNewSchedule({ duration_minutes: 45, timezone: "UTC", scheduled_at: "2026-05-01T10:00:00Z" }, NOW)).toEqual({ ok: false, code: "past" });
    expect(validateNewSchedule({ duration_minutes: 44, timezone: "UTC", scheduled_at: "2026-06-03T10:00:00Z" }, NOW)).toEqual({ ok: false, code: "bad_duration" });
  });
});

describe("machine d'états des séances", () => {
  const STATUSES: SessionStatus[] = ["scheduled", "completed", "cancelled", "postponed", "no_show"];
  const ACTIONS: SessionAction[] = ["complete", "cancel", "no_show", "reschedule", "postpone"];
  const PAST = NOW - 3600_000, FUTURE = NOW + 3600_000;
  it("seule une séance « scheduled » évolue : tout statut terminal refuse toute action", () => {
    for (const s of STATUSES.filter((x) => x !== "scheduled")) for (const a of ACTIONS) expect(canTransition(s, a, PAST, NOW), `${s}/${a}`).toEqual({ ok: false, code: "not_scheduled" });
  });
  it("complete et no_show exigent que la séance ait commencé", () => {
    for (const a of ["complete", "no_show"] as const) {
      expect(canTransition("scheduled", a, FUTURE, NOW)).toEqual({ ok: false, code: "not_started" });
      expect(canTransition("scheduled", a, PAST, NOW)).toEqual({ ok: true });
      expect(canTransition("scheduled", a, NOW, NOW)).toEqual({ ok: true });
    }
  });
  it("cancel, reschedule et postpone possibles avant comme après le début", () => {
    for (const a of ["cancel", "reschedule", "postpone"] as const) {
      expect(canTransition("scheduled", a, FUTURE, NOW)).toEqual({ ok: true });
      expect(canTransition("scheduled", a, PAST, NOW)).toEqual({ ok: true });
    }
  });
});

describe("PATCH : actions et édition, jamais d'horaire ni de statut directs", () => {
  it("action valide", () => expect(parsePatchSession({ action: "cancel" })).toMatchObject({ ok: true, value: { kind: "action", action: "cancel" } }));
  it("action inconnue refusée", () => expect(parsePatchSession({ action: "delete" })).toEqual({ ok: false, code: "bad_action" }));
  it.each([{ scheduled_at: "2026-06-02T10:00:00Z" }, { duration_minutes: 30 }, { status: "completed" }, { coach_id: M }, { member_id: M }, { rescheduled_to: M }, { completed_at: "2026-06-02T10:00:00Z" }])(
    "champ interdit %j → forbidden_field", (b) => expect(parsePatchSession(b)).toEqual({ ok: false, code: "forbidden_field" }));
  it("action + édition mélangées refusées", () => expect(parsePatchSession({ action: "cancel", topic: "x" })).toEqual({ ok: false, code: "forbidden_field" }));
  it("édition du sujet et du type ; type « couple » refusé ; sujet trop long refusé", () => {
    expect(parsePatchSession({ topic: " Nouveau ", type: "review" })).toEqual({ ok: true, value: { kind: "edit", topic: "Nouveau", type: "review" } });
    expect(parsePatchSession({ type: "couple" })).toEqual({ ok: false, code: "bad_type" });
    expect(parsePatchSession({ topic: "x".repeat(201) })).toEqual({ ok: false, code: "bad_topic" });
    expect(parsePatchSession({})).toEqual({ ok: false, code: "bad_input" });
  });
  it("cleanTopic : caractères de contrôle retirés, vide → null", () => {
    expect(cleanTopic("a\u0000b\u0007c")).toEqual({ ok: true, value: "abc" });
    expect(cleanTopic("   ")).toEqual({ ok: true, value: null });
  });
});

describe("erreurs de la base → codes stables", () => {
  it.each(["overlap", "no_access", "past", "not_scheduled", "not_started", "bad_duration", "not_found"])("%s", (code) => {
    expect(mapSessionDbError(`P0001: ${code}`)).toBe(code);
    expect(mapSessionDbError(code)).toBe(code);
  });
  it("erreur inattendue → null (500 générique) ; no_access et not_found → 404 ; conflits → 409", () => {
    expect(mapSessionDbError("connection reset")).toBeNull();
    expect(mapSessionDbError(undefined)).toBeNull();
    expect(SESSION_ERROR_STATUS.no_access).toBe(404);
    expect(SESSION_ERROR_STATUS.not_found).toBe(404);
    expect(SESSION_ERROR_STATUS.overlap).toBe(409);
  });
});
