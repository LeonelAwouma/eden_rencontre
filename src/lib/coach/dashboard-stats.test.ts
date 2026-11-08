import { describe, expect, it } from "vitest";
import {
  RECENT_ACTIVITY_LIMIT, RECENT_MEMBERS_LIMIT, RECENT_MEMBER_DTO_KEYS, computeCoverage, computeDashboardStats, sortByRecentConsent,
  type ActivityDto, type CoachMemberView, type FormationState,
} from "./members-view";

const member = (id: string, state: FormationState, consentAt: string | null = "2026-03-01T00:00:00Z"): CoachMemberView => ({
  id, pseudo: `p-${id}`, avatarUrl: null, country: null, city: null, assignedAt: "2026-01-01T00:00:00Z", consentAt,
  formation: null, formationState: state,
});
const activity = (n: number): ActivityDto[] => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, kind: "assignment_accepted", createdAt: `2026-03-0${(i % 9) + 1}`, read: false }));

describe("computeDashboardStats", () => {
  const members = [
    member("1", "completed"), member("2", "completed"), member("3", "inProgress"),
    member("4", "notStarted"), member("5", "notStarted"), member("6", "notStarted"), member("7", "unavailable"),
  ];
  const stats = computeDashboardStats({ coverage: computeCoverage(7, 7, 7), pendingProposals: 2, members, activity: activity(3) });

  it("compte chaque catégorie exactement une fois", () => {
    expect(stats.formationCompleted).toBe(2);
    expect(stats.formationInProgress).toBe(1);
    expect(stats.formationNotStarted).toBe(3);
    expect(stats.formationUnavailable).toBe(1);
  });

  it("invariant : completed + inProgress + notStarted + unavailable = loadedMembers", () => {
    expect(stats.formationCompleted + stats.formationInProgress + stats.formationNotStarted + stats.formationUnavailable).toBe(stats.loadedMembers);
  });

  it("formationEvaluatedMembers = membres dont la formation est classifiable (hors unavailable)", () => {
    expect(stats.formationEvaluatedMembers).toBe(6);
  });

  it("propositions en attente = un compteur, et aucun champ d'identité n'existe dans les statistiques", () => {
    expect(stats.pendingProposals).toBe(2);
    const keys = Object.keys(stats).sort();
    expect(keys).toEqual([
      "activeMembers", "excludedProfiles", "formationCompleted", "formationEvaluatedMembers", "formationInProgress",
      "formationNotStarted", "formationUnavailable", "loadedMembers", "pendingProposals", "recentActivity", "recentMembers",
      "selectedAssignments", "truncated",
    ]);
  });

  it("aucun indicateur de séances, comptes rendus ou objectifs", () => {
    for (const key of Object.keys(stats)) expect(key).not.toMatch(/session|seance|appointment|note|report|objectif|goal|action/i);
  });

  it("aucune catégorie négative ni supérieure au nombre chargé", () => {
    for (const v of [stats.formationCompleted, stats.formationInProgress, stats.formationNotStarted, stats.formationUnavailable]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(stats.loadedMembers);
    }
  });
});

describe("couverture dans les statistiques", () => {
  it("320 affectations retenues / 319 profils : pas tronqué, 1 profil exclu, invariant sur les 319 chargés", () => {
    const loaded = Array.from({ length: 319 }, (_, i) => member(`m${i}`, "notStarted"));
    const s = computeDashboardStats({ coverage: computeCoverage(320, 320, loaded.length), pendingProposals: 0, members: loaded, activity: [] });
    expect(s).toMatchObject({ activeMembers: 320, selectedAssignments: 320, loadedMembers: 319, excludedProfiles: 1, truncated: false });
    expect(s.formationNotStarted).toBe(319);
  });

  it("650 actives : 500 retenues, truncated, activeMembers exact et distinct de loadedMembers", () => {
    const loaded = Array.from({ length: 500 }, (_, i) => member(`m${i}`, i % 2 ? "completed" : "inProgress"));
    const s = computeDashboardStats({ coverage: computeCoverage(650, 500, 500), pendingProposals: 0, members: loaded, activity: [] });
    expect(s).toMatchObject({ activeMembers: 650, selectedAssignments: 500, loadedMembers: 500, excludedProfiles: 0, truncated: true });
    expect(s.formationCompleted + s.formationInProgress).toBe(500);
    expect(s.formationCompleted + s.formationInProgress).not.toBe(s.activeMembers);
  });
});

describe("derniers membres et activité", () => {
  it("cinq membres au plus, triés par consent_at décroissant puis id croissant", () => {
    const list = [
      member("a", "notStarted", "2026-03-01T00:00:00Z"),
      member("b", "notStarted", "2026-03-05T00:00:00Z"),
      member("c", "notStarted", "2026-03-05T00:00:00Z"),
      member("d", "notStarted", "2026-02-01T00:00:00Z"),
      member("e", "notStarted", "2026-03-09T00:00:00Z"),
      member("f", "notStarted", "2026-03-03T00:00:00Z"),
      member("g", "notStarted", null),
    ];
    const s = computeDashboardStats({ coverage: computeCoverage(7, 7, 7), pendingProposals: 0, members: list, activity: [] });
    expect(RECENT_MEMBERS_LIMIT).toBe(5);
    expect(s.recentMembers.map((m) => m.id)).toEqual(["e", "b", "c", "f", "a"]);
    for (const m of s.recentMembers) expect(Object.keys(m).sort()).toEqual([...RECENT_MEMBER_DTO_KEYS].sort());
  });

  it("l'ordre ne dépend pas de l'ordre d'entrée", () => {
    const list = [member("a", "notStarted", "2026-03-01T00:00:00Z"), member("b", "notStarted", "2026-03-02T00:00:00Z")];
    expect(sortByRecentConsent([...list].reverse()).map((m) => m.id)).toEqual(sortByRecentConsent(list).map((m) => m.id));
  });

  it("huit activités au plus", () => {
    const s = computeDashboardStats({ coverage: computeCoverage(0, 0, 0), pendingProposals: 0, members: [], activity: activity(20) });
    expect(RECENT_ACTIVITY_LIMIT).toBe(8);
    expect(s.recentActivity).toHaveLength(8);
  });

  it("aucun membre : tout à zéro, rien d'inventé", () => {
    const s = computeDashboardStats({ coverage: computeCoverage(0, 0, 0), pendingProposals: 0, members: [], activity: [] });
    expect(s).toMatchObject({
      activeMembers: 0, loadedMembers: 0, pendingProposals: 0, formationCompleted: 0, formationInProgress: 0,
      formationNotStarted: 0, formationUnavailable: 0, formationEvaluatedMembers: 0, truncated: false, recentMembers: [], recentActivity: [],
    });
  });
});
