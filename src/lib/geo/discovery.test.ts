import { describe, expect, it } from "vitest";
import {
  chunk, collectPages, distanceBand, orderForDiscover, parseScope, toPublicCandidate,
  type PublicCandidate, type RawCandidate,
} from "./discovery";

const raw = (over: Partial<RawCandidate> = {}): RawCandidate => ({
  user_id: "u1", category: "in_scope", display_level: "city", country_code: "CM", same_place: false,
  distance_m: 80_000, region_name: "Centre", department_name: "Mfoundi", arrondissement_name: "Yaoundé 1er",
  city_name: "Yaoundé", ...over,
});

describe("parseScope", () => {
  it("accepte les portées prévues et les rayons 25/50/100/250", () => {
    expect(parseScope("city")).toEqual({ sqlScope: "city", radiusKm: null });
    expect(parseScope("radius100")).toEqual({ sqlScope: "radius", radiusKm: 100 });
    expect(parseScope("country")).toEqual({ sqlScope: "country", radiusKm: null });
  });
  it("refuse tout le reste, dont un rayon inférieur à 25 km (anti-déduction)", () => {
    for (const bad of ["radius5", "radius10", "radius1000", "none", "", "x", null, 3, undefined]) {
      expect(parseScope(bad)).toBeNull();
    }
  });
});

describe("distanceBand", () => {
  it("catégories, jamais de valeur précise", () => {
    expect(distanceBand(1, true)).toBe("same_city");
    expect(distanceBand(24_999, false)).toBe("lt25");
    expect(distanceBand(25_000, false)).toBe("25_50");
    expect(distanceBand(99_999, false)).toBe("50_100");
    expect(distanceBand(249_000, false)).toBe("100_250");
    expect(distanceBand(900_000, false)).toBe("gt250");
  });
  it("inconnue si non calculable", () => {
    expect(distanceBand(null, false)).toBeNull();
    expect(distanceBand(Number.NaN, false)).toBeNull();
  });
});

describe("toPublicCandidate — respect du niveau d'affichage", () => {
  it("« none » : aucune ville, aucune zone, aucune distance", () => {
    const p = toPublicCandidate(raw({ display_level: "none" }));
    expect(p).toEqual({ userId: "u1", category: "in_scope", proximityBand: null, locationLabel: null });
  });
  it("même ville : le libellé reste celui du niveau choisi, pas plus précis", () => {
    expect(toPublicCandidate(raw({ display_level: "region" })).locationLabel).toBe("Centre");
    expect(toPublicCandidate(raw({ display_level: "department" })).locationLabel).toBe("Mfoundi");
    expect(toPublicCandidate(raw({ display_level: "arrondissement" })).locationLabel).toBe("Yaoundé 1er");
    expect(toPublicCandidate(raw({ display_level: "city" })).locationLabel).toBe("Yaoundé");
    expect(toPublicCandidate(raw({ display_level: "country" })).locationLabel).toBe("Cameroun");
  });
  it("une catégorie de distance n'est donnée que pour département / arrondissement / ville", () => {
    for (const level of ["none", "country", "region"] as const) {
      expect(toPublicCandidate(raw({ display_level: level })).proximityBand).toBeNull();
    }
    for (const level of ["department", "arrondissement", "city"] as const) {
      expect(toPublicCandidate(raw({ display_level: level })).proximityBand).toBe("50_100");
    }
  });
  it("« Même ville » n'est révélé qu'au niveau ville ; département / arrondissement : « < 25 km »", () => {
    const same = { same_place: true, distance_m: 0 };
    expect(toPublicCandidate(raw({ ...same, display_level: "city" })).proximityBand).toBe("same_city");
    for (const level of ["department", "arrondissement"] as const) {
      expect(toPublicCandidate(raw({ ...same, display_level: level })).proximityBand).toBe("lt25");
    }
  });
  it("non localisé : jamais de ville, de zone ni de distance, quoi que contienne la ligne brute", () => {
    const p = toPublicCandidate(raw({ category: "unlocated", display_level: "city" }));
    expect(p).toEqual({ userId: "u1", category: "unlocated", proximityBand: null, locationLabel: null });
  });
  it("aucune coordonnée ni distance exacte dans la sortie", () => {
    const json = JSON.stringify(toPublicCandidate(raw()));
    expect(json).not.toMatch(/distance_m|80000|lat|lon|point|coord/i);
    expect(Object.keys(toPublicCandidate(raw())).sort()).toEqual(["category", "locationLabel", "proximityBand", "userId"]);
  });
});

describe("orderForDiscover — le score n'est jamais modifié", () => {
  const meta = new Map<string, PublicCandidate>([
    ["a", { userId: "a", category: "in_scope", proximityBand: "100_250", locationLabel: null }],
    ["b", { userId: "b", category: "in_scope", proximityBand: "same_city", locationLabel: null }],
    ["c", { userId: "c", category: "in_scope", proximityBand: null, locationLabel: null }],
    ["d", { userId: "d", category: "unlocated", proximityBand: null, locationLabel: null }],
    ["e", { userId: "e", category: "in_scope", proximityBand: "same_city", locationLabel: null }],
  ]);
  // Déjà classé par compatibilité décroissante : a(95) > d(90) > b(85) > c(80) > e(75) ; « z » hors périmètre.
  const ranked = [{ id: "a" }, { id: "d" }, { id: "b" }, { id: "c" }, { id: "e" }, { id: "z" }];

  it("mode compatibilité : ordre de compatibilité conservé, non localisés après, hors périmètre écartés", () => {
    const r = orderForDiscover(ranked, meta, "compat");
    expect(r.located.map((m) => m.id)).toEqual(["a", "b", "c", "e"]);
    expect(r.unlocated.map((m) => m.id)).toEqual(["d"]);
  });
  it("mode proximité : tri stable par catégorie, ex æquo départagés par la compatibilité, inconnue en dernier", () => {
    const r = orderForDiscover(ranked, meta, "proximity");
    expect(r.located.map((m) => m.id)).toEqual(["b", "e", "a", "c"]);
  });
  it("ne crée ni ne supprime de profil compatible dans le périmètre", () => {
    const r = orderForDiscover(ranked, meta, "proximity");
    expect([...r.located, ...r.unlocated].map((m) => m.id).sort()).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("collectPages — pagination cohérente", () => {
  const mk = (n: number): PublicCandidate[] =>
    Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, category: "in_scope", proximityBand: null, locationLabel: null }));

  it("récupère plus de 200 résultats (limite de listMembers) sans en perdre", async () => {
    const all = mk(450);
    const r = await collectPages(async (off) => ({
      candidates: all.slice(off, off + 100),
      nextOffset: off + 100 < all.length ? off + 100 : null,
    }));
    expect(r.candidates).toHaveLength(450);
    expect(new Set(r.candidates.map((c) => c.userId)).size).toBe(450);
    expect(r.truncated).toBe(false);
  });
  it("signale la troncature au lieu de masquer silencieusement", async () => {
    const all = mk(300);
    const r = await collectPages(
      async (off) => ({ candidates: all.slice(off, off + 100), nextOffset: off + 100 < all.length ? off + 100 : null }),
      200,
    );
    expect(r.candidates).toHaveLength(200);
    expect(r.truncated).toBe(true);
  });
});

describe("chunk", () => {
  it("découpe sans perte", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
