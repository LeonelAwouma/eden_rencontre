import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const COACH = "11111111-1111-4111-8111-111111111111";
const MEMBER = "22222222-2222-4222-8222-222222222222";
const A = "44444444-4444-4444-8444-444444444444";

const w = vi.hoisted(() => ({
  admin: true,
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  rpcError: null as null | { code?: string; message: string },
  rpcData: "ended" as unknown,
  own: { data: { id: "44444444-4444-4444-8444-444444444444" }, error: null } as { data: unknown; error: unknown },
  audit: [] as unknown[][],
  history: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr" }; },
  logAdminAction: async (...a: unknown[]) => { w.audit.push(a); },
}));
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => { w.rpc.push({ fn, args }); return { data: w.rpcError ? null : w.rpcData, error: w.rpcError }; },
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, order: () => q, limit: () => q, in: () => q,
        maybeSingle: async () => w.own,
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === "profiles" ? [{ id: MEMBER, pseudo: "Awa" }] : w.history, error: null }).then(res),
      };
      return q;
    },
  }),
}));

const ctx = { params: Promise.resolve({ id: COACH }) };
const call = (method: string, body?: unknown) => new NextRequest("http://x/api/admin/coaches/" + COACH + "/assignments", { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const actions = () => w.audit.map((a) => a[2]);

beforeEach(() => { w.admin = true; w.rpc.length = 0; w.rpcError = null; w.rpcData = "ended"; w.own = { data: { id: A }, error: null }; w.audit.length = 0; w.history = []; });

describe("accès réservé à l'administration", () => {
  test("un non-administrateur (coach, membre, anonyme) reçoit 401 sur chaque méthode, sans appel SQL", async () => {
    w.admin = false;
    const r = await import("./route");
    expect((await r.GET(call("GET"), ctx)).status).toBe(401);
    expect((await r.POST(call("POST", { member_id: MEMBER }), ctx)).status).toBe(401);
    expect((await r.PATCH(call("PATCH", { assignment_id: A }), ctx)).status).toBe(401);
    expect(w.rpc).toEqual([]);
  });
});

describe("attribution", () => {
  test("crée un dossier EN ATTENTE via la fonction transactionnelle et journalise", async () => {
    w.rpcData = A;
    const { POST } = await import("./route");
    const res = await POST(call("POST", { member_id: MEMBER }), ctx);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ status: "pending", consent_status: "pending" });
    expect(w.rpc).toEqual([{ fn: "coach_assign_member", args: { p_coach: COACH, p_member: MEMBER, p_admin: "admin@x.fr" } }]);
    expect(actions()).toEqual(["coach_assignment_proposed"]);
  });
  test("membre déjà accompagné (course) : 409", async () => {
    w.rpcError = { code: "23505", message: "duplicate key" };
    const { POST } = await import("./route");
    expect((await POST(call("POST", { member_id: MEMBER }), ctx)).status).toBe(409);
    expect(actions()).toEqual([]);
  });
  test("coach inactif ou membre inéligible : 409 ; auto-attribution : 400", async () => {
    const { POST } = await import("./route");
    w.rpcError = { message: "coach_not_active" };
    expect((await POST(call("POST", { member_id: MEMBER }), ctx)).status).toBe(409);
    w.rpcError = { message: "member_not_eligible" };
    expect((await POST(call("POST", { member_id: MEMBER }), ctx)).status).toBe(409);
    w.rpcError = { message: "self_assignment" };
    expect((await POST(call("POST", { member_id: COACH }), ctx)).status).toBe(400);
  });
  test("paramètres invalides : 400, aucun appel SQL", async () => {
    const { POST } = await import("./route");
    expect((await POST(call("POST", { member_id: "x" }), ctx)).status).toBe(400);
    expect(w.rpc).toEqual([]);
  });
});

describe("fin d'attribution", () => {
  test("terminée par l'administration (fin ordinaire), journalisée", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(call("PATCH", { assignment_id: A, reason: "fin de parcours" }), ctx);
    expect(res.status).toBe(200);
    expect(w.rpc[0]).toMatchObject({ fn: "coach_end_assignment", args: { p_actor_kind: "admin", p_actor_id: "admin@x.fr", p_assignment: A, p_reason: "fin de parcours" } });
    expect(actions()).toEqual(["coach_assignment_ended"]);
  });
  test("anti-IDOR : une attribution qui n'appartient pas à ce coach est introuvable (404), rien n'est terminé", async () => {
    w.own = { data: null, error: null };
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { assignment_id: A }), ctx)).status).toBe(404);
    expect(w.rpc).toEqual([]);
  });
});

describe("historique", () => {
  test("ne recopie pas les profils : identifiant et pseudo seulement", async () => {
    w.history = [{ id: A, member_id: MEMBER, status: "active", consent_status: "accepted", assigned_by: "admin@x.fr", assigned_at: "2026-11-08", consent_at: "2026-11-08", ended_at: null, end_reason: null }];
    const { GET } = await import("./route");
    const body = await (await GET(call("GET"), ctx)).json();
    expect(body.active_count).toBe(1);
    expect(body.assignments[0]).toMatchObject({ member_id: MEMBER, member_pseudo: "Awa" });
    expect(Object.keys(body.assignments[0])).not.toContain("email");
  });
});
