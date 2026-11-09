import { describe, expect, it } from "vitest";
import {
  ACCEPTED_STAGES, MATCH_CATEGORIES, MATCH_STAGES, categoryCount, compatibleSub, countStages,
  stagesForFilter, stagesFromParams, subFilterCount, subFiltersOf,
  type MatchCategory, type MatchStage,
} from "../admin-filters";

/** Jeu de duos : un nombre distinct par étape pour repérer toute confusion. */
const DUOS: MatchStage[] = [
  ...Array(5).fill("alliance_pending"),
  ...Array(4).fill("relation"),
  ...Array(3).fill("engagement_pending"),
  ...Array(2).fill("match"),
  ...Array(6).fill("engagement_declined"),
  ...Array(7).fill("declined"),
];
const counts = countStages(DUOS);
const list = (category: MatchCategory, sub: string) => {
  const stages = stagesForFilter(category, sub) ?? [];
  return DUOS.filter((s) => stages.includes(s));
};

describe("matching admin-filters", () => {
  it("compteur global : tous les duos, une seule fois chacun", () => {
    expect(categoryCount(counts, "all")).toBe(DUOS.length);
    expect(list("all", "all")).toHaveLength(DUOS.length);
  });

  it("filtre chaque étape et chaque sous-filtre", () => {
    expect(list("todo", "alliance_pending")).toHaveLength(5);            // demandes d'alliance
    expect(list("all", "accepted")).toHaveLength(4 + 3 + 2 + 6);         // alliances acceptées (inclusif)
    expect(list("ongoing", "all")).toHaveLength(4);                      // en relation
    expect(list("todo", "engagement_pending")).toHaveLength(3);          // engagements à valider
    expect(list("done", "match")).toHaveLength(2);                       // matchs confirmés
    expect(list("done", "declined")).toHaveLength(6 + 7);                // refus (alliance + engagement)
  });

  it("« En relation » et « Alliances acceptées » sont deux ensembles distincts", () => {
    expect(ACCEPTED_STAGES).toContain("relation");
    expect(ACCEPTED_STAGES).toContain("match");
    expect(stagesForFilter("ongoing", "all")).toEqual(["relation"]);
  });

  it("les catégories (hors « Tous ») sont disjointes et couvrent tous les duos", () => {
    const seen = new Map<MatchStage, MatchCategory>();
    for (const c of MATCH_CATEGORIES.filter((x) => x.id !== "all")) {
      for (const s of stagesForFilter(c.id, "all") ?? []) {
        expect(seen.has(s), `${s} dans ${seen.get(s)} et ${c.id}`).toBe(false);
        seen.set(s, c.id);
      }
    }
    expect([...seen.keys()].sort()).toEqual([...MATCH_STAGES].sort());
    const sum = (["todo", "ongoing", "done"] as MatchCategory[]).reduce((n, c) => n + categoryCount(counts, c), 0);
    expect(sum).toBe(DUOS.length);
  });

  it("chaque compteur égale la taille de la liste correspondante", () => {
    for (const c of MATCH_CATEGORIES) {
      for (const s of c.subs) {
        expect(subFilterCount(counts, c.id, s.id), `${c.id}/${s.id}`).toBe(list(c.id, s.id).length);
      }
    }
  });

  it("les sous-filtres sont contextuels et jamais vides ni dupliqués", () => {
    expect(subFiltersOf("todo").map((s) => s.id)).toEqual(["all", "alliance_pending", "engagement_pending"]);
    expect(subFiltersOf("done").map((s) => s.id)).toEqual(["all", "match", "declined"]);
    expect(subFiltersOf("ongoing")).toEqual([]); // une seule étape : rien à proposer
    for (const c of MATCH_CATEGORIES) {
      const ids = c.subs.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of c.subs) expect(s.stages.length).toBeGreaterThan(0);
    }
  });

  it("changement de catégorie : sous-filtre conservé s'il est compatible, sinon remis à « tout »", () => {
    expect(compatibleSub("todo", "engagement_pending")).toBe("engagement_pending");
    expect(compatibleSub("done", "engagement_pending")).toBe("all");
    expect(compatibleSub("done", "match")).toBe("match");
    expect(compatibleSub("ongoing", "match")).toBe("all");
  });

  it("paramètres d'API : catégorie + sous-filtre, ancien paramètre stage, valeurs inconnues", () => {
    expect(stagesFromParams({ category: "todo", sub: "all" })).toEqual(["alliance_pending", "engagement_pending"]);
    expect(stagesFromParams({ category: "done", sub: "engagement_pending" })).toEqual(["match", "engagement_declined", "declined"]);
    expect(stagesFromParams({ stage: "accepted" })).toEqual(ACCEPTED_STAGES);
    expect(stagesFromParams({ stage: "match" })).toEqual(["match"]);
    expect(stagesFromParams({ stage: "declined" })).toEqual(["declined", "engagement_declined"]);
    expect(stagesFromParams({ stage: "engagement_declined" })).toEqual(["engagement_declined"]);
    expect(stagesFromParams({ stage: "n'importe quoi" })).toEqual(MATCH_STAGES);
    expect(stagesFromParams({ category: "inconnue" })).toEqual(MATCH_STAGES);
  });

  it("recherche combinée aux filtres : l'intersection ne dépasse jamais le filtre", () => {
    const names = DUOS.map((s, i) => ({ s, hit: i % 2 === 0 }));
    const stages = stagesForFilter("todo", "all") ?? [];
    const result = names.filter((d) => stages.includes(d.s) && d.hit);
    expect(result.length).toBeLessThanOrEqual(list("todo", "all").length);
    expect(result.every((d) => stages.includes(d.s))).toBe(true);
  });
});
