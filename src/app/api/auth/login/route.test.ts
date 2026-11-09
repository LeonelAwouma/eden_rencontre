import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown> | null;
const w = vi.hoisted(() => ({
  profile: null as Row,
  coach: null as Row,
  lastLoginWrites: 0,
  signOuts: 0,
  signedInWith: "" as string,
}));

vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      signInWithPassword: async ({ email }: { email: string }) => {
        w.signedInWith = email;
        return {
          data: { user: { id: "u1" }, session: { access_token: "a", refresh_token: "r", expires_in: 3600 } },
          error: null,
        };
      },
      admin: { signOut: async () => { w.signOuts++; } },
    },
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      Object.assign(q, {
        select: () => q,
        eq: () => q,
        update: () => { if (table === "coach_accounts") w.lastLoginWrites++; return q; },
        maybeSingle: async () => ({ data: table === "profiles" ? w.profile : w.coach, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
      });
      return q;
    },
  }),
}));

const login = () =>
  new NextRequest("http://x/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "a@x.fr", password: "motdepasse123" }),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => { w.profile = null; w.coach = null; w.lastLoginWrites = 0; w.signOuts = 0; w.signedInWith = ""; });

const loginWith = (identifier: string) =>
  new NextRequest("http://x/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: identifier, password: "motdepasse123" }),
    headers: { "Content-Type": "application/json" },
  });

describe("POST /api/auth/login : compte « téléphone seul »", () => {
  test("le numéro est converti en adresse technique, jamais renvoyée au navigateur", async () => {
    w.profile = { status: "approved", name: "Awa", email: null, account_type: "member" };
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237 690 12 34 56"));
    expect(res.status).toBe(200);
    expect(w.signedInWith).toBe("237690123456@phone.eden.invalid");
    expect((await res.json()).user.email).toBeNull();
  });

  test("numéro en attente de validation : 403 pending", async () => {
    w.profile = { status: "pending", name: "Awa", email: null, account_type: "member" };
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237690123456"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("pending");
  });

  test("identifiant ni e-mail ni numéro international : 400", async () => {
    const { POST } = await import("./route");
    expect((await POST(loginWith("690123456"))).status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  test("membre approuvé : connexion, rôle member, aucune écriture de dernière connexion coach", async () => {
    w.profile = { status: "approved", name: "M", email: "a@x.fr", account_type: "member" };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(200);
    expect((await res.json()).user.role).toBe("member");
    expect(w.lastLoginWrites).toBe(0);
  });

  test("coach actif et cohérent : connexion, rôle coach, dernière connexion enregistrée", async () => {
    w.profile = { status: "approved", name: "C", email: "a@x.fr", account_type: "coach" };
    w.coach = { user_id: "u1", active: true };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(200);
    expect((await res.json()).user.role).toBe("coach");
    expect(w.lastLoginWrites).toBe(1);
  });

  test("coach suspendu : 403 suspended, déconnecté, aucune dernière connexion", async () => {
    w.profile = { status: "suspended", name: "C", email: "a@x.fr", account_type: "coach" };
    w.coach = { user_id: "u1", active: false };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("suspended");
    expect(w.signOuts).toBe(1);
    expect(w.lastLoginWrites).toBe(0);
  });

  test("coach désactivé alors que le profil dit « approuvé » : refusé (suspendu)", async () => {
    w.profile = { status: "approved", name: "C", email: "a@x.fr", account_type: "coach" };
    w.coach = { user_id: "u1", active: false };
    const { POST } = await import("./route");
    expect((await POST(login())).status).toBe(403);
  });

  test("coach sans profil : refusé, jamais transformé en membre", async () => {
    w.profile = null;
    w.coach = { user_id: "u1", active: true };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("coach_inconsistent");
  });

  test("profil marqué coach sans ligne coach_accounts : refusé", async () => {
    w.profile = { status: "approved", name: "C", email: "a@x.fr", account_type: "coach" };
    w.coach = null;
    const { POST } = await import("./route");
    expect((await POST(login())).status).toBe(403);
  });

  test("ligne coach_accounts sur un profil membre : refusé (incohérence)", async () => {
    w.profile = { status: "approved", name: "M", email: "a@x.fr", account_type: "member" };
    w.coach = { user_id: "u1", active: true };
    const { POST } = await import("./route");
    expect((await POST(login())).status).toBe(403);
  });

  test("membre en attente : 403 pending", async () => {
    w.profile = { status: "pending", name: "M", email: "a@x.fr", account_type: "member" };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("pending");
  });

  test("statut inattendu : refusé (aucune connexion par défaut)", async () => {
    w.profile = { status: "banni", name: "M", email: "a@x.fr", account_type: "member" };
    const { POST } = await import("./route");
    expect((await POST(login())).status).toBe(403);
  });
});
