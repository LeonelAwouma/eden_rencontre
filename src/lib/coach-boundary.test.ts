import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Frontière coach / membre sur les routes RÉELLES : un coach approuvé et actif ne doit pouvoir ni
 * envoyer une demande d'alliance, ni écrire un message privé, ni utiliser le parrainage ou l'activité
 * membre ; les fonctions partagées (leçons, annonces) lui restent ouvertes.
 */

const world = vi.hoisted(() => ({
  kind: "coach" as "coach" | "member",
  writes: 0,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    Object.assign(chain, {
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u1@x.fr" } } }) },
      from: (table: string) => {
        const q: Record<string, unknown> = {};
        Object.assign(q, {
          select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
          insert: () => { world.writes++; return q; },
          upsert: () => { world.writes++; return q; },
          update: () => { world.writes++; return q; },
          maybeSingle: async () => ({
            data: table === "profiles"
              ? { status: "approved", account_type: world.kind }
              : table === "coach_accounts" ? { active: true } : null,
            error: null,
          }),
          single: async () => ({ data: null, error: null }),
          then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        });
        return q;
      },
      rpc: async () => ({ data: null, error: null }),
    });
    void self;
    return chain;
  },
}));
vi.mock("@/lib/subscription/effective", () => ({ hasFeatureAccess: async () => false }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));

const post = (path: string, body: unknown = {}) =>
  new NextRequest(`http://x${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { authorization: "Bearer jeton", "Content-Type": "application/json" },
  });
const get = (path: string) => new NextRequest(`http://x${path}`, { headers: { authorization: "Bearer jeton" } });

beforeEach(() => { world.kind = "coach"; world.writes = 0; });

describe("un coach est refusé sur les fonctions matrimoniales", () => {
  test("demande d'alliance : 401, aucune écriture", async () => {
    const { POST } = await import("@/app/api/matching/request/route");
    const res = await POST(post("/api/matching/request", { addresseeId: "00000000-0000-4000-8000-000000000000" }));
    expect(res.status).toBe(401);
    expect(world.writes).toBe(0);
  });

  test("message privé : 401, aucune écriture", async () => {
    const { POST } = await import("@/app/api/chat/send/route");
    const res = await POST(post("/api/chat/send", { conversationId: "00000000-0000-4000-8000-000000000000", content: "bonjour" }));
    expect(res.status).toBe(401);
    expect(world.writes).toBe(0);
  });

  test("parrainage et activité membre : 401", async () => {
    const dashboard = await import("@/app/api/referrals/dashboard/route");
    expect((await dashboard.GET(get("/api/referrals/dashboard"))).status).toBe(401);
    const code = await import("@/app/api/referrals/code/route");
    expect((await code.GET(get("/api/referrals/code"))).status).toBe(401);
    const activity = await import("@/app/api/member/activity/route");
    expect((await activity.POST(post("/api/member/activity"))).status).toBe(401);
  });

  test("progression de formation (déverrouille le matching) : 401 pour un coach", async () => {
    const { POST } = await import("@/app/api/formation/progress/route");
    expect((await POST(post("/api/formation/progress", { completed: true }))).status).toBe(401);
    expect(world.writes).toBe(0);
  });
});

describe("le membre garde l'accès (non-régression)", () => {
  test("la garde laisse passer un membre : la demande d'alliance échoue plus loin (400), pas en 401", async () => {
    world.kind = "member";
    const { POST } = await import("@/app/api/matching/request/route");
    const res = await POST(post("/api/matching/request", { addresseeId: "pas-un-uuid" }));
    expect(res.status).not.toBe(401);
  });
});

describe("les fonctions partagées restent ouvertes au coach", () => {
  test("annonces membre : 200 pour un coach", async () => {
    const { GET } = await import("@/app/api/announcements/route");
    expect((await GET(get("/api/announcements?surface=member"))).status).toBe(200);
  });

  test("leçon de formation : un coach n'est pas refusé par la garde (pas de 401)", async () => {
    const { GET } = await import("@/app/api/formation/lesson/[slug]/route");
    const res = await GET(get("/api/formation/lesson/inconnue"), { params: Promise.resolve({ slug: "inconnue" }) });
    expect(res.status).not.toBe(401);
  });
});
