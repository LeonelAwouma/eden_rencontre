import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Revue d'acceptation du lot 1 — permissions résiduelles d'un JETON VALIDE.
 * Les vraies gardes (api-auth, coach/guard) tournent contre un faux client : seul l'état du compte change.
 * Un coach suspendu garde un jeton valide un certain temps ; aucune route ne doit alors lui répondre.
 */

type State = "coach_active" | "coach_suspended" | "coach_desync" | "member" | "member_pending" | "member_suspended";
const world = vi.hoisted(() => ({ state: "coach_active" as string }));

const rows = (s: string) => {
  switch (s) {
    case "coach_active": return { profile: { status: "approved", account_type: "coach" }, coach: { user_id: "u1", active: true } };
    case "coach_suspended": return { profile: { status: "suspended", account_type: "coach" }, coach: { user_id: "u1", active: false } };
    case "coach_desync": return { profile: { status: "approved", account_type: "coach" }, coach: { user_id: "u1", active: false } }; // profil « approved » mais coach inactif
    case "member": return { profile: { status: "approved", account_type: "member" }, coach: null };
    case "member_pending": return { profile: { status: "pending", account_type: "member" }, coach: null };
    default: return { profile: { status: "suspended", account_type: "member" }, coach: null };
  }
};

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u1@x.fr" } } }), admin: { getUserById: async () => ({ data: { user: null } }), updateUserById: async () => ({ error: null }) } },
    storage: { from: () => ({ list: async () => ({ data: [], error: null }), createSignedUploadUrl: async () => ({ data: null, error: { message: "x" } }) }) },
    rpc: async () => ({ data: [], error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      Object.assign(q, {
        select: () => q, eq: () => q, neq: () => q, in: () => q, order: () => q, limit: () => q, ilike: () => q, is: () => q,
        insert: () => q, upsert: () => q, update: () => q, delete: () => q,
        maybeSingle: async () => {
          const r = rows(world.state);
          return { data: table === "profiles" ? r.profile : table === "coach_accounts" ? r.coach : null, error: null };
        },
        single: async () => ({ data: null, error: { message: "n/a" } }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      });
      return q;
    },
  }),
}));
vi.mock("@/lib/push-server", () => ({ isPushConfigured: () => true, sendPushToUsers: async () => ({ sent: 0, removed: 0 }) }));
vi.mock("@/lib/google-meet", () => ({
  createOAuthState: () => ({ state: "s", nonce: "n" }), setOAuthStateCookie: () => {}, generateMeetAuthUrl: () => "https://x",
  getMeetAuthStatus: async () => ({ connected: false, hasMeetScope: false }), deleteCredentials: async () => ({ success: true }),
  createMeetSpace: async () => ({ success: false, error: "x", errorCode: "X" }),
}));
vi.mock("@/lib/verification-badge", () => ({ evaluateVerificationBadge: async () => ({ granted: false, status: "none" }) }));
vi.mock("@/lib/referrals", () => ({ reevaluateReferral: async () => {}, captureReferral: async () => {}, REFERRAL_COOKIE: "r" }));
vi.mock("@/lib/registration-incident", () => ({ reportRegistrationFailure: async () => {} }));
vi.mock("@/lib/email", () => ({ sendRegistrationReceivedEmail: async () => {} }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));

const req = (method: string, body?: unknown, url = "http://x/api/t") =>
  new NextRequest(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { authorization: "Bearer jeton", "Content-Type": "application/json" } });
const ALL: State[] = ["coach_active", "coach_suspended", "coach_desync", "member", "member_pending", "member_suspended"];
const DENIED_CODES = [401, 403];
const isDenied = (s: number) => DENIED_CODES.includes(s);

type Call = () => Promise<Response>;
const run = async (state: State, call: Call) => { world.state = state; return (await call()).status; };
beforeEach(() => { world.state = "coach_active"; });

// ── Routes PARTAGÉES : membre approuvé OU coach actif ────────────────────────────
const shared: Record<string, Call> = {
  "GET /api/meetings": async () => (await import("@/app/api/meetings/route")).GET(req("GET")),
  "GET /api/meetings/notifications": async () => (await import("@/app/api/meetings/notifications/route")).GET(req("GET")),
  "PATCH /api/meetings/notifications": async () => (await import("@/app/api/meetings/notifications/route")).PATCH(req("PATCH", { mark_all: true })),
  "GET /api/blog/notifications": async () => (await import("@/app/api/blog/notifications/route")).GET(req("GET")),
  "PATCH /api/blog/notifications": async () => (await import("@/app/api/blog/notifications/route")).PATCH(req("PATCH", { mark_all: true })),
  "POST /api/push/subscribe": async () => (await import("@/app/api/push/subscribe/route")).POST(req("POST", { subscription: { endpoint: "https://push.example/1", keys: { p256dh: "a", auth: "b" } } })),
  "GET /api/meets/[id]/salle": async () => (await import("@/app/api/meets/[id]/salle/route")).GET(req("GET"), { params: Promise.resolve({ id: "m1" }) }),
};
describe("routes partagées : un jeton valide ne suffit plus (coach suspendu, désynchronisé, membre non approuvé)", () => {
  for (const [name, call] of Object.entries(shared)) {
    test(`${name} — refusé pour un coach suspendu / désynchronisé et un membre en attente ou suspendu`, async () => {
      for (const s of ["coach_suspended", "coach_desync", "member_pending", "member_suspended"] as State[]) {
        expect(await run(s, call), `${name} / ${s}`).toBe(401);
      }
    });
    test(`${name} — accessible à un coach actif et à un membre approuvé (non-régression)`, async () => {
      for (const s of ["coach_active", "member"] as State[]) {
        expect(isDenied(await run(s, call)), `${name} / ${s}`).toBe(false);
      }
    });
  }
  test("DELETE /api/push/subscribe reste ouvert : un compte suspendu peut retirer SA souscription", async () => {
    const { DELETE } = await import("@/app/api/push/subscribe/route");
    expect(await run("coach_suspended", async () => DELETE(req("DELETE", { endpoint: "https://push.example/1" })))).toBe(200);
  });
});

// ── Routes MEMBRES UNIQUEMENT : même un coach actif est refusé ───────────────────
const memberOnly: Record<string, Call> = {
  "GET /api/google-meet/status": async () => (await import("@/app/api/google-meet/status/route")).GET(req("GET")),
  "POST /api/google-meet/authorize": async () => (await import("@/app/api/google-meet/authorize/route")).POST(req("POST", {})),
  "POST /api/google-meet/disconnect": async () => (await import("@/app/api/google-meet/disconnect/route")).POST(req("POST", {})),
  "POST /api/google-meet/test": async () => (await import("@/app/api/google-meet/test/route")).POST(req("POST", {})),
  "POST /api/user/verification": async () => (await import("@/app/api/user/verification/route")).POST(req("POST", {})),
};
describe("routes réservées aux membres : tous les états coach sont refusés", () => {
  for (const [name, call] of Object.entries(memberOnly)) {
    test(`${name}`, async () => {
      for (const s of ["coach_active", "coach_suspended", "coach_desync", "member_pending", "member_suspended"] as State[]) {
        expect(await run(s, call), `${name} / ${s}`).toBe(401);
      }
      // La garde répond 401 ; certaines routes ont leur propre 403 métier (ex. « Google Meet non connecté »).
      expect(await run("member", call), `${name} / member`).not.toBe(401);
    });
  }
});

// ── Routes PRÉ-APPROBATION : ouvertes aux candidats, fermées aux coachs ───────────
const VALID_REGISTRATION = {
  pseudo: "Awa", gender: "femme", birthDate: "1990-01-01", civilStatus: "celibataire", region: "Littoral", country: "CM", city: "Douala", phone: "+237677000000",
};
const preApproval: Record<string, Call> = {
  "POST /api/onboarding/complete": async () => (await import("@/app/api/onboarding/complete/route")).POST(req("POST", { answers: {} })),
  "POST /api/auth/google-onboarding": async () => (await import("@/app/api/auth/google-onboarding/route")).POST(req("POST", VALID_REGISTRATION)),
  "POST /api/referrals/capture": async () => (await import("@/app/api/referrals/capture/route")).POST(req("POST", { nonce: "abc" })),
};
describe("routes pré-approbation : un coach (actif, suspendu ou désynchronisé) reçoit 403", () => {
  for (const [name, call] of Object.entries(preApproval)) {
    test(`${name} — coach refusé`, async () => {
      for (const s of ["coach_active", "coach_suspended", "coach_desync"] as State[]) {
        expect(await run(s, call), `${name} / ${s}`).toBe(403);
      }
    });
    test(`${name} — un candidat (membre en attente) n'est PAS refusé par la garde (non-régression de l'inscription)`, async () => {
      expect(isDenied(await run("member_pending", call)), name).toBe(false);
    });
  }
});

// ── Routes du lot 2 : COACH ACTIF uniquement (un jeton valide ne suffit à aucun autre état) ───────────────────
const MEMBER_ID = "a0000001-0000-4000-8000-000000000000";
const coachOnly: Record<string, Call> = {
  "GET /api/coach/dashboard": async () => (await import("@/app/api/coach/dashboard/route")).GET(req("GET")),
  "GET /api/coach/members": async () => (await import("@/app/api/coach/members/route")).GET(req("GET")),
  "GET /api/coach/members/[id]": async () =>
    (await import("@/app/api/coach/members/[id]/route")).GET(req("GET", undefined, `http://x/api/coach/members/${MEMBER_ID}`), { params: Promise.resolve({ id: MEMBER_ID }) }),
  "GET /api/coach/formation": async () => (await import("@/app/api/coach/formation/route")).GET(req("GET")),
  "GET /api/coach/profile": async () => (await import("@/app/api/coach/profile/route")).GET(req("GET")),
  "GET /api/coach/notifications": async () => (await import("@/app/api/coach/notifications/route")).GET(req("GET")),
};
describe("routes Coach du lot 2 : jeton valide mais compte non autorisé → 403", () => {
  for (const [name, call] of Object.entries(coachOnly)) {
    test(`${name}`, async () => {
      for (const s of ["coach_suspended", "coach_desync", "member", "member_pending", "member_suspended"] as State[]) {
        expect(await run(s, call), `${name} / ${s}`).toBe(403);
      }
      // Le coach actif franchit la garde (la suite peut répondre 200 ou 404 selon les données, jamais 401/403).
      expect(isDenied(await run("coach_active", call)), `${name} / coach_active`).toBe(false);
    });
  }
});

describe("garde fail-closed sur lecture impossible", () => {
  test("une erreur de lecture du type de compte refuse (503) au lieu de laisser passer", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u1@x.fr" } } }) },
        from: () => { const q: Record<string, unknown> = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: { code: "XX000", message: "boom" } }) }; return q; },
      }),
    }));
    const { POST } = await import("@/app/api/referrals/capture/route");
    const res = await POST(req("POST", { nonce: "abc" }));
    expect(res.status).toBe(503);
    vi.doUnmock("@/lib/supabase-admin");
  });
});
