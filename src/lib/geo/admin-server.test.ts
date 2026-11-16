import { describe, expect, it } from "vitest";
import { maskRegionCounts, placeActionSchema, updatePlace } from "./admin-server";

type Row = Record<string, unknown>;
function fakeDb(seed: Record<string, Row[]>) {
  const t: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const from = (name: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let patch: Row | null = null;
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      update: (p: Row) => ((patch = p), q),
      maybeSingle: () => Promise.resolve({ data: (t[name] ?? []).find((r) => filters.every((f) => f(r))) ?? null, error: null }),
      then: (res: (v: unknown) => unknown) => {
        if (patch) (t[name] ?? []).filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, patch));
        return Promise.resolve({ data: null, error: null }).then(res);
      },
    };
    return q;
  };
  return { db: { from } as never, t };
}
const P = "11111111-1111-4111-8111-111111111111";
const A = "22222222-2222-4222-8222-222222222222";
const seed = () => ({
  geo_places: [{ id: P, admin_unit_id: null, verification_status: "unverified" }],
  geo_admin_units: [{ id: A, level: 3 }],
});

describe("totaux par région côté admin", () => {
  it("masque sous 5 (jamais un nombre exact sous le seuil)", () => {
    const r = maskRegionCounts([
      { unitId: "a", name: "Centre", count: 2 }, { unitId: "b", name: "Nord", count: 40 },
      { unitId: "c", name: "Est", count: 9 }, { unitId: "d", name: "Sud", count: 0 },
    ]);
    expect(r.find((x) => x.unitId === "a")!.count).toBeNull();
    expect(r.find((x) => x.unitId === "d")!.count).toBeNull();
    expect(r.every((x) => x.count === null || x.count >= 5)).toBe(true);
  });
});

describe("updatePlace", () => {
  it("n'accepte que des actions connues", () => {
    expect(placeActionSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(placeActionSchema.safeParse({ action: "attach" }).success).toBe(false);
    expect(placeActionSchema.safeParse({ action: "attach", arrondissementId: A }).success).toBe(true);
  });
  it("refuse de valider une localité sans arrondissement", async () => {
    const { db } = fakeDb(seed());
    expect(await updatePlace(db, P, { action: "validate" })).toMatchObject({ ok: false, status: 400 });
  });
  it("rattache à un arrondissement (niveau 3) et vérifie", async () => {
    const { db, t } = fakeDb(seed());
    expect(await updatePlace(db, P, { action: "attach", arrondissementId: A })).toMatchObject({ ok: true, status: "verified" });
    expect(t.geo_places[0]).toMatchObject({ admin_unit_id: A, verification_status: "verified" });
  });
  it("refuse un rattachement à un autre niveau que l'arrondissement", async () => {
    const { db } = fakeDb({ ...seed(), geo_admin_units: [{ id: A, level: 2 }] });
    expect(await updatePlace(db, P, { action: "attach", arrondissementId: A })).toMatchObject({ ok: false, status: 400 });
  });
  it("rejette, rouvre ; id invalide → 400 ; localité inconnue → 404", async () => {
    const { db, t } = fakeDb(seed());
    expect(await updatePlace(db, "pas-un-uuid", { action: "reject" })).toMatchObject({ ok: false, status: 400 });
    expect(await updatePlace(db, A, { action: "reject" })).toMatchObject({ ok: false, status: 404 });
    await updatePlace(db, P, { action: "reject" });
    expect(t.geo_places[0].verification_status).toBe("rejected");
    await updatePlace(db, P, { action: "reopen" });
    expect(t.geo_places[0].verification_status).toBe("unverified");
  });
});
