import { describe, expect, it, vi } from "vitest";
import { runZoneCounts } from "./zone-counts-server";

const U = "11111111-1111-4111-8111-111111111111";
const V = "22222222-2222-4222-8222-222222222222";

function fakeDb(opts: {
  me?: Record<string, unknown> | null;
  rpc?: Record<string, { data?: unknown; error?: unknown }>;
}) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    calls.push({ fn, args });
    const r = opts.rpc?.[fn];
    if (r) return { data: r.data ?? null, error: r.error ?? null };
    return { data: true, error: null };
  });
  const from = () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.me ?? null, error: null }) }) }),
  });
  return { db: { rpc, from } as never, calls };
}

const me = { nearby_search_enabled: true, region_id: "r1", department_id: null, arrondissement_id: null };

describe("runZoneCounts", () => {
  it("refuse des paramètres invalides sans rien appeler", async () => {
    const { db, calls } = fakeDb({ me });
    expect(await runZoneCounts(db, V, { level: "2", parent: null })).toMatchObject({ ok: false, status: 400 });
    expect(calls).toHaveLength(0);
  });

  it("applique le seuil de 5 avant de répondre", async () => {
    const { db } = fakeDb({
      me,
      rpc: { geo_zone_counts: { data: [{ unit_id: "r1", member_count: 3 }, { unit_id: "r2", member_count: 3 }, { unit_id: "r3", member_count: 40 }] } },
    });
    const r = await runZoneCounts(db, V, { level: "1", parent: null });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.counts.find((c) => c.unitId === "r3")!.count).toBe(40);
      expect(r.counts.filter((c) => c.count !== null && c.count < 5)).toHaveLength(0);
      expect(JSON.stringify(r)).not.toMatch(/"count":3/);
    }
  });

  it("sans activation de la recherche par localisation : aucun compte, aucun appel de comptage", async () => {
    const { db, calls } = fakeDb({ me: { ...me, nearby_search_enabled: false } });
    const r = await runZoneCounts(db, V, { level: "1", parent: null });
    expect(r).toMatchObject({ ok: true, counts: [], reason: "viewer_not_enabled" });
    expect(calls.some((c) => c.fn === "geo_zone_counts")).toBe(false);
  });

  it("sans localisation : aucun compte", async () => {
    const { db } = fakeDb({ me: null });
    expect(await runZoneCounts(db, V, { level: "1", parent: null })).toMatchObject({ ok: true, counts: [], reason: "viewer_no_location" });
  });

  it("limitation de débit : 429, et rien n'est lu après", async () => {
    const { db, calls } = fakeDb({ me, rpc: { geo_rate_limit_hit: { data: false } } });
    expect(await runZoneCounts(db, V, { level: "1", parent: null })).toMatchObject({ ok: false, status: 429 });
    expect(calls.map((c) => c.fn)).toEqual(["geo_rate_limit_hit"]);
  });

  it("plafond quotidien de zones explorées : 429", async () => {
    const { db } = fakeDb({ me, rpc: { geo_scope_hit: { data: false } } });
    expect(await runZoneCounts(db, V, { level: "2", parent: U })).toMatchObject({ ok: false, status: 429 });
  });

  it("l'identité transmise à la base est celle du jeton ; la réponse ne contient que des ids de zones", async () => {
    const { db, calls } = fakeDb({ me, rpc: { geo_zone_counts: { data: [{ unit_id: "r1", member_count: 8 }] } } });
    const r = await runZoneCounts(db, V, { level: "1", parent: null });
    expect(calls.find((c) => c.fn === "geo_zone_counts")!.args.p_viewer).toBe(V);
    expect(JSON.stringify(r)).not.toMatch(/latitude|longitude|coordinates|email/i);
  });

  it("erreur de base : 503, jamais de détail", async () => {
    const { db } = fakeDb({ me, rpc: { geo_zone_counts: { error: { message: "secret" } } } });
    const r = await runZoneCounts(db, V, { level: "1", parent: null });
    expect(r).toMatchObject({ ok: false, status: 503 });
    expect(JSON.stringify(r)).not.toContain("secret");
  });
});
