import { describe, expect, test } from "vitest";
import {
  DAY_MS, MAX_ATTEMPTS, REACTIVATION_STEPS, classifySend, inactiveDays, isUnusableEmail, nextAction, sentRecently,
  type SendRow,
} from "./member-reactivation-policy";

const NOW = Date.parse("2026-11-12T10:00:00Z");
const SINCE = "2026-10-01T00:00:00Z";
const row = (step: number, status: SendRow["status"], over: Partial<SendRow> = {}): SendRow => ({
  user_id: "u", inactive_since: SINCE, step_days: step, status,
  claimed_at: new Date(NOW - 30 * DAY_MS).toISOString(), sent_at: status === "sent" ? new Date(NOW - 30 * DAY_MS).toISOString() : null, attempts: 1, ...over,
});

describe("rappels : seuils 7 / 21 / 45 jours", () => {
  test("les seuils sont exactement 7, 21 et 45", () => {
    expect([...REACTIVATION_STEPS]).toEqual([7, 21, 45]);
  });
  test("aucun palier avant 7 jours ; le premier à 7 jours", () => {
    expect(nextAction(6, [], NOW)).toBeNull();
    expect(nextAction(7, [], NOW)).toEqual({ step: 7, mode: "new" });
  });
  test("le palier suivant n'arrive qu'une fois le précédent envoyé", () => {
    expect(nextAction(21, [row(7, "sent")], NOW)).toEqual({ step: 21, mode: "new" });
    expect(nextAction(20, [row(7, "sent")], NOW)).toBeNull();
    expect(nextAction(45, [row(7, "sent"), row(21, "sent")], NOW)).toEqual({ step: 45, mode: "new" });
    expect(nextAction(90, [row(7, "sent"), row(21, "sent"), row(45, "sent")], NOW)).toBeNull();
  });
  test("un membre inactif depuis 50 jours sans envoi commence par le palier 7 (un seul e-mail à la fois)", () => {
    expect(nextAction(50, [], NOW)).toEqual({ step: 7, mode: "new" });
  });
  test("inactivité mesurée depuis la dernière VISITE ; jamais déduite de l'inscription", () => {
    expect(inactiveDays(null, NOW)).toBeNull();
    expect(inactiveDays("pas une date", NOW)).toBeNull();
    expect(inactiveDays(new Date(NOW - 7 * DAY_MS - 1000).toISOString(), NOW)).toBe(7);
    expect(inactiveDays(new Date(NOW - 7 * DAY_MS + 1000).toISOString(), NOW)).toBe(6);
  });
});

describe("rappels : doublons, reprises et échecs", () => {
  test("un palier en cours (claimed récent) suspend l'envoi : jamais de doublon", () => {
    const fresh = row(7, "claimed", { claimed_at: new Date(NOW - 60_000).toISOString() });
    expect(classifySend(fresh, NOW)).toBe("in_progress");
    expect(nextAction(30, [fresh], NOW)).toBeNull();
  });
  test("une prise en charge périmée (> 1 h) est reprenable", () => {
    const stale = row(7, "claimed", { claimed_at: new Date(NOW - 2 * 3600_000).toISOString() });
    expect(classifySend(stale, NOW)).toBe("retryable");
    expect(nextAction(30, [stale], NOW)).toMatchObject({ step: 7, mode: "retry" });
  });
  test("un échec est retenté au plus une fois par jour, puis abandonné après 3 tentatives", () => {
    const justFailed = row(7, "failed", { claimed_at: new Date(NOW - 3600_000).toISOString() });
    expect(classifySend(justFailed, NOW)).toBe("retry_later");
    expect(classifySend(row(7, "failed", { claimed_at: new Date(NOW - 25 * 3600_000).toISOString() }), NOW)).toBe("retryable");
    expect(classifySend(row(7, "failed", { attempts: MAX_ATTEMPTS }), NOW)).toBe("abandoned");
  });
  test("une adresse abandonnée ne bloque pas le palier suivant", () => {
    expect(nextAction(30, [row(7, "failed", { attempts: MAX_ATTEMPTS })], NOW)).toEqual({ step: 21, mode: "new" });
  });
  test("espacement : pas de nouvel e-mail moins de 7 jours après le dernier envoi réussi", () => {
    const recent = row(7, "sent", { sent_at: new Date(NOW - 2 * DAY_MS).toISOString() });
    expect(sentRecently([recent], NOW)).toBe(true);
    expect(sentRecently([row(7, "sent", { sent_at: new Date(NOW - 8 * DAY_MS).toISOString() })], NOW)).toBe(false);
    expect(sentRecently([row(7, "failed")], NOW)).toBe(false);
  });
});

describe("rappels : comptes exclus", () => {
  test("adresses techniques ou inutilisables", () => {
    const sys = "admin-system@eden.local";
    expect(isUnusableEmail(null, sys)).toBe(true);
    expect(isUnusableEmail("", sys)).toBe(true);
    expect(isUnusableEmail("pas-un-mail", sys)).toBe(true);
    expect(isUnusableEmail("ADMIN-system@eden.local", sys)).toBe(true);
    expect(isUnusableEmail("x@phone.local", sys)).toBe(true);
    expect(isUnusableEmail("a@example.com", sys)).toBe(true);
    expect(isUnusableEmail("awa@gmail.com", sys)).toBe(false);
  });
});
