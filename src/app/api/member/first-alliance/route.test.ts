import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const ME = "22222222-2222-4222-8222-222222222222";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const F1 = "33333333-3333-4333-8333-333333333333";

type Row = Record<string, unknown>;
const w = vi.hoisted(() => ({
  member: null as { id: string; email: string } | null,
  profile: null as Row | null,
  friendships: [] as Row[],
  members: [] as Row[],
  messages: [] as Row[],
  writes: 0,
  messageFilters: [] as [string, unknown][],
}));

vi.mock("@/lib/api-auth", () => ({ requireApprovedMember: async () => w.member }));
vi.mock("@/lib/admin-system-shared", () => ({ ADMIN_SYSTEM_EMAIL: "admin-system@eden.local" }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const eqs: [string, unknown][] = [];
      let ins: [string, unknown[]][] = [];
      const resolve = () => {
        if (table === "profiles") {
          const byEmail = eqs.find(([c]) => c === "email");
          return byEmail ? { id: ADMIN } : w.profile;
        }
        if (table === "friendships") return w.friendships;
        if (table === "messages") { w.messageFilters.push(...eqs); return w.messages; }
        if (table === "conversation_members") {
          const userEq = eqs.find(([c]) => c === "user_id");
          if (userEq) return w.members.filter((m) => m.user_id === userEq[1]).map((m) => ({ conversation_id: m.conversation_id }));
          const users = ins.find(([c]) => c === "user_id")?.[1];
          return w.members.filter((m) => !users || users.includes(m.user_id));
        }
        return [];
      };
      const q: Record<string, unknown> = {
        select: () => q, order: () => q, limit: () => q, or: () => q,
        eq: (c: string, v: unknown) => { eqs.push([c, v]); return q; },
        in: (c: string, v: unknown[]) => { ins.push([c, v]); return q; },
        insert: () => { w.writes++; return q; }, update: () => { w.writes++; return q; }, upsert: () => { w.writes++; return q; },
        maybeSingle: async () => ({ data: resolve(), error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: resolve(), error: null }).then(res),
      };
      return q;
    },
  }),
}));

const get = () => new NextRequest("http://x/api/member/first-alliance");
const call = async () => { const { GET } = await import("./route"); const r = await GET(get()); return { status: r.status, body: await r.json() }; };

const completeProfile = {
  verification_status: "verified", avatar_url: "/a.png", name: "N", bio: "b", city: "c", profession: "p",
  civil_status: "single", marriage_vision: "v", formation_completed: [] as string[],
};
async function pillarOneSlugs() {
  const { MATCHING_REQUIRED_LESSONS } = await import("@/lib/formation/structure");
  return [...MATCHING_REQUIRED_LESSONS];
}

beforeEach(async () => {
  w.member = { id: ME, email: "m@x.fr" };
  w.profile = { ...completeProfile, formation_completed: await pillarOneSlugs() };
  w.friendships = []; w.members = []; w.messages = []; w.writes = 0; w.messageFilters.length = 0;
});

describe("GET /api/member/first-alliance", () => {
  test("401 sans session membre (ex. coach ou visiteur)", async () => {
    w.member = null;
    expect((await call()).status).toBe(401);
  });

  test("profil non vérifié : masqué, aucune requête d'alliance", async () => {
    w.profile = { ...w.profile, verification_status: "none" };
    expect((await call()).body.step).toBe("hidden");
  });

  test("profil incomplet après vérification : masqué", async () => {
    w.profile = { ...w.profile, bio: "" };
    expect((await call()).body.step).toBe("hidden");
  });

  test("vérifié, sans alliance : invitation initiale", async () => {
    expect((await call()).body.step).toBe("none");
  });

  test("pilier 1 non terminé : matching verrouillé", async () => {
    w.profile = { ...w.profile, formation_completed: [] };
    expect((await call()).body.step).toBe("locked_formation");
  });

  test("demande envoyée en attente", async () => {
    w.friendships = [{ requester_id: ME, addressee_id: F1, status: "pending", updated_at: "2026-11-01" }];
    expect((await call()).body.step).toBe("request_pending");
  });

  test("demande reçue en attente", async () => {
    w.friendships = [{ requester_id: F1, addressee_id: ME, status: "pending", updated_at: "2026-11-01" }];
    const { body } = await call();
    expect(body.step).toBe("request_received");
    expect(body.pendingIncoming).toBe(1);
  });

  test("alliance acceptée, sans conversation", async () => {
    w.friendships = [{ requester_id: ME, addressee_id: F1, status: "accepted", updated_at: "2026-11-01" }];
    const { body } = await call();
    expect(body).toMatchObject({ step: "alliance_accepted", friendId: F1, conversationId: null });
  });

  test("conversation créée sans message", async () => {
    w.friendships = [{ requester_id: ME, addressee_id: F1, status: "accepted", updated_at: "2026-11-01" }];
    w.members = [{ conversation_id: "c1", user_id: ME }, { conversation_id: "c1", user_id: F1 }];
    const { body } = await call();
    expect(body).toMatchObject({ step: "conversation_empty", friendId: F1, conversationId: "c1" });
  });

  test("premier message envoyé à un membre : accompagnement masqué", async () => {
    w.friendships = [{ requester_id: ME, addressee_id: F1, status: "accepted", updated_at: "2026-11-01" }];
    w.members = [{ conversation_id: "c1", user_id: ME }, { conversation_id: "c1", user_id: F1 }];
    w.messages = [{ id: "m1" }];
    const { body } = await call();
    expect(body.step).toBe("hidden");
    // Seuls les messages écrits par le membre connecté comptent.
    expect(w.messageFilters).toContainEqual(["sender_id", ME]);
  });

  test("l'alliance et la conversation avec le compte Admin ne comptent pas", async () => {
    w.friendships = [{ requester_id: ME, addressee_id: ADMIN, status: "accepted", updated_at: "2026-11-01" }];
    w.members = [{ conversation_id: "ca", user_id: ME }, { conversation_id: "ca", user_id: ADMIN }];
    w.messages = [{ id: "m-admin" }];
    const { body } = await call();
    expect(body.step).toBe("none");
  });

  test("alliance refusée : aucun effet (retour à l'invitation initiale)", async () => {
    // Le serveur ne charge que pending/accepted ; une alliance refusée n'est jamais renvoyée.
    expect((await call()).body.step).toBe("none");
  });

  test("lecture seule : aucune écriture (pas de demande, pas de message, pas de conversation)", async () => {
    w.friendships = [{ requester_id: ME, addressee_id: F1, status: "accepted", updated_at: "2026-11-01" }];
    await call();
    expect(w.writes).toBe(0);
  });
});
