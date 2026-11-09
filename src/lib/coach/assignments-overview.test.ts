import { describe, expect, test } from "vitest";
import { buildOverview, filterOverview, sanitizeSearch, type AssignmentRow, type CoachRow, type MemberRow } from "./assignments-overview";

const m = (id: string, over: Partial<MemberRow> = {}): MemberRow => ({
  id, name: `N${id}`, pseudo: `p${id}`, first_name: null, last_name: null, email: `${id}@x.fr`, status: "approved", avatar_url: null, ...over,
});
const a = (id: string, coach: string, member: string, status: string, over: Partial<AssignmentRow> = {}): AssignmentRow => ({
  id, coach_id: coach, member_id: member, status, assigned_at: "2026-11-01T10:00:00Z", end_reason: null, ...over,
});
const coaches: CoachRow[] = [
  { user_id: "cA", display_name: "Coach A", email: "a@x.fr", active: true, avatar_url: "https://x/a.png" },
  { user_id: "cB", display_name: "Coach B", email: "b@x.fr", active: false, avatar_url: null },
];

describe("buildOverview", () => {
  const items = buildOverview(
    [m("1"), m("2"), m("3"), m("4"), m("5")],
    [a("o1", "cA", "1", "active"), a("o2", "cA", "2", "pending")],
    [
      a("c3", "cB", "3", "ended", { end_reason: "coach_deactivated", assigned_at: "2026-10-01T00:00:00Z" }),
      a("c4", "cA", "4", "declined", { end_reason: "declined_by_member" }),
    ],
    coaches,
  );
  const by = (id: string) => items.find((i) => i.id === id)!;

  test("situations : actif, en attente, à réaffecter (coach désactivé), sans coach", () => {
    expect(by("1").situation).toBe("active");
    expect(by("2").situation).toBe("pending");
    expect(by("3").situation).toBe("to_reassign");
    expect(by("4").situation).toBe("none"); // refus du membre : pas une réaffectation de coach désactivé
    expect(by("5").situation).toBe("none");
  });
  test("coach attribué avec sa photo ; ancien coach désactivé visible pour « à réaffecter »", () => {
    expect(by("1").coach).toMatchObject({ name: "Coach A", avatar_url: "https://x/a.png", active: true });
    expect(by("3").coach).toMatchObject({ name: "Coach B", active: false });
    expect(by("5").coach).toBeNull();
  });
  test("un seul coach référent par membre (la première attribution ouverte l'emporte)", () => {
    const dup = buildOverview([m("1")], [a("x", "cA", "1", "active"), a("y", "cB", "1", "active")], [], coaches);
    expect(dup).toHaveLength(1);
    expect(dup[0].coach?.id).toBe("cA");
  });
  test("un membre réaffecté après la désactivation n'est plus « à réaffecter »", () => {
    const r = buildOverview([m("3")], [a("n", "cA", "3", "pending")], [a("c3", "cB", "3", "ended", { end_reason: "coach_deactivated" })], coaches);
    expect(r[0].situation).toBe("pending");
    expect(r[0].coach?.id).toBe("cA");
  });
  test("filtres par situation et par coach", () => {
    expect(filterOverview(items, { situation: "to_reassign" }).map((i) => i.id)).toEqual(["3"]);
    expect(filterOverview(items, { coachId: "cA" }).map((i) => i.id).sort()).toEqual(["1", "2"]);
    expect(filterOverview(items, {})).toHaveLength(5);
  });
});

describe("sanitizeSearch", () => {
  test("neutralise les caractères de filtre PostgREST", () => {
    expect(sanitizeSearch("a,b)(c%*d")).toBe("a b c d");
    expect(sanitizeSearch(undefined)).toBe("");
    expect(sanitizeSearch("x".repeat(200))).toHaveLength(80);
  });
});
