import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown> | null;
const w = vi.hoisted(() => ({
  profile: null as Row,
  coach: null as Row,
  profileError: null as null | { code: string },
  coachError: null as null | { code: string },
  lastLoginWrites: 0,
  signOuts: 0,
  signedInWith: "" as string,
  authSignIns: 0,
  adminTables: [] as string[],
  phoneProfile: null as Row,
  phoneError: null as null | { code: string },
  authUserId: "u1",
  authUsers: {} as Record<string, string | null>,
  getUserErr: false,
}));

vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));

// Le client Auth public et le client service_role sont volontairement distincts.
vi.mock("@/lib/supabase-auth-server", () => ({
  getSupabaseAuthClient: () => ({
    auth: {
      signInWithPassword: async ({ email }: { email: string }) => {
        w.authSignIns++;
        w.signedInWith = email;
        return {
          data: { user: { id: w.authUserId }, session: { access_token: "a", refresh_token: "r", expires_in: 3600 } },
          error: null,
        };
      },
    },
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        signOut: async () => { w.signOuts++; return { error: null }; },
        getUserById: async (id: string) => w.getUserErr
          ? { data: null, error: { message: "x" } }
          : { data: { user: { email: w.authUsers[id] ?? null } }, error: null },
      },
    },
    from: (table: string) => {
      w.adminTables.push(table);
      const q: Record<string, unknown> = {};
      let byPhone = false;
      Object.assign(q, {
        select: () => q,
        eq: (col: string) => { if (col === "phone") byPhone = true; return q; },
        update: () => { if (table === "coach_accounts") w.lastLoginWrites++; return q; },
        maybeSingle: async () => (byPhone
          ? { data: w.phoneProfile, error: w.phoneError }
          : {
            data: table === "profiles" ? w.profile : w.coach,
            error: table === "profiles" ? w.profileError : w.coachError,
          }),
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

beforeEach(() => {
  w.profile = null;
  w.coach = null;
  w.profileError = null;
  w.coachError = null;
  w.lastLoginWrites = 0;
  w.signOuts = 0;
  w.authSignIns = 0;
  w.signedInWith = "";
  w.adminTables.length = 0;
  w.phoneProfile = null;
  w.phoneError = null;
  w.authUserId = "u1";
  w.authUsers = {};
  w.getUserErr = false;
});

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

describe("POST /api/auth/login : coachs identifiés par téléphone", () => {
  const COACH_A = "aaaaaaaa-0000-4000-8000-000000000001";
  const COACH_B = "bbbbbbbb-0000-4000-8000-000000000002";
  const coachRows = (id: string) => {
    w.profile = { status: "approved", name: "Coach", email: "contact@partage.fr", account_type: "coach" };
    w.coach = { user_id: id, active: true };
    w.authUserId = id;
  };

  test("deux coachs, même adresse de contact, deux numéros : deux identités et deux sessions distinctes", async () => {
    const { POST } = await import("./route");
    w.phoneProfile = { id: COACH_A, account_type: "coach" };
    w.authUsers[COACH_A] = "237690000001@phone.eden.invalid";
    coachRows(COACH_A);
    const a = await POST(loginWith("+237 690 00 00 01"));
    const aBody = await a.json();
    expect(a.status).toBe(200);
    expect(w.signedInWith).toBe("237690000001@phone.eden.invalid");
    expect(aBody.user.id).toBe(COACH_A);
    expect(aBody.user.role).toBe("coach");

    w.phoneProfile = { id: COACH_B, account_type: "coach" };
    w.authUsers[COACH_B] = "237690000002@phone.eden.invalid";
    coachRows(COACH_B);
    const b = await POST(loginWith("+237690000002"));
    const bBody = await b.json();
    expect(b.status).toBe(200);
    expect(w.signedInWith).toBe("237690000002@phone.eden.invalid");
    expect(bBody.user.id).toBe(COACH_B);
    expect(bBody.user.id).not.toBe(aBody.user.id);
    expect(bBody.sessionEmail).not.toBe(aBody.sessionEmail);
    // Seule l'adresse de contact est exposée comme e-mail, jamais l'adresse technique.
    expect(bBody.user.email).toBe("contact@partage.fr");
  });

  test("ancien coach (adresse Auth réelle) : numéro résolu en base, adresse réelle utilisée pour l'authentification", async () => {
    w.phoneProfile = { id: COACH_A, account_type: "coach" };
    w.authUsers[COACH_A] = "ancien.coach@x.fr";
    coachRows(COACH_A);
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237690000001"));
    expect(res.status).toBe(200);
    expect(w.signedInWith).toBe("ancien.coach@x.fr");
    expect((await res.json()).sessionEmail).toBe("ancien.coach@x.fr");
  });

  test("ancien coach : la connexion par e-mail reste possible", async () => {
    coachRows("u1");
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(200);
    expect(w.signedInWith).toBe("a@x.fr");
  });

  test("numéro sans aucun compte : jamais connecté (adresse technique, profil absent)", async () => {
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237699999999"));
    expect(w.signedInWith).toBe("237699999999@phone.eden.invalid");
    expect(res.status).toBe(403);
  });

  test("numéro mal formaté : 400, aucune lecture de compte ni authentification", async () => {
    const { POST } = await import("./route");
    for (const bad of ["690123456", "+23", "+abc123456789", "06 12 34 56 78"]) {
      expect((await POST(loginWith(bad))).status).toBe(400);
    }
    expect(w.authSignIns).toBe(0);
    expect(w.adminTables).toHaveLength(0);
  });

  test("coach suspendu connecté par téléphone : 403, déconnecté, aucune dernière connexion", async () => {
    w.phoneProfile = { id: COACH_A, account_type: "coach" };
    w.authUsers[COACH_A] = "237690000001@phone.eden.invalid";
    w.profile = { status: "approved", name: "C", email: null, account_type: "coach" };
    w.coach = { user_id: COACH_A, active: false };
    w.authUserId = COACH_A;
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237690000001"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("suspended");
    expect(w.signOuts).toBe(1);
    expect(w.lastLoginWrites).toBe(0);
  });

  test("panne de lecture pendant la résolution du numéro : 503, jamais de connexion de repli", async () => {
    const { POST } = await import("./route");
    w.phoneError = { code: "XX000" };
    expect((await POST(loginWith("+237690000001"))).status).toBe(503);
    w.phoneError = null;
    w.phoneProfile = { id: COACH_A, account_type: "coach" };
    w.getUserErr = true;
    expect((await POST(loginWith("+237690000001"))).status).toBe(503);
    expect(w.authSignIns).toBe(0);
  });

  test("identité Auth différente du coach désigné par le numéro : refusée et déconnectée", async () => {
    w.phoneProfile = { id: COACH_A, account_type: "coach" };
    w.authUsers[COACH_A] = "237690000001@phone.eden.invalid";
    coachRows(COACH_B);
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237690000001"));
    expect(res.status).toBe(401);
    expect(w.signOuts).toBe(1);
  });

  test("membre par téléphone : comportement inchangé (adresse technique)", async () => {
    w.phoneProfile = { id: "m1", account_type: "member" };
    w.profile = { status: "approved", name: "Awa", email: null, account_type: "member" };
    const { POST } = await import("./route");
    const res = await POST(loginWith("+237690123456"));
    expect(res.status).toBe(200);
    expect(w.signedInWith).toBe("237690123456@phone.eden.invalid");
    expect((await res.json()).user.role).toBe("member");
  });
});

describe("POST /api/auth/login", () => {
  test("la vérification du mot de passe utilise le client Auth dédié ; les lectures restent sur le client admin", async () => {
    w.profile = { status: "approved", name: "C", email: "a@x.fr", account_type: "coach" };
    w.coach = { user_id: "u1", active: true };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(200);
    expect(w.authSignIns).toBe(1);
    expect(w.adminTables).toContain("profiles");
    expect(w.adminTables).toContain("coach_accounts");
    expect((await res.json()).user.role).toBe("coach");
  });

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

  test("une panne de lecture de coach_accounts renvoie 503 et non une fausse incohérence 403", async () => {
    w.profile = { status: "approved", name: "C", email: "a@x.fr", account_type: "coach" };
    w.coachError = { code: "42501" };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("account_status_unavailable");
    expect(w.signOuts).toBe(1);
  });

  test("une panne de lecture du profil renvoie 503 et révoque la session provisoire", async () => {
    w.profileError = { code: "XX000" };
    const { POST } = await import("./route");
    const res = await POST(login());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("account_status_unavailable");
    expect(w.signOuts).toBe(1);
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
