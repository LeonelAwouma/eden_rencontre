import { describe, expect, it } from "vitest";
import { actionOutcome, buildConsentPayload, buildStopPayload, coachCardMode, coachDisplayName, type CardAssignment } from "./card-mode";

const base: CardAssignment = { id: "a1", status: "pending", consentStatus: "pending", coachName: "Awa", assignedAt: "2026-03-01T00:00:00Z", consentAt: null };
const of = (over: Partial<CardAssignment>): CardAssignment => ({ ...base, ...over });

describe("coachCardMode", () => {
  it("proposition en attente : pending + pending", () => expect(coachCardMode(of({}))).toBe("proposal"));
  it("suivi actif : active + accepted", () => expect(coachCardMode(of({ status: "active", consentStatus: "accepted", consentAt: "2026-03-02" }))).toBe("active"));
  it("aucun dossier : rien affiché", () => {
    expect(coachCardMode(null)).toBe("none");
    expect(coachCardMode(undefined)).toBe("none");
  });
  it.each([
    ["declined", "declined"], ["ended", "accepted"], ["revoked", "withdrawn"],
    ["active", "pending"], ["pending", "accepted"], ["active", "withdrawn"], ["pending", "declined"], ["", ""], ["inconnu", "pending"],
  ])("combinaison %s + %s (terminée, refusée ou incohérente) : rien affiché", (status, consentStatus) => {
    expect(coachCardMode(of({ status, consentStatus }))).toBe("none");
  });
});

describe("buildConsentPayload / buildStopPayload", () => {
  it("consentement : exactement assignment_id et accept — jamais d'identifiant de membre", () => {
    const accept = buildConsentPayload("a1", true);
    const decline = buildConsentPayload("a1", false);
    expect(accept).toEqual({ assignment_id: "a1", accept: true });
    expect(decline).toEqual({ assignment_id: "a1", accept: false });
    expect(Object.keys(accept).sort()).toEqual(["accept", "assignment_id"]);
    for (const k of ["member_id", "memberId", "user_id", "userId", "decision"]) expect(k in accept).toBe(false);
  });

  it("arrêt : assignment_id, raison optionnelle, jamais d'identifiant de membre", () => {
    expect(buildStopPayload("a1")).toEqual({ assignment_id: "a1" });
    expect(buildStopPayload("a1", "member_request")).toEqual({ assignment_id: "a1", reason: "member_request" });
    expect("member_id" in buildStopPayload("a1", "x")).toBe(false);
  });
});

describe("coachDisplayName", () => {
  it("nom d'affichage nettoyé, ou null pour utiliser le repli traduit", () => {
    expect(coachDisplayName("  Awa  ")).toBe("Awa");
    expect(coachDisplayName("")).toBeNull();
    expect(coachDisplayName("   ")).toBeNull();
    expect(coachDisplayName(null)).toBeNull();
    expect(coachDisplayName(undefined)).toBeNull();
  });
});

describe("actionOutcome : aucun succès avant la confirmation du serveur", () => {
  it("succès seulement si 2xx ET l'état attendu est renvoyé", () => {
    expect(actionOutcome(200, { status: "active" }, "active")).toBe("success");
    expect(actionOutcome(200, { status: "declined" }, "declined")).toBe("success");
    expect(actionOutcome(200, { status: "revoked" }, ["revoked", "declined"])).toBe("success");
    expect(actionOutcome(200, { status: "declined" }, ["revoked", "declined"])).toBe("success");
  });
  it("2xx mais état inattendu ou corps illisible : erreur, pas succès", () => {
    expect(actionOutcome(200, { status: "pending" }, "active")).toBe("error");
    expect(actionOutcome(200, {}, "active")).toBe("error");
    expect(actionOutcome(200, null, "active")).toBe("error");
    expect(actionOutcome(204, undefined, "active")).toBe("error");
  });
  it("404 et 409 : proposition obsolète → rechargement", () => {
    expect(actionOutcome(404, { error: "x" }, "active")).toBe("stale");
    expect(actionOutcome(409, { code: "invalid_state" }, "active")).toBe("stale");
  });
  it("autres erreurs : erreur", () => {
    for (const s of [400, 401, 403, 429, 500, 503]) expect(actionOutcome(s, { status: "active" }, "active")).toBe("error");
  });
});
