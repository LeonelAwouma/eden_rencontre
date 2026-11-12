import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const ME = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const A = "44444444-4444-4444-8444-444444444444";

const w = vi.hoisted(() => ({
  member: { id: "22222222-2222-4222-8222-222222222222", email: "m@x.fr" } as { id: string; email: string } | null,
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  rpcError: null as null | { code?: string; message: string },
  rpcData: "active" as unknown,
  assignments: [] as Record<string, unknown>[],
  filters: [] as [string, unknown][],
  tables: [] as string[],
  photos: [{ id: "c1", avatar_url: "/avatars/coach.png" }] as Record<string, unknown>[],
}));

vi.mock("@/lib/api-auth", () => ({ requireApprovedMember: async () => w.member }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => { w.rpc.push({ fn, args }); return { data: w.rpcError ? null : w.rpcData, error: w.rpcError }; },
    from: (table: string) => {
      w.tables.push(table);
      const q: Record<string, unknown> = {
        select: () => q, order: () => q, limit: () => q, in: () => q,
        eq: (c: string, v: unknown) => { w.filters.push([c, v]); return q; },
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === "coach_member_assignments" ? w.assignments : table === "profiles" ? w.photos : [{ user_id: "c1", display_name: "Coach Awa" }], error: null }).then(res),
      };
      return q;
    },
  }),
}));

const post = (url: string, body: unknown) => new NextRequest("http://x" + url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  w.member = { id: ME, email: "m@x.fr" }; w.rpc.length = 0; w.rpcError = null; w.rpcData = "active"; w.assignments = []; w.filters.length = 0; w.tables.length = 0;
});

describe("POST /api/member/coach/consent", () => {
  test("refuse un visiteur non membre (401) : aucun appel SQL", async () => {
    w.member = null;
    const { POST } = await import("./consent/route");
    expect((await POST(post("/api/member/coach/consent", { assignment_id: A, accept: true }))).status).toBe(401);
    expect(w.rpc).toEqual([]);
  });
  test("l'identité vient de la session : un member_id du corps est ignoré", async () => {
    const { POST } = await import("./consent/route");
    await POST(post("/api/member/coach/consent", { assignment_id: A, accept: true, member_id: OTHER, memberId: OTHER }));
    expect(w.rpc).toEqual([{ fn: "coach_respond_assignment", args: { p_member: ME, p_assignment: A, p_accept: true } }]);
  });
  test("l'attribution d'un autre membre : 404", async () => {
    w.rpcError = { message: "assignment_not_found" };
    const { POST } = await import("./consent/route");
    expect((await POST(post("/api/member/coach/consent", { assignment_id: A, accept: true }))).status).toBe(404);
  });
  test("refus du suivi : la fonction reçoit accept=false", async () => {
    w.rpcData = "declined";
    const { POST } = await import("./consent/route");
    const res = await POST(post("/api/member/coach/consent", { assignment_id: A, accept: false }));
    expect((await res.json()).status).toBe("declined");
    expect(w.rpc[0].args.p_accept).toBe(false);
  });
  test("dossier déjà traité : 409", async () => {
    w.rpcError = { message: "invalid_state" };
    const { POST } = await import("./consent/route");
    expect((await POST(post("/api/member/coach/consent", { assignment_id: A, accept: true }))).status).toBe(409);
  });
  test("paramètres invalides : 400", async () => {
    const { POST } = await import("./consent/route");
    expect((await POST(post("/api/member/coach/consent", { assignment_id: "x", accept: true }))).status).toBe(400);
    expect((await POST(post("/api/member/coach/consent", { assignment_id: A, accept: "oui" }))).status).toBe(400);
    expect(w.rpc).toEqual([]);
  });
});

describe("POST /api/member/coach/stop", () => {
  test("retire le consentement : acteur « member » = session, jamais le corps", async () => {
    w.rpcData = "revoked";
    const { POST } = await import("./stop/route");
    const res = await POST(post("/api/member/coach/stop", { assignment_id: A, member_id: OTHER }));
    expect((await res.json()).status).toBe("revoked");
    expect(w.rpc[0]).toMatchObject({ fn: "coach_end_assignment", args: { p_actor_kind: "member", p_actor_id: ME, p_assignment: A } });
  });
  test("autre membre : 404 ; non membre : 401", async () => {
    const { POST } = await import("./stop/route");
    w.rpcError = { message: "assignment_not_found" };
    expect((await POST(post("/api/member/coach/stop", { assignment_id: A }))).status).toBe(404);
    w.member = null;
    expect((await POST(post("/api/member/coach/stop", { assignment_id: A }))).status).toBe(401);
  });
});

describe("GET /api/member/coach", () => {
  test("ne lit que les dossiers du membre connecté, sans exposer l'administrateur", async () => {
    w.assignments = [{ id: A, coach_id: "c1", status: "pending", consent_status: "pending", assigned_at: "2026-11-08T10:00:00Z", consent_at: null, ended_at: null, assigned_by: "admin@x.fr" }];
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://x/api/member/coach?member_id=" + OTHER));
    const body = await res.json();
    expect(w.filters).toContainEqual(["member_id", ME]);
    expect(w.filters).not.toContainEqual(["member_id", OTHER]);
    expect(body.current).toMatchObject({ id: A, status: "pending", coachName: "Coach Awa" });
    expect(JSON.stringify(body)).not.toContain("admin@x.fr");
  });
  test("renvoie la photo du coach (profiles.avatar_url) et la date de proposition", async () => {
    w.assignments = [{ id: A, coach_id: "c1", status: "pending", consent_status: "pending", assigned_at: "2026-11-08T10:00:00Z", consent_at: null, ended_at: null }];
    const { GET } = await import("./route");
    const body = await (await GET(new NextRequest("http://x/api/member/coach"))).json();
    expect(body.current).toMatchObject({ coachAvatarUrl: "/avatars/coach.png", assignedAt: "2026-11-08T10:00:00Z" });
    expect(w.tables).toContain("profiles");
  });
  test("sans photo : coachAvatarUrl vaut null (la carte affiche l'initiale)", async () => {
    w.photos = [{ id: "c1", avatar_url: null }];
    w.assignments = [{ id: A, coach_id: "c1", status: "pending", consent_status: "pending", assigned_at: "2026-11-08T10:00:00Z", consent_at: null, ended_at: null }];
    const { GET } = await import("./route");
    expect((await (await GET(new NextRequest("http://x/api/member/coach"))).json()).current.coachAvatarUrl).toBeNull();
  });
  test("non membre : 401", async () => {
    w.member = null;
    const { GET } = await import("./route");
    expect((await GET(new NextRequest("http://x/api/member/coach"))).status).toBe(401);
  });
});
