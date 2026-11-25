import { describe, expect, it } from "vitest";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { getCameroonMap, getInternationalMap, splitCountries, MISSING_MIGRATION } from "./admin-map-server";

const R1 = "11111111-1111-4111-8111-111111111111";
const R2 = "22222222-2222-4222-8222-222222222222";
const R3 = "33333333-3333-4333-8333-333333333333";

type Rpc = { data: unknown; error: { code?: string; message?: string } | null };
function fakeDb(responses: Record<string, Rpc>) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return Promise.resolve(responses[fn] ?? { data: null, error: { message: "inconnue" } });
    },
  };
  return { db: db as never, calls };
}

const summary = { total: 40, noLocation: 6, cameroon: 22, cameroonWithRegion: 19, cameroonWithoutRegion: 3, outsideCameroon: 12 };
const countries = [
  { country_code: "FR", member_count: 7, with_city: 5 },
  { country_code: "BE", member_count: 1, with_city: 1 },
  { country_code: "US", member_count: 2, with_city: 0 },
  { country_code: "ZZ", member_count: 2, with_city: 0 },
];

function ok(extra: Record<string, Rpc> = {}) {
  return fakeDb({
    geo_admin_member_summary: { data: summary, error: null },
    geo_admin_country_counts: { data: countries, error: null },
    geo_admin_member_counts: {
      data: [
        { unit_id: R1, member_count: 1, kind: "unit" },
        { unit_id: R2, member_count: 0, kind: "unit" },
        { unit_id: R3, member_count: 18, kind: "unit" },
        { unit_id: null, member_count: 3, kind: "unattached" },
        { unit_id: null, member_count: 0, kind: "inconsistent" },
      ],
      error: null,
    },
    ...extra,
  });
}

const FORBIDDEN = ["user_id", "email", "name_full", "phone", "free_text_city", "lat", "lon", "latitude", "longitude", "pseudo"];
function keysDeep(v: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, acc));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { acc.add(k); keysDeep(x, acc); }
  return acc;
}

describe("Cameroun — effectifs exacts", () => {
  it("transmet les effectifs tels quels (1 reste 1, 0 reste 0) et sépare les non-rattachés", async () => {
    const { db } = ok();
    const r = await getCameroonMap(db, { level: 1, parent: null, scope: "approved" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.counts).toEqual([
      { unitId: R1, count: 1 }, { unitId: R2, count: 0 }, { unitId: R3, count: 18 },
    ]);
    expect(r.data.counts.every((c) => typeof c.count === "number")).toBe(true);
    expect(r.data.unattached).toBe(3);
    expect(r.data.inconsistent).toBe(0);
    // zones + non rattachés = membres localisés au Cameroun
    expect(r.data.counts.reduce((s, c) => s + c.count, 0) + r.data.unattached + r.data.inconsistent).toBe(summary.cameroon);
  });

  it("passe le niveau, le parent, les statuts et exclut le compte système", async () => {
    const { db, calls } = ok();
    await getCameroonMap(db, { level: 2, parent: R1, scope: "all" });
    const c = calls.find((x) => x.fn === "geo_admin_member_counts")!;
    expect(c.args).toMatchObject({ p_level: 2, p_parent: R1, p_statuses: ["approved", "pending", "suspended"], p_exclude_email: ADMIN_SYSTEM_EMAIL });
    for (const call of calls) expect(call.args.p_statuses).not.toContain("rejected");
    expect(calls.some((x) => x.fn === "geo_zone_counts")).toBe(false);
  });

  it("filtre approved par défaut", async () => {
    const { db, calls } = ok();
    await getCameroonMap(db, { level: 1, parent: null, scope: "approved" });
    for (const call of calls) expect(call.args.p_statuses).toEqual(["approved"]);
  });

  it("migration absente → 503 explicite", async () => {
    const { db } = ok({ geo_admin_member_counts: { data: null, error: { code: "PGRST202", message: "Could not find the function" } } });
    expect(await getCameroonMap(db, { level: 1, parent: null, scope: "approved" })).toEqual({ ok: false, status: 503, error: MISSING_MIGRATION });
  });

  it("aucune donnée personnelle dans la réponse", async () => {
    const { db } = ok();
    const r = await getCameroonMap(db, { level: 1, parent: null, scope: "approved" });
    const keys = keysDeep(r);
    for (const k of FORBIDDEN) expect(keys.has(k)).toBe(false);
  });
});

describe("International — effectifs par pays", () => {
  it("pays à 1 membre présent ; tri décroissant ; codes non reconnus à part", async () => {
    const { db } = ok();
    const r = await getInternationalMap(db, "approved");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.countries.map((c) => [c.code, c.count])).toEqual([["FR", 7], ["US", 2], ["BE", 1]]);
    expect(r.data.undetermined).toEqual([{ code: "ZZ", count: 2 }]);
    expect(r.data.indicators).toMatchObject({ abroad: 10, countriesRepresented: 3, abroadWithoutCity: 4 });
    expect(r.data.indicators.top).toMatchObject({ code: "FR", count: 7 });
  });

  it("catégories exclusives : total = Cameroun + étranger + indéterminé + sans localisation", async () => {
    const { db } = ok();
    const r = await getInternationalMap(db, "approved");
    if (!r.ok) throw new Error("ko");
    const s = r.data.summary;
    expect(s.abroad).toBe(r.data.countries.reduce((a, c) => a + c.count, 0));
    expect(s.cameroon + s.abroad + s.undetermined + s.noLocation).toBe(s.total);
  });

  it("le premier pays est donné quel que soit son effectif", async () => {
    const { db } = ok({ geo_admin_country_counts: { data: [{ country_code: "GA", member_count: 1, with_city: 1 }], error: null } });
    const r = await getInternationalMap(db, "approved");
    if (!r.ok) throw new Error("ko");
    expect(r.data.indicators.top).toMatchObject({ code: "GA", count: 1 });
  });

  it("aucune donnée personnelle dans la réponse", async () => {
    const { db } = ok();
    const keys = keysDeep(await getInternationalMap(db, "all"));
    for (const k of FORBIDDEN) expect(keys.has(k)).toBe(false);
  });
});

describe("splitCountries", () => {
  it("n'attribue jamais un code inconnu ou CM à un pays", () => {
    const r = splitCountries([
      { country_code: "XX", member_count: 1, with_city: 0 },
      { country_code: "CM", member_count: 4, with_city: 0 },
      { country_code: "de", member_count: 2, with_city: 3 },
    ]);
    expect(r.countries).toEqual([{ code: "DE", name: expect.any(String), count: 2, withCity: 2 }]);
    expect(r.undetermined.map((u) => u.code).sort()).toEqual(["CM", "XX"]);
  });
});
