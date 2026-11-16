import { describe, expect, it } from "vitest";
import { saveMemberConsent, saveMemberLocation } from "./member-location-server";
import { GENERIC_CITY_LABEL } from "./public-label";

type Row = Record<string, unknown>;

/** Mini base en mémoire : suffisante pour le chemin d'écriture de la localisation. */
function fakeDb(seed: Record<string, Row[]>) {
  const t: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const profileUpdates: Row[] = [];
  const from = (name: string) => {
    t[name] ??= [];
    let filters: Array<(r: Row) => boolean> = [];
    let op: "select" | "update" = "select";
    let patch: Row = {};
    const run = () => {
      const rows = t[name].filter((r) => filters.every((f) => f(r)));
      if (op === "update") {
        if (name === "profiles") profileUpdates.push(patch);
        rows.forEach((r) => Object.assign(r, patch));
        return { data: null, error: null };
      }
      return { data: rows, error: null };
    };
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
      maybeSingle: () => Promise.resolve({ data: (run().data as Row[])[0] ?? null, error: null }),
      insert: (row: Row) => (t[name].push(row), Promise.resolve({ error: null })),
      upsert: (row: Row, o: { onConflict: string }) => {
        const i = t[name].findIndex((r) => r[o.onConflict] === row[o.onConflict]);
        if (i >= 0) t[name][i] = row;
        else t[name].push(row);
        return Promise.resolve({ error: null });
      },
      update: (p: Row) => ((op = "update"), (patch = p), q),
      then: (res: (v: unknown) => unknown) => Promise.resolve(run()).then(res),
    };
    return q;
  };
  return { db: { from } as never, t, profileUpdates };
}

const U = "11111111-1111-4111-8111-111111111111";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const seed = () => ({
  geo_admin_units: [
    { id: id(1), code: "CM004", level: 1, parent_id: null, name_fr: "Centre", name_en: "Centre" },
    { id: id(2), code: "CM004003", level: 2, parent_id: id(1), name_fr: "Mfoundi", name_en: "Mfoundi" },
    { id: id(3), code: "CM004003001", level: 3, parent_id: id(2), name_fr: "Yaoundé 1er", name_en: null },
    { id: id(4), code: "CM005", level: 1, parent_id: null, name_fr: "Littoral", name_en: "Littoral" },
  ],
  geo_places: [
    { id: id(10), name: "Yaoundé", admin_unit_id: id(3), verification_status: "verified", country_code: "CM" },
    { id: id(11), name: "Obscurville", admin_unit_id: null, verification_status: "unverified", country_code: "CM" },
  ],
  profiles: [{ id: U, city: "Ancienne", country: "Cameroun", region: "Centre" }],
  member_locations: [] as Row[],
});

describe("saveMemberLocation", () => {
  it("ville connue : remplit toute la hiérarchie depuis la base", async () => {
    const { db, t } = fakeDb(seed());
    const r = await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), displayLevel: "city" });
    expect(r).toMatchObject({ ok: true, publicCity: "Yaoundé", verification: "verified" });
    expect(t.member_locations[0]).toMatchObject({
      region_id: id(1),
      department_id: id(2),
      arrondissement_id: id(3),
      place_id: id(10),
    });
  });

  it("n'écrit jamais la ville privée dans profiles quand l'affichage n'est pas « ville »", async () => {
    const { db, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), displayLevel: "region" });
    expect(profileUpdates[0]).toEqual({ country: "Cameroun", city: GENERIC_CITY_LABEL });
    // profiles.region n'est jamais synchronisé
    for (const p of profileUpdates) expect(Object.keys(p)).not.toContain("region");
  });

  it("par défaut : affichage « none » et aucun consentement de découverte", async () => {
    const { db, t, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    expect(t.member_locations[0]).toMatchObject({
      display_level: "none",
      nearby_search_enabled: false,
      location_discoverable: false,
      location_consent_at: null,
    });
    expect(profileUpdates[0].city).toBe(GENERIC_CITY_LABEL);
  });

  it("ville ambiguë/incohérente : département hors région refusé", async () => {
    const { db } = fakeDb(seed());
    const r = await saveMemberLocation(db, U, { country: "Cameroun", regionId: id(4), departmentId: id(2) });
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it("localité non répertoriée : saisie manuelle, non vérifiée, arrondissement jamais inventé", async () => {
    const { db, t } = fakeDb(seed());
    const r = await saveMemberLocation(db, U, { country: "Cameroun", city: "Village Inconnu", displayLevel: "city" });
    expect(r).toMatchObject({ ok: true, verification: "unverified" });
    expect(t.member_locations[0]).toMatchObject({ arrondissement_id: null, free_text_city: "Village Inconnu" });
  });

  it("localité sans arrondissement connu : non vérifiée", async () => {
    const { db } = fakeDb(seed());
    const r = await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(11), displayLevel: "city" });
    expect(r).toMatchObject({ ok: true, verification: "unverified" });
  });

  it("résident à l'étranger : pas de référentiel, ville libre, hiérarchie refusée", async () => {
    const { db, t } = fakeDb(seed());
    const ok = await saveMemberLocation(db, U, { country: "France", city: "Lyon", displayLevel: "city" });
    expect(ok).toMatchObject({ ok: true, publicCity: "Lyon" });
    expect(t.member_locations[0]).toMatchObject({ country_code: "FR", free_text_city: "Lyon" });
    const bad = await saveMemberLocation(db, U, { country: "France", regionId: id(1) });
    expect(bad).toMatchObject({ ok: false });
  });

  it("changement de ville : ancien état archivé, consentements conservés", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, {
      country: "Cameroun",
      placeId: id(10),
      displayLevel: "city",
      nearbySearchEnabled: true,
      locationDiscoverable: true,
    });
    await saveMemberLocation(db, U, { country: "Cameroun", city: "Autre village" });
    expect(t.member_location_history).toHaveLength(1);
    expect(t.member_locations[0]).toMatchObject({
      nearby_search_enabled: true,
      location_discoverable: true,
      display_level: "city",
    });
  });

  it("refuse un pays inconnu et un corps invalide", async () => {
    const { db } = fakeDb(seed());
    expect(await saveMemberLocation(db, U, { country: "Atlantide" })).toMatchObject({ ok: false });
    expect(await saveMemberLocation(db, U, { country: "Cameroun", regionId: "pas-un-uuid" })).toMatchObject({ ok: false });
  });
});

describe("saveMemberConsent — réglages indépendants, désactivés par défaut", () => {
  it("refuse sans localisation préalable (rien n'est créé implicitement)", async () => {
    const { db, t } = fakeDb(seed());
    expect(await saveMemberConsent(db, U, { locationDiscoverable: true })).toMatchObject({ ok: false, status: 409 });
    expect(t.member_locations).toHaveLength(0);
  });

  it("les trois réglages sont indépendants : en changer un ne touche pas les autres", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    expect(t.member_locations[0]).toMatchObject({ nearby_search_enabled: false, location_discoverable: false, display_level: "none" });

    await saveMemberConsent(db, U, { locationDiscoverable: true });
    expect(t.member_locations[0]).toMatchObject({ nearby_search_enabled: false, location_discoverable: true, display_level: "none" });

    await saveMemberConsent(db, U, { nearbySearchEnabled: true });
    expect(t.member_locations[0]).toMatchObject({ nearby_search_enabled: true, location_discoverable: true, display_level: "none" });

    await saveMemberConsent(db, U, { displayLevel: "region" });
    expect(t.member_locations[0]).toMatchObject({ nearby_search_enabled: true, location_discoverable: true, display_level: "region" });
  });

  it("autoriser la recherche sans autoriser l'affichage de la ville : profiles.city reste générique", async () => {
    const { db, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    await saveMemberConsent(db, U, { locationDiscoverable: true, nearbySearchEnabled: true });
    // aucun changement de niveau d'affichage → profiles.city n'est pas réécrite avec la ville
    expect(profileUpdates.every((p) => p.city === GENERIC_CITY_LABEL)).toBe(true);
  });

  it("changer le niveau d'affichage met à jour l'étiquette publique, jamais plus précise que choisi", async () => {
    const { db, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    const r = await saveMemberConsent(db, U, { displayLevel: "city" });
    expect(r).toMatchObject({ ok: true, publicCity: "Yaoundé" });
    const r2 = await saveMemberConsent(db, U, { displayLevel: "region" });
    expect(r2).toMatchObject({ ok: true, publicCity: GENERIC_CITY_LABEL });
    expect(profileUpdates.at(-1)).toEqual({ city: GENERIC_CITY_LABEL });
  });

  it("la révocation est enregistrée (désactivation immédiate) et archivée", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), nearbySearchEnabled: true, locationDiscoverable: true });
    await saveMemberConsent(db, U, { locationDiscoverable: false });
    expect(t.member_locations[0]).toMatchObject({ location_discoverable: false });
    expect(t.member_location_history.length).toBeGreaterThan(0);
  });

  it("refuse un corps vide ou invalide", async () => {
    const { db } = fakeDb(seed());
    expect(await saveMemberConsent(db, U, {})).toMatchObject({ ok: false, status: 400 });
    expect(await saveMemberConsent(db, U, { displayLevel: "adresse" })).toMatchObject({ ok: false, status: 400 });
  });
});
