import { describe, expect, it } from "vitest";
import {
  ADMIN_MAP_SCOPES, MAP_COLORS, classBreaks, colorFor, countriesWithoutGeometry, legendFor, parseAdminMapQuery, parseScope,
} from "./admin-map";

const P = "11111111-1111-4111-8111-111111111111";

describe("portée et paramètres", () => {
  it("approved par défaut ; all = approuvés, en attente, suspendus ; jamais rejected", () => {
    expect(parseScope(null)).toBe("approved");
    expect(parseScope("all")).toBe("all");
    expect(parseScope("rejected")).toBeNull();
    expect(ADMIN_MAP_SCOPES.approved).toEqual(["approved"]);
    expect(ADMIN_MAP_SCOPES.all).toEqual(["approved", "pending", "suspended"]);
    expect(Object.values(ADMIN_MAP_SCOPES).flat()).not.toContain("rejected");
  });
  it("niveau 1 sans parent ; 2 et 3 avec un parent uuid", () => {
    expect(parseAdminMapQuery("1", null, null)).toEqual({ level: 1, parent: null, scope: "approved" });
    expect(parseAdminMapQuery("2", P, "all")).toEqual({ level: 2, parent: P, scope: "all" });
    expect(parseAdminMapQuery("2", null, null)).toBeNull();
    expect(parseAdminMapQuery("1", P, null)).toBeNull();
    expect(parseAdminMapQuery("4", null, null)).toBeNull();
    expect(parseAdminMapQuery("3", "pas-un-uuid", null)).toBeNull();
    expect(parseAdminMapQuery("1", null, "tout")).toBeNull();
  });
});

describe("classes de couleur (aucun masquage)", () => {
  it("les effectifs 1 à 4 sont colorés, jamais traités comme absents", () => {
    const classes = classBreaks([1, 2, 3, 4]);
    for (const v of [1, 2, 3, 4]) {
      expect(colorFor(v, classes)).not.toBe(MAP_COLORS.zero);
      expect(colorFor(v, classes)).not.toBe(MAP_COLORS.noData);
    }
  });
  it("un seul membre dans une seule zone reste visible", () => {
    const classes = classBreaks([0, 0, 1]);
    expect(classes).toEqual([{ min: 1, max: 1, color: MAP_COLORS.scale[3] }]);
    expect(colorFor(1, classes)).toBe(MAP_COLORS.scale[3]);
  });
  it("zéro et « pas de données » sont distincts", () => {
    const classes = classBreaks([5, 10]);
    expect(colorFor(0, classes)).toBe(MAP_COLORS.zero);
    expect(colorFor(null, classes)).toBe(MAP_COLORS.noData);
    expect(MAP_COLORS.zero).not.toBe(MAP_COLORS.noData);
  });
  it("classes contiguës de 1 au maximum, au plus 4, croissantes", () => {
    const values = [1, 1, 2, 3, 5, 8, 13, 21, 34, 120];
    const classes = classBreaks(values);
    expect(classes.length).toBeLessThanOrEqual(4);
    expect(classes[0].min).toBe(1);
    expect(classes[classes.length - 1].max).toBe(120);
    for (let i = 1; i < classes.length; i++) expect(classes[i].min).toBe(classes[i - 1].max + 1);
    // chaque valeur tombe dans exactement une classe
    for (const v of values) expect(classes.filter((c) => v >= c.min && v <= c.max)).toHaveLength(1);
  });
  it("la légende reprend exactement les seuils de coloration", () => {
    const classes = classBreaks([1, 4, 9, 30, 60]);
    const legend = legendFor(classes, { noData: true });
    expect(legend[0]).toMatchObject({ label: "0", color: MAP_COLORS.zero });
    const cls = legend.filter((l) => l.kind === "class");
    expect(cls).toHaveLength(classes.length);
    cls.forEach((l, i) => {
      const c = classes[i];
      expect(l.label).toBe(c.min === c.max ? `${c.min}` : `${c.min} – ${c.max}`);
      expect(l.color).toBe(colorFor(c.max, classes));
      expect(l.color).toBe(colorFor(c.min, classes));
    });
    expect(legend[legend.length - 1].kind).toBe("noData");
  });
  it("aucune valeur positive : aucune classe", () => {
    expect(classBreaks([0, 0])).toEqual([]);
  });
});

describe("pays sans géométrie", () => {
  it("sont signalés, jamais retirés", () => {
    const countries = [
      { code: "FR", name: "France", count: 3, withCity: 1 },
      { code: "SG", name: "Singapour", count: 1, withCity: 0 },
    ];
    expect(countriesWithoutGeometry(["FR", "BE"], countries)).toEqual([countries[1]]);
  });
});
