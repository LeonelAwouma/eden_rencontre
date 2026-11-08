import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const ID = "11111111-1111-4111-8111-111111111111";
const w = vi.hoisted(() => ({
  admin: true,
  profile: { data: { account_type: "coach" }, error: null } as { data: unknown; error: unknown },
  account: { data: { user_id: "x" }, error: null } as { data: unknown; error: unknown },
  writes: [] as string[],
  audit: [] as unknown[],
  deleted: [] as string[],
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr" }; },
  logAdminAction: async (...a: unknown[]) => { w.audit.push(a); },
}));
vi.mock("@/lib/email", () => ({
  sendAccountSuspendedEmail: async () => true, sendAccountApprovedEmail: async () => true,
  sendAccountRejectedEmail: async () => true, getLastEmailError: () => null,
}));
vi.mock("@/lib/referrals", () => ({ reevaluateReferral: async () => {} }));
vi.mock("@/lib/registration-media", () => ({
  resolveMediaUrl: async () => null, resolveMediaUrls: async () => [], isMediaPath: () => false, deleteMedia: async () => {},
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: { admin: { getUserById: async () => ({ data: { user: { id: ID, email: "c@x.fr" } } }), deleteUser: async (id: string) => { w.deleted.push(id); return { error: null }; } } },
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q,
        update: () => { w.writes.push(`${table}:update`); return q; },
        delete: () => { w.writes.push(`${table}:delete`); return q; },
        maybeSingle: async () => (table === "coach_accounts" ? w.account : w.profile),
        single: async () => ({ data: null, error: { message: "n/a" } }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
      };
      return q;
    },
  }),
}));

const params = { params: Promise.resolve({ id: ID }) };
const req = (method = "POST") => new NextRequest("http://x/api/admin/users/" + ID, { method, body: method === "POST" ? "{}" : undefined, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  w.admin = true;
  w.profile = { data: { account_type: "coach" }, error: null };
  w.account = { data: { user_id: "x" }, error: null };
  w.writes.length = 0; w.audit.length = 0; w.deleted.length = 0;
});

describe("routes génériques : un coach est refusé (409)", () => {
  test("suspend", async () => {
    const { POST } = await import("./suspend/route");
    const res = await POST(req(), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("coach_account");
    expect(w.writes).toEqual([]); expect(w.audit).toEqual([]);
  });
  test("approve", async () => {
    const { POST } = await import("./approve/route");
    expect((await POST(req(), params)).status).toBe(409);
    expect(w.writes).toEqual([]);
  });
  test("reject", async () => {
    const { POST } = await import("./reject/route");
    expect((await POST(req(), params)).status).toBe(409);
    expect(w.writes).toEqual([]);
  });
  test("DELETE : aucune suppression du compte", async () => {
    const { DELETE } = await import("./route");
    expect((await DELETE(req("DELETE"), params)).status).toBe(409);
    expect(w.deleted).toEqual([]); expect(w.writes).toEqual([]);
  });
  test("coach détecté même si le profil se déclare « member » (ligne coach_accounts parasite)", async () => {
    w.profile = { data: { account_type: "member" }, error: null };
    const { POST } = await import("./suspend/route");
    expect((await POST(req(), params)).status).toBe(409);
  });
  test("lecture impossible : refus (500), jamais d'écriture", async () => {
    w.account = { data: null, error: { code: "XX000" } };
    const { POST } = await import("./suspend/route");
    expect((await POST(req(), params)).status).toBe(500);
    expect(w.writes).toEqual([]);
  });
  test("non-administrateur : 401 (la garde coach ne dispense pas de l'authentification)", async () => {
    w.admin = false;
    const { POST } = await import("./suspend/route");
    expect((await POST(req(), params)).status).toBe(401);
  });
});
