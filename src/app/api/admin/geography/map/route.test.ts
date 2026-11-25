import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const w = vi.hoisted(() => ({ admin: true, rpcError: null as null | { code: string; message: string } }));

vi.mock("@/lib/admin-auth", () => ({
  // Visiteur non connecté ET membre connecté non admin : requireAdmin lève dans les deux cas.
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr", role: "admin" }; },
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    rpc: (fn: string) => {
      if (w.rpcError) return Promise.resolve({ data: null, error: w.rpcError });
      if (fn === "geo_admin_member_counts") return Promise.resolve({ data: [{ unit_id: "11111111-1111-4111-8111-111111111111", member_count: 1, kind: "unit" }, { unit_id: null, member_count: 0, kind: "unattached" }, { unit_id: null, member_count: 0, kind: "inconsistent" }], error: null });
      if (fn === "geo_admin_member_summary") return Promise.resolve({ data: { total: 1, cameroon: 1, cameroonWithRegion: 1, cameroonWithoutRegion: 0, noLocation: 0 }, error: null });
      if (fn === "geo_admin_country_counts") return Promise.resolve({ data: [{ country_code: "FR", member_count: 1, with_city: 0 }], error: null });
      return Promise.resolve({ data: null, error: { message: "unknown" } });
    },
  }),
}));

const mapGet = (qs: string) => import("./route").then((m) => m.GET(new NextRequest(`http://x/api/admin/geography/map${qs}`)));
const intlGet = (qs: string) => import("../international/route").then((m) => m.GET(new NextRequest(`http://x/api/admin/geography/international${qs}`)));

beforeEach(() => { w.admin = true; w.rpcError = null; });

describe("accès réservé à l'administration", () => {
  test.each([["map", () => mapGet("?level=1")], ["international", () => intlGet("")]])("%s : 401 sans session admin", async (_n, call) => {
    w.admin = false;
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(await res.json())).not.toMatch(/count/);
  });
});

describe("GET /api/admin/geography/map", () => {
  test("effectifs exacts (1 reste 1), no-store", async () => {
    const res = await mapGet("?level=1&scope=approved");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const j = await res.json();
    expect(j.counts).toEqual([{ unitId: "11111111-1111-4111-8111-111111111111", count: 1 }]);
  });
  test.each(["?level=2", "?level=1&parent=11111111-1111-4111-8111-111111111111", "?level=9", "?level=1&scope=rejected"])("400 pour %s", async (qs) => {
    expect((await mapGet(qs)).status).toBe(400);
  });
  test("503 explicite si la migration manque", async () => {
    w.rpcError = { code: "PGRST202", message: "Could not find the function" };
    const res = await mapGet("?level=1");
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/20261125_geo_admin_member_map\.sql/);
  });
});

describe("GET /api/admin/geography/international", () => {
  test("pays à 1 membre présent, no-store", async () => {
    const res = await intlGet("?scope=all");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const j = await res.json();
    expect(j.countries).toEqual([expect.objectContaining({ code: "FR", count: 1 })]);
  });
  test("400 pour un filtre inconnu", async () => {
    expect((await intlGet("?scope=tout")).status).toBe(400);
  });
});
