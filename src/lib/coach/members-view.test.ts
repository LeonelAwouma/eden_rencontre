import { describe, expect, it } from "vitest";
import {
  MEMBERS_PAGE_SIZE, classifyFormation, computeCoverage, computeFormationOverview, filterMembers, isFormationComplete,
  normalizeForSearch, paginate, parseMembersQuery, sortMembers, toActivityDto, toMemberListItem,
  type CoachMemberView, type FormationState,
} from "./members-view";
import { summarizeFormation } from "@/lib/formation/admin-summary";

const view = (over: Partial<CoachMemberView> & { id: string }): CoachMemberView => ({
  pseudo: "x", avatarUrl: null, country: null, city: null, assignedAt: "2026-01-01T00:00:00Z", consentAt: "2026-01-02T00:00:00Z",
  formation: null, formationState: "unavailable", ...over,
});

describe("isFormationComplete / classifyFormation", () => {
  it("terminée seulement si total > 0 et done === total", () => {
    expect(isFormationComplete({ done: 10, total: 10 })).toBe(true);
    expect(isFormationComplete({ done: 9, total: 10 })).toBe(false);
    expect(isFormationComplete({ done: 0, total: 0 })).toBe(false);
    expect(isFormationComplete(null)).toBe(false);
  });

  it("catégories mutuellement exclusives", () => {
    expect(classifyFormation({ done: 0, total: 10 })).toBe("notStarted");
    expect(classifyFormation({ done: 3, total: 10 })).toBe("inProgress");
    expect(classifyFormation({ done: 10, total: 10 })).toBe("completed");
  });

  it.each([
    ["absent", null],
    ["done > total", { done: 11, total: 10 }],
    ["done négatif", { done: -1, total: 10 }],
    ["done non entier", { done: 1.5, total: 10 }],
    ["total non entier", { done: 1, total: 10.2 }],
    ["total = 0", { done: 0, total: 0 }],
    ["total négatif", { done: 0, total: -3 }],
    ["NaN", { done: Number.NaN, total: 10 }],
    ["Infinity", { done: 1, total: Number.POSITIVE_INFINITY }],
  ] as const)("donnée incohérente (%s) → unavailable, jamais corrigée", (_label, summary) => {
    expect(classifyFormation(summary as never)).toBe("unavailable");
  });

  it("un résumé réel de summarizeFormation est classé", () => {
    expect(classifyFormation(summarizeFormation([]))).toBe("notStarted");
  });

  it("summarizeFormation transforme un non-tableau en « rien fait » : le chargeur ne doit PAS le lui confier (voir members-data)", () => {
    expect(classifyFormation(summarizeFormation("n'importe quoi"))).toBe("notStarted");
  });
});

describe("recherche, filtre, tri", () => {
  const members = [
    view({ id: "3", pseudo: "Élodie", formationState: "completed" }),
    view({ id: "1", pseudo: "awa", formationState: "inProgress" }),
    view({ id: "2", pseudo: "Awa", formationState: "notStarted" }),
    view({ id: "4", pseudo: null, formationState: "unavailable" }),
    view({ id: "5", pseudo: "Zoé", formationState: "inProgress" }),
  ];

  it("normalise accents et casse", () => {
    expect(normalizeForSearch("  Élodie ")).toBe("elodie");
    expect(normalizeForSearch(null)).toBe("");
  });

  it("recherche insensible à la casse et aux accents, sur le pseudo seulement", () => {
    expect(filterMembers(members, { q: "ELODIE" }).map((m) => m.id)).toEqual(["3"]);
    expect(filterMembers(members, { q: "aw" }).map((m) => m.id).sort()).toEqual(["1", "2"]);
    expect(filterMembers(members, { q: "zzz" })).toEqual([]);
  });

  it("un pseudo absent ne correspond à aucune recherche non vide", () => {
    expect(filterMembers(members, { q: "x" }).some((m) => m.id === "4")).toBe(false);
    expect(filterMembers(members, { q: "" }).some((m) => m.id === "4")).toBe(true);
  });

  it("filtre par progression : « unavailable » n'apparaît que sous « all »", () => {
    expect(filterMembers(members, { state: "inProgress" }).map((m) => m.id).sort()).toEqual(["1", "5"]);
    expect(filterMembers(members, { state: "completed" }).map((m) => m.id)).toEqual(["3"]);
    for (const s of ["completed", "inProgress", "notStarted"] as const) {
      expect(filterMembers(members, { state: s }).every((m) => m.formationState !== "unavailable")).toBe(true);
    }
    expect(filterMembers(members, { state: "all" })).toHaveLength(5);
  });

  it("tri déterministe : pseudo normalisé, ex æquo par id, pseudo absent en dernier", () => {
    expect(sortMembers(members).map((m) => m.id)).toEqual(["1", "2", "3", "5", "4"]);
  });

  it("le tri est stable quel que soit l'ordre d'entrée", () => {
    const a = sortMembers(members).map((m) => m.id);
    const b = sortMembers([...members].reverse()).map((m) => m.id);
    const c = sortMembers([members[2], members[0], members[4], members[1], members[3]]).map((m) => m.id);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));

  it("12 par page, pages complètes sans doublon ni oubli", () => {
    expect(MEMBERS_PAGE_SIZE).toBe(12);
    const p1 = paginate(list, 1), p2 = paginate(list, 2), p3 = paginate(list, 3);
    expect([p1.items.length, p2.items.length, p3.items.length]).toEqual([12, 12, 6]);
    expect(p1.totalPages).toBe(3);
    const ids = [...p1.items, ...p2.items, ...p3.items].map((i) => i.id);
    expect(new Set(ids).size).toBe(30);
    expect(ids).toEqual(list.map((i) => i.id));
  });

  it("liste vide : une page vide", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, totalPages: 1, total: 0 });
  });

  it("page hors bornes ramenée dans [1, totalPages]", () => {
    expect(paginate(list, 99).page).toBe(3);
    expect(paginate(list, 0).page).toBe(1);
    expect(paginate(list, -4).page).toBe(1);
    expect(paginate(list, Number.NaN).page).toBe(1);
  });
});

describe("parseMembersQuery : validation stricte", () => {
  const parse = (qs: string) => parseMembersQuery(new URLSearchParams(qs));

  it("valeurs par défaut", () => {
    expect(parse("")).toEqual({ ok: true, q: "", state: "all", page: 1 });
  });
  it("valeurs valides", () => {
    expect(parse("q=%20awa%20&state=completed&page=3")).toEqual({ ok: true, q: "awa", state: "completed", page: 3 });
  });
  it("q trop longue refusée, q de 60 caractères acceptée", () => {
    expect(parse(`q=${"a".repeat(61)}`)).toEqual({ ok: false });
    expect(parse(`q=${"a".repeat(60)}`).ok).toBe(true);
  });
  it.each(["state=bogus", "state=ALL", "state=completed;drop", "page=0", "page=-1", "page=1.5", "page=abc", "page=1e3", "page=10001", "page=123456", "page=%20"])(
    "refuse %s", (qs) => expect(parse(qs)).toEqual({ ok: false }));
});

describe("couverture du chargement", () => {
  it("320 retenues / 319 chargées : pas de troncature, 1 profil exclu", () => {
    expect(computeCoverage(320, 320, 319)).toEqual({ activeMembers: 320, selectedAssignments: 320, loadedMembers: 319, excludedProfiles: 1, truncated: false });
  });
  it("650 actives / 500 retenues : troncature, profils manquants comptés à part", () => {
    expect(computeCoverage(650, 500, 498)).toEqual({ activeMembers: 650, selectedAssignments: 500, loadedMembers: 498, excludedProfiles: 2, truncated: true });
  });
  it("exactement 500 actives : pas de troncature", () => {
    expect(computeCoverage(500, 500, 500).truncated).toBe(false);
  });
});

describe("DTO d'activité", () => {
  it("quatre champs exactement, aucun texte libre", () => {
    const dto = toActivityDto({ id: "n1", kind: "assignment_accepted", created_at: "2026-02-01T10:00:00Z", read_at: null, title: "Awa a accepté", body: "x", link: "/y", recipient_id: "r" });
    expect(dto).toEqual({ id: "n1", kind: "assignment_accepted", createdAt: "2026-02-01T10:00:00Z", read: false });
    expect(Object.keys(dto!).sort()).toEqual(["createdAt", "id", "kind", "read"]);
  });
  it("kind inconnu → other ; lu si read_at renseigné ; ligne sans id ignorée", () => {
    expect(toActivityDto({ id: "n2", kind: "<script>", created_at: "d", read_at: "2026-02-02" })).toMatchObject({ kind: "other", read: true });
    expect(toActivityDto({ kind: "assignment_ended" })).toBeNull();
    expect(toActivityDto(null)).toBeNull();
  });
});

describe("listes exposées", () => {
  const withSummary = (done: string[]) => {
    const formation = summarizeFormation(done);
    return view({ id: "m", pseudo: "Awa", formation, formationState: classifyFormation(formation) });
  };

  it("élément de liste : pourcentage seulement si la progression est exploitable", () => {
    expect(toMemberListItem(withSummary([]))).toMatchObject({ formationState: "notStarted", formationPercent: 0, formationDone: 0 });
    expect(toMemberListItem(view({ id: "u" }))).toMatchObject({ formationState: "unavailable", formationPercent: null, formationDone: null, formationTotal: null });
  });

  it("page Formation : membres « unavailable » exclus des agrégats, prochaine leçon seulement si déterminée", () => {
    const empty = withSummary([]);
    const unavailable = view({ id: "u", pseudo: "Zed" });
    const overview = computeFormationOverview([empty, unavailable]);
    expect(overview.rows).toHaveLength(2);
    expect(overview.rows.find((r) => r.id === "u")).toMatchObject({ formationState: "unavailable", percent: null, nextLesson: null });
    expect(overview.rows.find((r) => r.id === "m")?.nextLesson).not.toBeNull();
    for (const p of overview.pillars) {
      expect(p.membersDone + p.membersInProgress + p.membersNotStarted).toBe(1); // un seul membre classifiable
    }
  });

  it("états typés : les 4 valeurs sont les seules possibles", () => {
    const states: FormationState[] = ["completed", "inProgress", "notStarted", "unavailable"];
    expect(new Set(states).size).toBe(4);
  });
});
