import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isIsoCountry } from "./iso-countries";
import { bboxOf, type ZoneCollection } from "./geojson";

const world = JSON.parse(readFileSync(resolve(__dirname, "../../../public/geo/world-countries.geojson"), "utf8")) as ZoneCollection;

describe("frontières mondiales (public/geo/world-countries.geojson)", () => {
  it("chaque pays porte un code ISO 3166-1 alpha-2 valide et unique", () => {
    const codes = world.features.map((f) => f.properties.iso2 as string);
    expect(codes.length).toBeGreaterThan(200);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(isIsoCountry(c)).toBe(true);
  });
  it("contient les pays clés de la diaspora", () => {
    const codes = new Set(world.features.map((f) => f.properties.iso2));
    for (const c of ["FR", "BE", "DE", "GB", "US", "CA", "GA", "NG", "CI", "SN", "CH", "IT", "ES", "CM"]) expect(codes.has(c)).toBe(true);
  });
  it("aucune propriété hors code et noms (aucune donnée de membre)", () => {
    for (const f of world.features) {
      expect(Object.keys(f.properties).sort()).toEqual(["iso2", "name_en", "name_fr"]);
      expect(f.geometry).not.toBeNull();
    }
  });
  it("géométries exploitables (emprise mondiale)", () => {
    const bb = bboxOf(world)!;
    expect(bb[0]).toBeLessThan(-150);
    expect(bb[2]).toBeGreaterThan(150);
  });
});
