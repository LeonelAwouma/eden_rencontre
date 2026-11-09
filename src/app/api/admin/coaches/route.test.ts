import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const w = vi.hoisted(() => ({
  admin: true,
  rateOk: true,
  tables: {
    coach_accounts: new Map<string, Row>(), profiles: new Map<string, Row>(),
    coach_audit_logs: new Map<string, Row>(), admin_notifications: new Map<string, Row>(), coach_member_assignments: new Map<string, Row>(),
  } as Record<string, Map<string, Row>>,
  fail: {} as Record<string, boolean>, // "table:op" -> erreur simulée
  authCreateFails: false,
  authCreateError: null as null | Record<string, unknown>, // erreur Auth structurée (code, name, status, message)
  authCreateThrows: false, // createUser lève au lieu de retourner { error }
  adminInitThrows: false,  // getSupabaseAdmin() lève (variable d'environnement absente)
  authUpdateFails: false,
  authDeleteFails: false,
  rpcError: null as null | { code?: string; message: string }, // erreur de la fonction SQL = rollback complet
  assignmentsToEnd: 0,
  storage: { files: new Set<string>(), uploadFails: false, removed: [] as string[] },
  spies: { create: [] as unknown[], update: [] as unknown[], del: [] as string[], audit: [] as unknown[][], rpc: [] as { fn: string; args: Record<string, unknown> }[] },
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr", role: "admin" }; },
  logAdminAction: async (...args: unknown[]) => { w.spies.audit.push(args); },
}));
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => w.rateOk, recordRateLimit: async () => {} }));

const keyOf = (table: string) => (table === "coach_accounts" ? "user_id" : "id");

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    if (w.adminInitThrows) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    return {
    auth: {
      admin: {
        createUser: async (p: Record<string, unknown>) => {
          w.spies.create.push(p);
          if (w.authCreateThrows) throw new Error("fetch failed: ECONNRESET 10.0.0.5");
          if (w.authCreateError) return { data: { user: null }, error: w.authCreateError };
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
    storage: {
      from: () => ({
        upload: async (path: string) => {
          if (w.storage.uploadFails) return { data: null, error: { message: "boom" } };
          w.storage.files.add(path); return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://p.supabase.co/storage/v1/object/public/chat-images/${path}` } }),
        remove: async (paths: string[]) => { for (const p of paths) { w.storage.files.delete(p); w.storage.removed.push(p); } return { data: null, error: null }; },
      }),
    },
    // Fonction SQL transactionnelle : tout ou rien (w.rpcError = rollback, aucune table modifiée).
    rpc: async (fn: string, args: Record<string, unknown>) => {
      w.spies.rpc.push({ fn, args });
      if (w.rpcError) return { data: null, error: w.rpcError };
      if (fn === "coach_set_active") {
        const id = args.p_coach as string;
        const active = args.p_active as boolean;
        const account = w.tables.coach_accounts.get(id);
        const profile = w.tables.profiles.get(id);
        if (!account) return { data: null, error: { message: "coach_not_found" } };
        if (!profile || profile.account_type !== "coach") return { data: null, error: { message: "not_a_coach" } };
        account.active = active;
        profile.status = active ? "approved" : "suspended";
        return { data: { active, assignments_ended: active ? 0 : w.assignmentsToEnd }, error: null };
      }
      return { data: null, error: { message: "unknown_function" } };
    },
    from: (table: string) => {
      let op = "select";
      let payload: Row = {};
      const filters: Row = {};
      const inFilters: Record<string, unknown[]> = {};
      const q: Record<string, unknown> = {};
      const exec = () => {
        if (w.fail[`${table}:${op}`]) return { data: null, error: { code: "XX", message: "boom" } };
        const map = w.tables[table];
        const rows = [...map.values()].filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v)
          && Object.entries(inFilters).every(([k, vs]) => vs.includes(r[k])));
        if (op === "insert") { map.set(payload[keyOf(table)] as string, { ...payload }); return { data: null, error: null }; }
        if (op === "upsert") { const id = payload[keyOf(table)] as string; map.set(id, { ...(map.get(id) || {}), ...payload }); return { data: null, error: null }; }
        if (op === "update") { rows.forEach((r) => Object.assign(r, payload)); return { data: rows[0] ?? null, error: null }; }
        if (op === "delete") { rows.forEach((r) => map.delete(r[keyOf(table)] as string)); return { data: null, error: null }; }
        return { data: rows, error: null, count: rows.length };
      };
      let single = false;
      Object.assign(q, {
        select: () => q,
        order: () => q,
        eq: (c: string, v: unknown) => { filters[c] = v; return q; },
        in: (c: string, vs: unknown[]) => { inFilters[c] = vs; return q; },
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
  };
  },
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
  w.authCreateFails = false; w.authCreateError = null; w.authCreateThrows = false; w.adminInitThrows = false; w.authUpdateFails = false; w.authDeleteFails = false;
  w.rpcError = null; w.assignmentsToEnd = 0;
  w.storage.files.clear(); w.storage.uploadFails = false; w.storage.removed.length = 0;
  w.tables.coach_accounts.clear(); w.tables.profiles.clear();
  w.tables.coach_audit_logs.clear(); w.tables.admin_notifications.clear(); w.tables.coach_member_assignments.clear();
  w.spies.create.length = 0; w.spies.update.length = 0; w.spies.del.length = 0; w.spies.audit.length = 0; w.spies.rpc.length = 0;
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

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const multipart = (photo?: Blob, over: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, ...over })) f.append(k, v);
  if (photo) f.append("photo", photo, "p.png");
  return new NextRequest("http://x/api/admin/coaches", { method: "POST", body: f });
};

describe("photo du coach à la création", () => {
  test("avec photo : fichier déposé, avatar_url enregistré dans profiles, compte complet", async () => {
    const { POST } = await import("./route");
    const res = await POST(multipart(new Blob([PNG], { type: "image/png" })));
    expect(res.status).toBe(201);
    expect(w.storage.files.size).toBe(1);
    const path = [...w.storage.files][0];
    expect(path).toMatch(new RegExp(`^avatars/coach-${ID}-\\d+\\.png$`));
    expect(w.tables.profiles.get(ID)).toMatchObject({ account_type: "coach", status: "approved" });
    expect(String(w.tables.profiles.get(ID)?.avatar_url)).toContain(path);
    expect((await res.json()).avatar_url).toContain(path);
  });

  test("sans photo : création inchangée (multipart ou JSON), aucun fichier", async () => {
    const { POST } = await import("./route");
    expect((await POST(multipart())).status).toBe(201);
    expect(w.storage.files.size).toBe(0);
    expect(w.tables.profiles.get(ID)?.avatar_url).toBeUndefined();
  });

  test("image invalide (type réel) : refus 400 AVANT toute création de compte", async () => {
    const { POST } = await import("./route");
    const res = await POST(multipart(new Blob([new TextEncoder().encode("<?php echo 1;")], { type: "image/png" })));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("avatar_invalid_type");
    expect(w.spies.create).toHaveLength(0);
    expect(w.storage.files.size).toBe(0);
  });

  test("image trop lourde (> 3 Mo) : refus 413 sans compte", async () => {
    const { POST } = await import("./route");
    const big = new Uint8Array(3 * 1024 * 1024 + 1); big.set(PNG);
    const res = await POST(multipart(new Blob([big], { type: "image/png" })));
    expect(res.status).toBe(413);
    expect(w.spies.create).toHaveLength(0);
  });

  test("échec de l'envoi : compte annulé, aucun fichier orphelin", async () => {
    w.storage.uploadFails = true;
    const { POST } = await import("./route");
    const res = await POST(multipart(new Blob([PNG], { type: "image/png" })));
    expect(res.status).toBe(500);
    expect(w.tables.coach_accounts.size).toBe(0);
    expect(w.spies.del).toContain(ID);
    expect(w.storage.files.size).toBe(0);
  });

  test("échec de l'enregistrement de l'URL : fichier supprimé et compte annulé", async () => {
    w.fail["profiles:update"] = true;
    const { POST } = await import("./route");
    const res = await POST(multipart(new Blob([PNG], { type: "image/png" })));
    expect(res.status).toBe(500);
    expect(w.storage.files.size).toBe(0);
    expect(w.tables.coach_accounts.size).toBe(0);
  });

  test("la liste renvoie la photo de chaque coach", async () => {
    seedCoach({}, { id: ID, status: "approved", account_type: "coach", name: "Coach", avatar_url: "https://x/a.png" });
    const { GET } = await import("./route");
    const body = await (await GET()).json();
    expect(body.coaches[0].avatar_url).toBe("https://x/a.png");
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

  test("adresse déjà utilisée : 409 `email_exists`, rien n'est écrit", async () => {
    w.authCreateError = { code: "email_exists", name: "AuthApiError", status: 422, message: "A user with this email address has already been registered" };
    const { POST } = await import("./route");
    const res = await POST(call("POST", VALID));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("email_exists");
    expect(w.tables.coach_accounts.size).toBe(0);
    expect(w.tables.profiles.size).toBe(0);
  });

  describe("création : la cause réelle est visible (code stable + message sûr), jamais le message brut", () => {
    const CASES: [string, Record<string, unknown>, number, string][] = [
      ["email_exists", { code: "email_exists", name: "AuthApiError", status: 422 }, 409, "email_exists"],
      ["user_already_exists", { code: "user_already_exists", name: "AuthApiError", status: 422 }, 409, "email_exists"],
      ["weak_password", { code: "weak_password", name: "AuthApiError", status: 422 }, 422, "weak_password"],
      ["email_address_invalid", { code: "email_address_invalid", name: "AuthApiError", status: 400 }, 400, "invalid_email"],
      ["validation_failed (≠ adresse invalide)", { code: "validation_failed", name: "AuthApiError", status: 400 }, 400, "auth_validation_failed"],
      ["email_provider_disabled", { code: "email_provider_disabled", name: "AuthApiError", status: 422 }, 500, "email_provider_disabled"],
      ["bad_jwt", { code: "bad_jwt", name: "AuthApiError", status: 401 }, 500, "supabase_admin_auth_rejected"],
      ["no_authorization", { code: "no_authorization", name: "AuthApiError", status: 401 }, 500, "supabase_admin_auth_rejected"],
      ["not_admin", { code: "not_admin", name: "AuthApiError", status: 403 }, 500, "supabase_admin_auth_rejected"],
      ["401 sans code", { name: "AuthApiError", status: 401 }, 500, "supabase_admin_auth_rejected"],
      ["over_request_rate_limit", { code: "over_request_rate_limit", name: "AuthApiError", status: 429 }, 429, "auth_rate_limited"],
      ["unexpected_failure", { code: "unexpected_failure", name: "AuthApiError", status: 500 }, 502, "auth_internal_error"],
      ["erreur réseau (AuthRetryableFetchError)", { name: "AuthRetryableFetchError", status: 0 }, 502, "auth_internal_error"],
      ["502 sans code", { name: "AuthApiError", status: 502 }, 502, "auth_internal_error"],
      ["code inconnu", { code: "quelque_chose_de_nouveau", name: "AuthApiError", status: 422 }, 502, "auth_create_failed"],
      ["erreur sans aucun champ", {}, 502, "auth_create_failed"],
    ];

    test.each(CASES)("%s", async (_label, authError, httpStatus, apiCode) => {
      w.authCreateError = { ...authError, message: "MESSAGE-BRUT-SECRET awa@x.fr motdepasse123 eyJhbGciOi.service.key" };
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { POST } = await import("./route");
      const res = await POST(call("POST", VALID));
      const body = await res.json();
      expect(res.status).toBe(httpStatus);
      expect(body.code).toBe(apiCode);
      expect(body.error).toEqual(expect.any(String));
      // Rien de brut dans la réponse ni dans les journaux : message de Supabase, mot de passe, adresse, clé.
      const out = JSON.stringify(body) + JSON.stringify(spy.mock.calls);
      for (const secret of ["MESSAGE-BRUT-SECRET", "motdepasse123", "awa@x.fr", "eyJhbGciOi", "service.key"]) expect(out.toLowerCase()).not.toContain(secret.toLowerCase());
      // Le journal garde le diagnostic assaini (code, nom, statut, code API).
      const logged = spy.mock.calls.find((c) => String(c[0]).includes("[admin/coaches] createUser refusé"));
      expect(logged![1]).toMatchObject({ apiCode });
      expect(Object.keys(logged![1] as object).sort()).toEqual(["apiCode", "code", "name", "status"]);
      // Aucune écriture partielle.
      expect(w.tables.coach_accounts.size).toBe(0);
      expect(w.tables.profiles.size).toBe(0);
      expect(w.spies.del).toHaveLength(0);
      expect(w.spies.audit).toHaveLength(0);
      spy.mockRestore();
    });

    test("le 409 est réservé aux vrais conflits : aucun autre cas ne le renvoie", async () => {
      for (const [, authError, , apiCode] of CASES) {
        if (apiCode === "email_exists") continue;
        w.authCreateError = authError;
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { POST } = await import("./route");
        expect((await POST(call("POST", VALID))).status).not.toBe(409);
        spy.mockRestore();
      }
    });

    test("createUser LÈVE une exception (réseau) : 502 auth_internal_error, sans trace ni détail", async () => {
      w.authCreateThrows = true;
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { POST } = await import("./route");
      const res = await POST(call("POST", VALID));
      const body = await res.json();
      expect(res.status).toBe(502);
      expect(body.code).toBe("auth_internal_error");
      expect(JSON.stringify(body) + JSON.stringify(spy.mock.calls)).not.toMatch(/ECONNRESET|10\.0\.0\.5|fetch failed|at \w+ \(/);
      expect(w.tables.coach_accounts.size).toBe(0);
      spy.mockRestore();
    });

    test("getSupabaseAdmin() lève (variable d'environnement absente) : 500 server_misconfigured, aucune variable ni valeur exposée", async () => {
      w.adminInitThrows = true;
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { POST } = await import("./route");
      const res = await POST(call("POST", VALID));
      const body = await res.json();
      expect(res.status).toBe(500);
      expect(body.code).toBe("server_misconfigured");
      expect(JSON.stringify(body) + JSON.stringify(spy.mock.calls)).not.toMatch(/SUPABASE_URL|SERVICE_ROLE|Missing/);
      expect(w.spies.create).toHaveLength(0);
      spy.mockRestore();
    });

    test("aucun compte membre existant n'est promu ni écrasé : l'échec d'adresse déjà utilisée ne touche à aucune table", async () => {
      w.tables.profiles.set("22222222-2222-4222-8222-222222222222", { id: "22222222-2222-4222-8222-222222222222", account_type: "member", status: "approved", email: "awa@x.fr" });
      w.authCreateError = { code: "email_exists", name: "AuthApiError", status: 422 };
      const { POST } = await import("./route");
      expect((await POST(call("POST", VALID))).status).toBe(409);
      expect(w.tables.profiles.get("22222222-2222-4222-8222-222222222222")).toMatchObject({ account_type: "member", status: "approved" });
      expect(w.tables.coach_accounts.size).toBe(0);
    });
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

  test("la désactivation passe par la fonction transactionnelle coach_set_active", async () => {
    seedCoach();
    const { PATCH } = await import("./route");
    await PATCH(call("PATCH", { id: ID, active: false }));
    expect(w.spies.rpc).toEqual([{ fn: "coach_set_active", args: { p_coach: ID, p_active: false, p_admin: "admin@x.fr" } }]);
  });

  test("erreur en base : rollback complet, aucun état contradictoire, aucun journal, sessions intactes", async () => {
    seedCoach();
    w.rpcError = { code: "XX000", message: "boom" };
    const { PATCH } = await import("./route");
    expect((await PATCH(call("PATCH", { id: ID, active: false }))).status).toBe(500);
    expect(w.tables.coach_accounts.get(ID)?.active).toBe(true);
    expect(w.tables.profiles.get(ID)?.status).toBe("approved");
    expect(actions()).toEqual([]);
    expect(w.spies.update).toEqual([]); // aucune révocation de session tentée avant le succès de la transaction
  });

  test("désactivation : les attributions actives sont terminées et le nombre est renvoyé", async () => {
    seedCoach();
    w.assignmentsToEnd = 3;
    const { PATCH } = await import("./route");
    const res = await PATCH(call("PATCH", { id: ID, active: false }));
    expect((await res.json()).assignments_ended).toBe(3);
  });

  test("désactivation : les sessions sont révoquées APRÈS la transaction (blocage du compte)", async () => {
    seedCoach();
    const { PATCH } = await import("./route");
    await PATCH(call("PATCH", { id: ID, active: false }));
    expect(w.spies.update).toEqual([{ id: ID, p: { ban_duration: "876000h" } }]);
  });

  test("échec de révocation des sessions : l'accès n'est JAMAIS rétabli, l'échec est journalisé et signalé", async () => {
    seedCoach();
    w.authUpdateFails = true;
    const { PATCH } = await import("./route");
    const res = await PATCH(call("PATCH", { id: ID, active: false }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.warning).toBe("sessions_not_revoked");
    expect(w.tables.coach_accounts.get(ID)?.active).toBe(false);
    expect(w.tables.profiles.get(ID)?.status).toBe("suspended");
    expect([...w.tables.coach_audit_logs.values()].map((r) => r.action)).toEqual(["signout_failed"]);
    expect([...w.tables.admin_notifications.values()][0]?.metadata).toMatchObject({ kind: "coach_session_revocation_failed", user_id: ID });
    expect(w.spies.update).toHaveLength(3); // 3 tentatives
  });

  test("réactivation : le blocage de session est levé", async () => {
    seedCoach({ active: false }, { id: ID, status: "suspended", account_type: "coach" });
    const { PATCH } = await import("./route");
    await PATCH(call("PATCH", { id: ID, active: true }));
    expect(w.spies.update).toEqual([{ id: ID, p: { ban_duration: "none" } }]);
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

  test("un coach qui a un historique d'accompagnements n'est PAS supprimé (409) : on le suspend à la place", async () => {
    seedCoach();
    w.tables.coach_member_assignments.set("a1", { id: "a1", coach_id: ID, member_id: "22222222-2222-4222-8222-222222222222", status: "ended" });
    const { DELETE } = await import("./route");
    const res = await DELETE(call("DELETE", { id: ID }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("coach_has_history");
    expect(w.spies.del).toEqual([]);
    expect(w.tables.coach_member_assignments.size).toBe(1);
  });

  test("lecture de l'historique impossible : suppression refusée (fail-closed)", async () => {
    seedCoach();
    w.fail["coach_member_assignments:select"] = true;
    const { DELETE } = await import("./route");
    expect((await DELETE(call("DELETE", { id: ID }))).status).toBe(500);
    expect(w.spies.del).toEqual([]);
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
