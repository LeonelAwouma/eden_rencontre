import { describe, expect, it } from "vitest";
import { runGeoDiscovery, PAGE_SIZE } from "./discovery-server";
import type { RawCandidate } from "./discovery";
import { MATCHING_REQUIRED_LESSONS } from "@/lib/formation/structure";

const PILLAR_ONE = [...MATCHING_REQUIRED_LESSONS];

interface FakeOpts {
  me?: Record<string, unknown> | null;
  formation?: string[] | null;
  rows?: RawCandidate[];
  rateOk?: boolean;
  scopeOk?: boolean;
  rpcError?: string;
}

function fakeDb(o: FakeOpts = {}) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (o.rpcError === fn) return { data: null, error: { message: "boom" } };
      if (fn === "geo_rate_limit_hit") return { data: o.rateOk ?? true, error: null };
      if (fn === "geo_scope_hit") return { data: o.scopeOk ?? true, error: null };
      if (fn === "geo_candidates_in_scope") {
        const off = Number(args.p_offset);
        return { data: (o.rows ?? []).slice(off, off + Number(args.p_limit)), error: null };
      }
      return { data: null, error: { message: "inconnue" } };
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === "profiles"
              ? { data: { formation_completed: o.formation === undefined ? PILLAR_ONE : o.formation }, error: null }
              : { data: o.me === undefined ? defaultMe : o.me, error: null },
        }),
      }),
    }),
  };
  return { db: db as never, calls };
}
const defaultMe = {
  nearby_search_enabled: true, country_code: "CM", region_id: "r", department_id: "d", arrondissement_id: "a", place_id: "p",
};
const row = (i: number, over: Partial<RawCandidate> = {}): RawCandidate => ({
  user_id: `u${i}`, category: "in_scope", display_level: "none", country_code: "CM", same_place: false,
  distance_m: 12_345, region_name: "Centre", department_name: "Mfoundi", arrondissement_name: "Y1", city_name: "Yaoundé", ...over,
});
const base = { scope: "region", includeUnlocated: false, offset: 0 };
const VIEWER = "viewer-from-token";

describe("runGeoDiscovery", () => {
  it("refuse une portée invalide sans toucher à la base", async () => {
    const { db, calls } = fakeDb();
    expect(await runGeoDiscovery(db, VIEWER, { ...base, scope: "radius5" })).toMatchObject({ ok: false, status: 400 });
    expect(calls).toHaveLength(0);
  });

  it("l'identité utilisée est celle passée par la route (jeton), jamais un paramètre libre", async () => {
    const { db, calls } = fakeDb({ rows: [row(1)] });
    await runGeoDiscovery(db, VIEWER, { ...base, ...({ viewer: "pirate", userId: "pirate" } as object) });
    const cand = calls.find((c) => c.fn === "geo_candidates_in_scope")!;
    expect(cand.args.p_viewer).toBe(VIEWER);
    for (const c of calls) expect(JSON.stringify(c.args)).not.toContain("pirate");
  });

  it("limitation de débit dépassée : 429, aucun candidat calculé", async () => {
    const { db, calls } = fakeDb({ rateOk: false });
    expect(await runGeoDiscovery(db, VIEWER, base)).toMatchObject({ ok: false, status: 429 });
    expect(calls.some((c) => c.fn === "geo_candidates_in_scope")).toBe(false);
  });

  it("plafond quotidien de portées distinctes : 429", async () => {
    const { db } = fakeDb({ scopeOk: false });
    expect(await runGeoDiscovery(db, VIEWER, base)).toMatchObject({ ok: false, status: 429 });
  });

  it("fonctions absentes (migration non appliquée) : 503, pas de plantage", async () => {
    const { db } = fakeDb({ rpcError: "geo_rate_limit_hit" });
    expect(await runGeoDiscovery(db, VIEWER, base)).toMatchObject({ ok: false, status: 503 });
  });

  it("demandeur sans localisation, ou sans consentement : résultat vide et motif explicite", async () => {
    const none = fakeDb({ me: null, rows: [row(1)] });
    expect(await runGeoDiscovery(none.db, VIEWER, base)).toMatchObject({ ok: true, reason: "viewer_no_location" });
    expect(none.calls.some((c) => c.fn === "geo_candidates_in_scope")).toBe(false);

    const off = fakeDb({ me: { ...defaultMe, nearby_search_enabled: false }, rows: [row(1)] });
    const r = await runGeoDiscovery(off.db, VIEWER, base);
    expect(r).toMatchObject({ ok: true, reason: "viewer_not_enabled" });
    expect(r.ok && r.page.candidates).toEqual([]);
  });

  it("pilier 1 non terminé : résultat vide, aucun candidat calculé (même verrou que le Discover)", async () => {
    for (const formation of [null, [], PILLAR_ONE.slice(0, -1)]) {
      const { db, calls } = fakeDb({ formation, rows: [row(1)] });
      const r = await runGeoDiscovery(db, VIEWER, base);
      expect(r).toMatchObject({ ok: true, reason: "viewer_formation_locked" });
      expect(r.ok && r.page.candidates).toEqual([]);
      expect(calls.some((c) => c.fn === "geo_candidates_in_scope")).toBe(false);
    }
  });

  it("rayon sans localité du demandeur : motif « zone manquante »", async () => {
    const { db } = fakeDb({ me: { ...defaultMe, place_id: null }, rows: [row(1)] });
    expect(await runGeoDiscovery(db, VIEWER, { ...base, scope: "radius50" })).toMatchObject({ ok: true, reason: "viewer_missing_zone" });
  });

  it("expurge : « none » ne laisse fuiter ni ville, ni zone, ni distance", async () => {
    const { db } = fakeDb({ rows: [row(1, { display_level: "none" })] });
    const r = await runGeoDiscovery(db, VIEWER, base);
    expect(r.ok && r.page.candidates[0]).toEqual({ userId: "u1", category: "in_scope", proximityBand: null, locationLabel: null });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/Yaoundé|Mfoundi|Centre|12345|distance/);
  });

  it("pagination : plus de 100 résultats, curseur cohérent, aucun doublon ni perte", async () => {
    const rows = Array.from({ length: 230 }, (_, i) => row(i));
    const { db } = fakeDb({ rows });
    const seen: string[] = [];
    let offset: number | null = 0;
    let pages = 0;
    while (offset !== null) {
      const r = await runGeoDiscovery(db, VIEWER, { ...base, offset });
      if (!r.ok) throw new Error("échec");
      seen.push(...r.page.candidates.map((c) => c.userId));
      offset = r.page.nextOffset;
      pages++;
    }
    expect(pages).toBe(3);
    expect(seen).toHaveLength(230);
    expect(new Set(seen).size).toBe(230);
    expect(PAGE_SIZE).toBe(100);
  });

  it("transmet includeUnlocated et exclut le compte technique de la messagerie", async () => {
    const { db, calls } = fakeDb({ rows: [] });
    await runGeoDiscovery(db, VIEWER, { ...base, includeUnlocated: true });
    const a = calls.find((c) => c.fn === "geo_candidates_in_scope")!.args;
    expect(a.p_include_unlocated).toBe(true);
    expect(a.p_exclude_email).toBe("admin-system@eden.local");
  });
});
