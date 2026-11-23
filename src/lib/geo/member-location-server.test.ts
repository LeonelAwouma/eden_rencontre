import { describe, expect, it } from "vitest";
import { saveMemberConsent, saveMemberLocation } from "./member-location-server";
import { GENERIC_CITY_LABEL } from "./public-label";

type Row = Record<string, unknown>;

/**
 * Mini base en mémoire : suffisante pour le chemin d'écriture de la localisation.
 * `resolve` simule geo_resolve_city (nom saisi → candidats) ; "error" simule un référentiel indisponible.
 */
function fakeDb(seed: Record<string, Row[]>, resolve: Record<string, Row[] | "error"> = {}) {
  const t: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const profileUpdates: Row[] = [];
  const rpcCalls: Array<{ fn: string; args: Row }> = [];
  const rpc = (fn: string, args: Row) => {
    rpcCalls.push({ fn, args });
    const r = fn === "geo_resolve_city" ? resolve[String(args.p_city)] : undefined;
    if (r === "error" || fn !== "geo_resolve_city") return Promise.resolve({ data: null, error: { message: "indisponible" } });
    return Promise.resolve({ data: r ?? [], error: null });
  };
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
  return { db: { from, rpc } as never, t, profileUpdates, rpcCalls };
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

  it("ville seule : résolue côté serveur, toute la hiérarchie remplie sans rien demander", async () => {
    const yaounde = [{ place_id: id(10), match_kind: "canonical", place_type: "city", total_count: 1 }];
    const { db, t, rpcCalls } = fakeDb(seed(), { Yaoundé: yaounde });
    const r = await saveMemberLocation(db, U, { country: "Cameroun", city: "Yaoundé" });
    expect(r).toMatchObject({ ok: true, verification: "verified" });
    expect(rpcCalls).toEqual([{ fn: "geo_resolve_city", args: { p_city: "Yaoundé", p_country: "CM" } }]);
    expect(t.member_locations[0]).toMatchObject({
      place_id: id(10), arrondissement_id: id(3), department_id: id(2), region_id: id(1), free_text_city: null,
    });
  });

  it("ville seule ambiguë ou inconnue : texte libre, aucun arrondissement inventé", async () => {
    const two = [
      { place_id: id(10), match_kind: "canonical", place_type: "city", total_count: 2 },
      { place_id: id(11), match_kind: "canonical", place_type: "city", total_count: 2 },
    ];
    for (const city of ["Doublonville", "Nulle Part"]) {
      const { db, t } = fakeDb(seed(), { Doublonville: two });
      const r = await saveMemberLocation(db, U, { country: "Cameroun", city });
      expect(r).toMatchObject({ ok: true, verification: "unverified" });
      expect(t.member_locations[0]).toMatchObject({ place_id: null, arrondissement_id: null, department_id: null, region_id: null, free_text_city: city });
    }
  });

  it("référentiel indisponible : la ville est enregistrée en texte libre, sans échec", async () => {
    const { db, t } = fakeDb(seed(), { Yaoundé: "error" });
    const r = await saveMemberLocation(db, U, { country: "Cameroun", city: "Yaoundé" });
    expect(r).toMatchObject({ ok: true });
    expect(t.member_locations[0]).toMatchObject({ place_id: null, free_text_city: "Yaoundé" });
  });

  it("aucune recherche inutile : localité déjà choisie, pays étranger ou ville générique", async () => {
    const { db, rpcCalls } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), city: "Yaoundé" });
    await saveMemberLocation(db, U, { country: "France", city: "Lyon" });
    await saveMemberLocation(db, U, { country: "Cameroun", city: GENERIC_CITY_LABEL });
    expect(rpcCalls).toEqual([]);
  });

  it("n'écrit jamais la ville privée dans profiles quand l'affichage n'est pas « ville »", async () => {
    const { db, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), displayLevel: "region" });
    expect(profileUpdates[0]).toEqual({ country: "Cameroun", city: GENERIC_CITY_LABEL });
    // profiles.region n'est jamais synchronisé
    for (const p of profileUpdates) expect(Object.keys(p)).not.toContain("region");
  });

  it("par défaut : affichage « none », rapprochement par ville automatique", async () => {
    const { db, t, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    expect(t.member_locations[0]).toMatchObject({
      display_level: "none",
      nearby_search_enabled: true,
      location_discoverable: true,
      location_consent_at: null,
    });
    expect(profileUpdates[0].city).toBe(GENERIC_CITY_LABEL);
  });

  it("le corps ne peut pas désactiver le rapprochement par ville", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), nearbySearchEnabled: false, locationDiscoverable: false });
    expect(t.member_locations[0]).toMatchObject({ nearby_search_enabled: true, location_discoverable: true });
  });

  it("niveau d'affichage autre que « none » / « city » : ramené à « none », jamais plus exposé", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), displayLevel: "department" });
    expect(t.member_locations[0]).toMatchObject({ display_level: "none" });
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

  it("changement de ville : ancien état archivé, affichage conservé, rapprochement toujours actif", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10), displayLevel: "city" });
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

describe("saveMemberConsent — seul l'affichage est réglable", () => {
  it("refuse sans localisation préalable (rien n'est créé implicitement)", async () => {
    const { db, t } = fakeDb(seed());
    expect(await saveMemberConsent(db, U, { displayLevel: "city" })).toMatchObject({ ok: false, status: 409 });
    expect(t.member_locations).toHaveLength(0);
  });

  it("changer l'affichage ne coupe jamais le rapprochement par ville", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    await saveMemberConsent(db, U, { displayLevel: "city", locationDiscoverable: false, nearbySearchEnabled: false });
    expect(t.member_locations[0]).toMatchObject({ nearby_search_enabled: true, location_discoverable: true, display_level: "city" });
  });

  it("« Afficher ma ville » publie la ville ; « Ne pas afficher » la masque", async () => {
    const { db, profileUpdates } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    expect(await saveMemberConsent(db, U, { displayLevel: "city" })).toMatchObject({ ok: true, publicCity: "Yaoundé" });
    expect(await saveMemberConsent(db, U, { displayLevel: "none" })).toMatchObject({ ok: true, publicCity: GENERIC_CITY_LABEL });
    expect(profileUpdates.at(-1)).toEqual({ city: GENERIC_CITY_LABEL });
  });

  it("ancien niveau (région…) reçu : ramené à « none », ville masquée", async () => {
    const { db, t } = fakeDb(seed());
    await saveMemberLocation(db, U, { country: "Cameroun", placeId: id(10) });
    expect(await saveMemberConsent(db, U, { displayLevel: "region" })).toMatchObject({ ok: true, publicCity: GENERIC_CITY_LABEL });
    expect(t.member_locations[0]).toMatchObject({ display_level: "none" });
  });

  it("refuse un corps vide ou invalide", async () => {
    const { db } = fakeDb(seed());
    expect(await saveMemberConsent(db, U, {})).toMatchObject({ ok: false, status: 400 });
    expect(await saveMemberConsent(db, U, { displayLevel: "adresse" })).toMatchObject({ ok: false, status: 400 });
  });
});
