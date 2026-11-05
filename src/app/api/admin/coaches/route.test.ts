import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const w = vi.hoisted(() => ({
  admin: true,
  rateOk: true,
  tables: { coach_accounts: new Map<string, Row>(), profiles: new Map<string, Row>() } as Record<string, Map<string, Row>>,
  fail: {} as Record<string, boolean>, // "table:op" -> erreur simulée
  authCreateFails: false,
  authUpdateFails: false,
  authDeleteFails: false,
  spies: { create: [] as unknown[], update: [] as unknown[], del: [] as string[], audit: [] as unknown[][] },
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr", role: "admin" }; },
  logAdminAction: async (...args: unknown[]) => { w.spies.audit.push(args); },
}));
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => w.rateOk, recordRateLimit: async () => {} }));

const keyOf = (table: string) => (table === "coach_accounts" ? "user_id" : "id");

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        createUser: async (p: Record<string, unknown>) => {
          w.spies.create.push(p);
          if (w.authCreateFails) return { data: { user: null }, error: { message: "exists" } };
          return { data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null };
        },
        updateUserById: async (id: string, p: unknown) => { w.spies.update.push({ id, p }); return { error: w.authUpdateFails ? { message: "x" } : null }; },
        deleteUser: async (id: string) => {
          w.spies.del.push(id);
          if (w.authDeleteFails) return { error: { message: "x" } };
          w.tables.coach_accounts.delete(id); w.tables.profiles.delete(id); // cascade
          return { error: null };
        },
      },
    },
    from: (table: string) => {
      let op = "select";
      let payload: Row = {};
      const filters: Row = {};
      const q: Record<string, unknown> = {};
      const exec = () => {
        if (w.fail[`${table}:${op}`]) return { data: null, error: { code: "XX", message: "boom" } };
        const map = w.tables[table];
        const rows = [...map.values()].filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
        if (op === "insert") { map.set(payload[keyOf(table)] as string, { ...payload }); return { data: null, error: null }; }
        if (op === "upsert") { const id = payload[keyOf(table)] as string; map.set(id, { ...(map.get(id) || {}), ...payload }); return { data: null, error: null }; }
        if (op === "update") { rows.forEach((r) => Object.assign(r, payload)); return { data: rows[0] ?? null, error: null }; }
        if (op === "delete") { rows.forEach((r) => map.delete(r[keyOf(table)] as string)); return { data: null, error: null }; }
        return { data: rows, error: null };
      };
      let single = false;
      Object.assign(q, {
        select: () => q,
        order: () => q,
        eq: (c: string, v: unknown) => { filters[c] = v; return q; },
        insert: (p: Row) => { op = "insert"; payload = p; return q; },
        upsert: (p: Row) => { op = "upsert"; payload = p; return q; },
        update: (p: Row) => { op = "update"; payload = p; return q; },
        delete: () => { op = "delete"; return q; },
        maybeSingle: () => { single = true; return q; },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const r = exec() as { data: unknown; error: unknown };
          const out = single && Array.isArray(r.data) ? { ...r, data: (r.data as Row[])[0] ?? null } : r;
          return Promise.resolve(out).then(res, rej);
        },
      });
      return q;
    },
  }),
}));

const ID = "11111111-1111-4111-8111-111111111111";
const call = (method: string, body?: unknown) =>
  new NextRequest("http://x/api/admin/coaches", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
const seedCoach = (over: Row = {}, profile: Row | null = { id: ID, status: "approved", account_type: "coach", name: "Coach" }) => {
  w.tables.coach_accounts.set(ID, { user_id: ID, email: "c@x.fr", display_name: "Coach", active: true, ...over });
  if (profile) w.tables.profiles.set(ID, profile);
};
const actions = () => w.spies.audit.map((a) => a[2]);
const VALID = { name: "Awa", email: "Awa@X.fr", password: "motdepasse123" };

beforeEach(() => {
  w.admin = true; w.rateOk = true; w.fail = {};
  w.authCreateFails = false; w.authUpdateFails = false; w.authDeleteFails = false;
  w.tables.coach_accounts.clear(); w.tables.profiles.clear();
  w.spies.create.length = 0; w.spies.update.length = 0; w.spies.del.length = 0; w.spies.audit.length = 0;
});

describe("accès administrateur", () => {
  test("toutes les méthodes refusent un non-administrateur (401)", async () => {
    w.admin = false;
    const r = await import("./route");
    expect((await r.GET()).status).toBe(401);
    expect((await r.POST(call("POST", VALID))).status).toBe(401);
    expect((await r.PATCH(call("PATCH", { id: ID, active: false }))).status).toBe(401);
    expect((await r.DELETE(call("DELETE", { id: ID }))).status).toBe(401);
    expect(w.spies.create).toHaveLength(0);
  });
});

describe("création", () => {
  test("crée le compte, le profil coach approuvé et la ligne coach_accounts, puis journalise", async () => {
    const { POST } = await import("./route");
    const res = await POST(call("POST", VALID));
    expect(res.status).toBe(201);
    expect(w.tables.coach_accounts.get(ID)).toMatchObject({ email: "awa@x.fr", active: true });
    expect(w.tables.profiles.get(ID)).toMatchObject({ account_type: "coach", status: "approved" });
    expect(actions()).toEqual(["coach_created"]);
  });

  test("le profil est créé même si le déclencheur d'inscription n'en a pas créé (upsert)", async () => {
    const { POST } = await import("./route");
    expect(w.tables.profiles.size).toBe(0);
    await POST(call("POST", VALID));
    expect(w.tables.profiles.size).toBe(1);
  });

  test("valide les entrées : e-mail, mot de passe court, sans chiffre, nom trop long", async () => {
    const { POST } = await import("./route");
    for (const bad of [
      { ...VALID, email: "pas-un-mail" },
      { ...VALID, password: "court1" },
      { ...VALID, password: "uniquementdeslettres" },
      { ...VALID, password: "123456789012345" },
      { ...VALID, name: "x".repeat(101) },
    ]) expect((await POST(call("POST", bad))).status).toBe(400);
    expect(w.spies.create).toHaveLength(0);
  });

  test("adresse déjà utilisée : 409, rien n'est écrit", async () => {
    w.authCreateFails = true;
    const { POST } = await import("./route");
    expect((await POST(call("POST", VALID))).status).toBe(409);
    expect(w.tables.coach_accounts.size).toBe(0);
  });

  test("échec de coach_accounts : rollback du compte Auth", async () => {
    w.fail["coach_accounts:insert"] = true;
    const { POST } = await import("./route");
    expect((await POST(call("POST", VALID))).status).toBe(500);
    expect(w.spies.del).toEqual([ID]);
    expect(actions()).toEqual([]);
  });

  test("échec du profil : rollback complet (coach_accounts ET compte Auth)", async () => {
    w.fail["profiles:upsert"] = true;
    const { POST } = await import("./route");
    expect((await POST(call("POST", VALID))).status).toBe(500);
    expect(w.spies.del).toEqual([ID]);
    expect(w.tables.coach_accounts.size).toBe(0);
    expect(actions()).toEqual([]);
  });

  test("limitation de débit : 429, aucun compte créé", async () => {
    w.rateOk = false;
    const { POST } = await import("./route");
    expect((await POST(call("POST", VALID))).status).toBe(429);
    expect(w.spies.create).toHaveLength(0);
  });

  test("le mot de passe n'apparaît pas dans le journal ni dans la réponse", async () => {
    const { POST } = await import("./route");
    const res = await POST(call("POST", VALID));
    expect(JSON.stringify(await res.json())).not.toContain(VALID.password);
    expect(JSON.stringify(w.spies.audit)).not.toContain(VALID.password);
  });
});

describe("modification du nom", () => {
  test("met à jour coach_accounts, profiles et les métadonnées Auth, puis journalise", async () => {
    seedCoach();
    const { PATCH } = await import("./route");
    const res = await PATCH(call("PATCH", { id: ID, name: "  Nouveau nom " }));
    expect(res.status).toBe(200);
    expect(w.tables.coach_accounts.get(ID)?.display_name).toBe("Nouveau nom");
    expect(w.tables.profiles.get(ID)?.name).toBe("Nouveau nom");
    expect(w.spies.update).toHaveLength(1);
    expect(actions()).toEqual(["coach_updated"]);
  });

  test("nom vide ou trop long : 400", async () => {
    seedCoach();
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, name: "   " }))).status).toBe(400);
    expect((await PATCH(call("PATCH", { id: ID, name: "x".repeat(101) }))).status).toBe(400);
  });

  test("refuse une cible qui n'est pas un coach (membre)", async () => {
    w.tables.profiles.set(ID, { id: ID, status: "approved", account_type: "member" });
    w.tables.coach_accounts.set(ID, { user_id: ID, email: "m@x.fr", display_name: "M", active: true });
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, name: "Pirate" }))).status).toBe(404);
    expect(w.tables.profiles.get(ID)?.name).toBeUndefined();
  });

  test("échec du profil : le nom précédent est rétabli", async () => {
    seedCoach();
    w.fail["profiles:update"] = true;
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, name: "Autre" }))).status).toBe(500);
    expect(w.tables.coach_accounts.get(ID)?.display_name).toBe("Coach");
  });

  test("paramètres ambigus (nom ET statut, ou aucun) : 400", async () => {
    seedCoach();
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, name: "A", active: false }))).status).toBe(400);
    expect((await PATCH(call("PATCH", { id: ID }))).status).toBe(400);
    expect((await PATCH(call("PATCH", { id: "pas-un-uuid", active: false }))).status).toBe(400);
  });
});

describe("suspension et réactivation", () => {
  test("suspendre : coach_accounts inactif ET profil suspendu, journalisé", async () => {
    seedCoach();
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, active: false }))).status).toBe(200);
    expect(w.tables.coach_accounts.get(ID)?.active).toBe(false);
    expect(w.tables.profiles.get(ID)?.status).toBe("suspended");
    expect(actions()).toEqual(["coach_suspended"]);
  });

  test("réactiver : coach_accounts actif ET profil approuvé, journalisé", async () => {
    seedCoach({ active: false }, { id: ID, status: "suspended", account_type: "coach" });
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, active: true }))).status).toBe(200);
    expect(w.tables.coach_accounts.get(ID)?.active).toBe(true);
    expect(w.tables.profiles.get(ID)?.status).toBe("approved");
    expect(actions()).toEqual(["coach_reactivated"]);
  });

  test("échec du profil : retour à l'état initial, aucun état contradictoire", async () => {
    seedCoach();
    w.fail["profiles:update"] = true;
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, active: false }))).status).toBe(500);
    expect(w.tables.coach_accounts.get(ID)?.active).toBe(true);
    expect(actions()).toEqual([]);
  });

  test("profil absent : refus explicite (409) plutôt qu'un état partiel", async () => {
    seedCoach({}, null);
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, active: true }))).status).toBe(409);
  });
});

describe("réinitialisation du mot de passe", () => {
  test("génère un mot de passe conforme, le renvoie une fois, ne le journalise pas", async () => {
    seedCoach();
    const { POST } = await import("./route");
    const res = await POST(call("POST", { action: "reset_password", id: ID }));
    expect(res.status).toBe(200);
    const { password } = await res.json();
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[A-Za-z]/);
    expect(password).toMatch(/\d/);
    expect(w.spies.update).toEqual([{ id: ID, p: { password } }]);
    expect(actions()).toEqual(["coach_password_reset"]);
    expect(JSON.stringify(w.spies.audit)).not.toContain(password);
  });

  test("échec Auth : aucun mot de passe dans la réponse, aucune entrée de journal", async () => {
    seedCoach();
    w.authUpdateFails = true;
    const { POST } = await import("./route");
    const res = await POST(call("POST", { action: "reset_password", id: ID }));
    expect(res.status).toBe(500);
    expect(await res.json()).not.toHaveProperty("password");
    expect(actions()).toEqual([]);
  });

  test("refuse une cible qui n'est pas un coach", async () => {
    const { POST } = await import("./route");
    expect((await POST(call("POST", { action: "reset_password", id: ID }))).status).toBe(404);
    expect(w.spies.update).toHaveLength(0);
  });
});

describe("suppression", () => {
  test("supprime le compte, vérifie le nettoyage, journalise", async () => {
    seedCoach();
    const { DELETE } = await import("./route");
    expect((await DELETE(call("DELETE", { id: ID }))).status).toBe(200);
    expect(w.spies.del).toEqual([ID]);
    expect(w.tables.coach_accounts.size).toBe(0);
    expect(actions()).toEqual(["coach_deleted"]);
  });

  test("ne supprime jamais un membre ou un compte inconnu", async () => {
    w.tables.profiles.set(ID, { id: ID, status: "approved", account_type: "member" });
    w.tables.coach_accounts.set(ID, { user_id: ID, email: "m@x.fr", display_name: "M", active: true });
    const { DELETE } = await import("./route");
    expect((await DELETE(call("DELETE", { id: ID }))).status).toBe(404);
    w.tables.coach_accounts.clear(); w.tables.profiles.clear();
    expect((await DELETE(call("DELETE", { id: ID }))).status).toBe(404);
    expect(w.spies.del).toHaveLength(0);
  });

  test("échec Auth : 500, pas de journal de suppression", async () => {
    seedCoach();
    w.authDeleteFails = true;
    const { DELETE } = await import("./route");
    expect((await DELETE(call("DELETE", { id: ID }))).status).toBe(500);
    expect(actions()).toEqual([]);
  });
});

describe("liste", () => {
  test("renvoie les coachs (200)", async () => {
    seedCoach();
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).coaches).toHaveLength(1);
  });
});
