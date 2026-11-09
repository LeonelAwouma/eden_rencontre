import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const w = vi.hoisted(() => ({
  phoneTaken: false,
  createUserArgs: null as Record<string, unknown> | null,
  profileRow: null as Record<string, unknown> | null,
  profileError: null as { code: string; message: string } | null,
  confirmationEmails: 0,
  notifications: [] as Record<string, unknown>[],
}));

vi.mock("next/server", async (orig) => {
  const mod = await orig<typeof import("next/server")>();
  // after() exige un contexte de requête Next : on l'exécute directement.
  return { ...mod, after: (fn: () => unknown) => { void fn(); } };
});
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => true, recordRateLimit: async () => {} }));
vi.mock("@/lib/registration-incident", () => ({ reportRegistrationFailure: async () => {} }));
vi.mock("@/lib/referrals", () => ({ captureReferral: async () => {}, REFERRAL_COOKIE: "eden_ref" }));
vi.mock("@/lib/email", () => ({ sendRegistrationReceivedEmail: async () => { w.confirmationEmails++; return true; } }));
vi.mock("@/lib/registration-media", () => ({
  readRegistrationSelfie: () => ({ selfieRef: null, photoRefs: [], media: null }),
  discardLivenessFrames: async () => {},
  resolveRegistrationAvatar: async () => null,
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        createUser: async (args: Record<string, unknown>) => { w.createUserArgs = args; return { data: { user: { id: "u1" } }, error: null }; },
        deleteUser: async () => ({ error: null }),
      },
    },
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      Object.assign(q, {
        select: () => q,
        eq: () => q,
        ilike: () => q,
        limit: () => q,
        // Contrôle anticipé : seul le numéro peut déjà exister (le pseudo est libre).
        maybeSingle: async () => ({ data: table === "profiles" && w.phoneTaken ? { id: "other" } : null, error: null }),
        upsert: async (row: Record<string, unknown>) => { if (table === "profiles") w.profileRow = row; return { error: table === "profiles" ? w.profileError : null }; },
        insert: async (row: Record<string, unknown>) => { if (table === "admin_notifications") w.notifications.push(row); return { error: null }; },
        update: () => q,
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
      });
      return q;
    },
  }),
}));

const base = {
  name: "Awa Ndiaye", pseudo: "awa", firstName: "Awa", lastName: "Ndiaye", password: "Motdepasse1!",
  gender: "femme", birthDate: "1995-05-05", civilStatus: "celibataire", country: "Cameroun", city: "Douala",
  phone: "+237690123456",
};
const post = (body: Record<string, unknown>) =>
  new NextRequest("http://x/api/auth/register", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  w.phoneTaken = false; w.createUserArgs = null; w.profileRow = null; w.profileError = null; w.confirmationEmails = 0; w.notifications = [];
});

describe("POST /api/auth/register : parcours normal (e-mail)", () => {
  test("e-mail + mot de passe + téléphone : compte créé en pending, e-mail de réception envoyé", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ ...base, email: "Awa@Exemple.com" }));
    expect(res.status).toBe(200);
    expect(w.createUserArgs).toMatchObject({ email: "awa@exemple.com" });
    expect(w.profileRow).toMatchObject({ email: "awa@exemple.com", phone: "+237690123456", status: "pending" });
    expect(w.confirmationEmails).toBe(1);
  });

  test("e-mail manquant hors parcours téléphone : 400", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ ...base }))).status).toBe(400);
  });
});

describe("POST /api/auth/register : parcours exceptionnel (téléphone seul)", () => {
  test("sans e-mail : adresse technique côté Auth, profiles.email NULL, pending, aucun e-mail envoyé", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ ...base, signupMethod: "phone" }));
    expect(res.status).toBe(200);
    expect(w.createUserArgs).toMatchObject({ email: "237690123456@phone.eden.invalid", email_confirm: true });
    expect(w.profileRow).toMatchObject({ email: null, phone: "+237690123456", status: "pending" });
    expect(w.confirmationEmails).toBe(0);
  });

  test("l'adresse technique n'apparaît ni dans la réponse ni dans la notification admin", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ ...base, signupMethod: "phone" }));
    expect(JSON.stringify(await res.json())).not.toContain("phone.eden.invalid");
    expect(JSON.stringify(w.notifications)).not.toContain("phone.eden.invalid");
    expect(JSON.stringify(w.notifications)).toContain("+237690123456");
  });

  test("même numéro déjà utilisé : 409, aucun compte créé", async () => {
    w.phoneTaken = true;
    const { POST } = await import("./route");
    const res = await POST(post({ ...base, signupMethod: "phone" }));
    expect(res.status).toBe(409);
    expect(w.createUserArgs).toBeNull();
  });

  test("course sur l'index unique du numéro : 409 (compte annulé)", async () => {
    w.profileError = { code: "23505", message: 'duplicate key value violates unique constraint "profiles_phone_unique_idx"' };
    const { POST } = await import("./route");
    const res = await POST(post({ ...base, signupMethod: "phone" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/numéro/);
  });

  test("numéro invalide : 400", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ ...base, signupMethod: "phone", phone: "690123456" }))).status).toBe(400);
  });
});
