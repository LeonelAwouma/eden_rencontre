import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const w = vi.hoisted(() => ({ admin: true, tables: {} as Record<string, Row[]> }));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr", role: "admin" }; },
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = [];
      const q: Record<string, unknown> = {};
      Object.assign(q, {
        select: () => q, order: () => q, limit: () => q, or: () => q,
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
        neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return q; },
        in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q; },
        not: (c: string, _op: string, list: string) => { const set = list.replace(/[()]/g, "").split(","); filters.push((r) => !set.includes(String(r[c]))); return q; },
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: (w.tables[table] || []).filter((r) => filters.every((f) => f(r))), error: null }).then(res),
      });
      return q;
    },
  }),
}));

const C_A = "a0000000-0000-4000-8000-00000000000a";
const C_B = "b0000000-0000-4000-8000-00000000000b";
const get = (qs = "") => import("./route").then((m) => m.GET(new NextRequest(`http://x/api/admin/coach-assignments${qs}`)));

beforeEach(() => {
  w.admin = true;
  w.tables = {
    coach_accounts: [
      { user_id: C_A, display_name: "Coach A", email: "a@x.fr", active: true },
      { user_id: C_B, display_name: "Coach B", email: "b@x.fr", active: false },
    ],
    profiles: [
      { id: C_A, account_type: "coach", avatar_url: "https://x/a.png", status: "approved" },
      { id: C_B, account_type: "coach", avatar_url: null, status: "suspended" },
      { id: "m1", account_type: "member", name: "Awa", pseudo: "awa", email: "awa@x.fr", status: "approved" },
      { id: "m2", account_type: "member", name: "Ben", pseudo: "ben", email: "ben@x.fr", status: "approved" },
      { id: "m3", account_type: "member", name: "Cléo", pseudo: "cleo", email: "cleo@x.fr", status: "approved" },
    ],
    coach_member_assignments: [
      { id: "s1", coach_id: C_A, member_id: "m1", status: "active", assigned_at: "2026-11-01", end_reason: null },
      { id: "s2", coach_id: C_B, member_id: "m2", status: "ended", assigned_at: "2026-10-01", end_reason: "coach_deactivated" },
    ],
  };
});

describe("GET /api/admin/coach-assignments", () => {
  test("réservé à l'administrateur : 401 sinon", async () => {
    w.admin = false;
    const res = await get();
    expect(res.status).toBe(401);
    expect(await res.text()).not.toContain("awa@x.fr");
  });
  test("tableau : coach attribué avec photo, situation, jamais de compte coach parmi les membres", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = await res.json() as { items: { id: string; situation: string; coach: { name: string; avatar_url: string | null } | null }[]; to_reassign_count: number };
    const by = (id: string) => body.items.find((i) => i.id === id)!;
    expect(by("m1")).toMatchObject({ situation: "active", coach: { name: "Coach A", avatar_url: "https://x/a.png" } });
    expect(by("m2")).toMatchObject({ situation: "to_reassign", coach: { name: "Coach B" } });
    expect(by("m3").situation).toBe("none");
    expect(body.items.some((i) => i.id === C_A || i.id === C_B)).toBe(false);
    expect(body.to_reassign_count).toBe(1);
  });
  test("filtres : à réaffecter, par coach", async () => {
    const a = await (await get("?situation=to_reassign")).json() as { items: { id: string }[] };
    expect(a.items.map((i) => i.id)).toEqual(["m2"]);
    const b = await (await get(`?coach=${C_A}`)).json() as { items: { id: string }[] };
    expect(b.items.map((i) => i.id)).toEqual(["m1"]);
  });
  test("la liste de coachs porte l'état et les compteurs (les désactivés restent visibles)", async () => {
    const body = await (await get()).json() as { coaches: { user_id: string; active: boolean; active_count: number }[] };
    expect(body.coaches.find((c) => c.user_id === C_A)).toMatchObject({ active: true, active_count: 1 });
    expect(body.coaches.find((c) => c.user_id === C_B)?.active).toBe(false);
  });
});
