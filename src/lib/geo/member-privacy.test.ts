import { describe, expect, it } from "vitest";
import { deleteMemberLocation, exportMemberLocation } from "./member-location-server";
import { GENERIC_CITY_LABEL } from "./public-label";

type Row = Record<string, unknown>;
function fakeDb(seed: Record<string, Row[]>) {
  const t: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const profileUpdates: Row[] = [];
  const from = (name: string) => {
    t[name] ??= [];
    const filters: Array<(r: Row) => boolean> = [];
    let op: "select" | "delete" | "update" = "select";
    let patch: Row = {};
    const q: Record<string, unknown> = {
      select: () => q,
      order: () => q,
      limit: () => q,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
      delete: () => ((op = "delete"), q),
      update: (p: Row) => ((op = "update"), (patch = p), q),
      maybeSingle: () => Promise.resolve({ data: t[name].find((r) => filters.every((f) => f(r))) ?? null, error: null }),
      then: (res: (v: unknown) => unknown) => {
        const hit = t[name].filter((r) => filters.every((f) => f(r)));
        if (op === "delete") t[name] = t[name].filter((r) => !hit.includes(r));
        if (op === "update") {
          if (name === "profiles") profileUpdates.push(patch);
          hit.forEach((r) => Object.assign(r, patch));
        }
        return Promise.resolve({ data: op === "select" ? hit : null, error: null }).then(res);
      },
    };
    return q;
  };
  return { db: { from } as never, t, profileUpdates };
}
const U = "11111111-1111-4111-8111-111111111111";
const V = "33333333-3333-4333-8333-333333333333";
const seed = () => ({
  member_locations: [
    { user_id: U, country_code: "CM", region_id: "r1", department_id: null, arrondissement_id: null, place_id: "pl1", free_text_city: null, verification_status: "verified", nearby_search_enabled: true, location_discoverable: true, display_level: "city", location_consent_at: "2026-11-01", updated_at: "2026-11-02" },
    { user_id: V, country_code: "CM", display_level: "none" },
  ],
  member_location_history: [
    { user_id: U, changed_at: "2026-11-01", previous: { country_code: "CM", free_text_city: "Ancien", display_level: "none", nearby_search_enabled: false, location_discoverable: false } },
    { user_id: V, changed_at: "2026-11-01", previous: {} },
  ],
  geo_admin_units: [{ id: "r1", name_fr: "Centre" }],
  geo_places: [{ id: "pl1", name: "Yaoundé" }],
  profiles: [{ id: U, city: "Yaoundé", country: "Cameroun" }],
});

describe("suppression de ma localisation", () => {
  it("efface la ligne ET l'historique du membre, sans toucher à ceux des autres", async () => {
    const { db, t } = fakeDb(seed());
    expect(await deleteMemberLocation(db, U)).toEqual({ ok: true });
    expect(t.member_locations.map((r) => r.user_id)).toEqual([V]);
    expect(t.member_location_history.map((r) => r.user_id)).toEqual([V]);
  });
  it("profiles.city retombe sur l'étiquette générique ; le pays est conservé", async () => {
    const { db, profileUpdates } = fakeDb(seed());
    await deleteMemberLocation(db, U);
    expect(profileUpdates).toEqual([{ city: GENERIC_CITY_LABEL }]);
  });
});

describe("export de mes données de localisation", () => {
  it("noms lisibles, réglages et historique ; aucune coordonnée ni identifiant interne", async () => {
    const { db } = fakeDb(seed());
    const r = await exportMemberLocation(db, U);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.location).toMatchObject({ region: "Centre", city: "Yaoundé", appearInOthersSearches: true, displayLevel: "city" });
      expect(r.data.history).toHaveLength(1);
      expect(JSON.stringify(r.data)).not.toMatch(/latitude|longitude|coordinates|region_id|place_id|user_id/i);
    }
  });
  it("sans localisation : location nulle, pas d'erreur", async () => {
    const { db } = fakeDb({ ...seed(), member_locations: [] });
    const r = await exportMemberLocation(db, U);
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.data.location).toBeNull();
  });
});
