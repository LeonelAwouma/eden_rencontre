import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const w = vi.hoisted(() => ({ admin: true, eq: [] as [string, unknown][] }));

vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return {}; } }));
vi.mock("@/lib/admin-system-shared", () => ({ ADMIN_SYSTEM_EMAIL: "system@eden.local" }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    const q: Record<string, unknown> = {
      select: () => q, or: () => q, neq: () => q, order: () => q, limit: () => q,
      eq: (c: string, v: unknown) => { w.eq.push([c, v]); return q; },
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
    };
    return { from: () => q };
  },
}));

const get = (qs: string) => new NextRequest("http://x/api/admin/users/search?" + qs);
beforeEach(() => { w.admin = true; w.eq.length = 0; });

describe("GET /api/admin/users/search", () => {
  test("kind=member : le filtre account_type = 'member' est appliqué CÔTÉ SERVEUR (les coachs sont exclus)", async () => {
    const { GET } = await import("./route");
    await GET(get("q=awa&kind=member"));
    expect(w.eq).toContainEqual(["account_type", "member"]);
  });
  test("sans kind : comportement inchangé (pas de filtre account_type)", async () => {
    const { GET } = await import("./route");
    await GET(get("q=awa"));
    expect(w.eq.map(([c]) => c)).not.toContain("account_type");
  });
  test("une valeur de kind inconnue n'ouvre rien de plus et n'active pas le filtre", async () => {
    const { GET } = await import("./route");
    await GET(get("q=awa&kind=coach"));
    expect(w.eq.map(([c]) => c)).not.toContain("account_type");
  });
  test("non-administrateur : 401", async () => {
    w.admin = false;
    const { GET } = await import("./route");
    expect((await GET(get("q=awa&kind=member"))).status).toBe(401);
  });
});
