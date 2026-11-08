import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import {
  ACTIVITY_DTO_KEYS, FORMATION_ROW_KEYS, MEMBER_LIST_ITEM_KEYS, RECENT_MEMBER_DTO_KEYS,
} from "@/lib/coach/members-view";
import { COACH_MEMBER_SELECT } from "@/lib/coach/members-data";

/**
 * Routes `/api/coach/*` — vraie pile d'authentification (api-auth, coach-auth, access, loaders) contre un faux
 * client : seul l'ÉTAT des comptes et des affectations change d'un test à l'autre. Les profils de test contiennent
 * e-mail, téléphone, nom réel, questionnaire, selfie et photos : rien de tout cela ne doit jamais sortir.
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  rpc: undefined as undefined | ((fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }),
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as { table: string; op: string; columns: string; filters: [string, string, unknown][] }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
}));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});

const COACH = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH = "c0000000-0000-4000-8000-000000000002";
const M = (n: number) => `a${String(n).padStart(7, "0")}-0000-4000-8000-000000000000`;
const [M1, M2, M3, M4, M5, M6] = [M(1), M(2), M(3), M(4), M(5), M(6)];
const UNKNOWN = "b0000000-0000-4000-8000-0000000000ff";

type Caller = "coach_active" | "coach_suspended" | "coach_desync" | "member" | "anonymous";
const DENIED: Caller[] = ["coach_suspended", "coach_desync", "member", "anonymous"];

const FORBIDDEN_KEYS = ["email", "phone", "name", "first_name", "last_name", "questionnaire", "selfie_url", "profile_photos", "birth_date", "password"];
const SECRETS = ["secret-member@x.fr", "+237600000000", "Nom Réel Privé", "selfie-secret.jpg", "questionnaire-secret", "photo-secret"];

const memberProfile = (id: string, pseudo: string, over: Row = {}): Row => ({
  id, pseudo, avatar_url: null, country: "CM", city: "Douala", status: "approved", account_type: "member", formation_completed: [],
  email: "secret-member@x.fr", phone: "+237600000000", name: "Nom Réel Privé", first_name: "Nom", last_name: "Privé",
  questionnaire: { q: "questionnaire-secret" }, selfie_url: "selfie-secret.jpg", profile_photos: ["photo-secret"], birth_date: "1990-01-01", ...over,
});
const assignment = (id: string, member: string, over: Row = {}): Row => ({
  id, coach_id: COACH, member_id: member, status: "active", consent_status: "accepted",
  assigned_at: "2026-01-01T00:00:00Z", consent_at: "2026-02-01T00:00:00Z", ...over,
});

function seed(caller: Caller) {
  world.log.length = 0; world.rpcCalls.length = 0; world.failWhen = undefined;
  const coachRow = (active: boolean): Row => ({ user_id: COACH, email: "coach@x.fr", display_name: "Coach Awa", active, last_login_at: "2026-03-01T10:00:00Z" });
  const base: Record<string, Row[]> = {
    coach_accounts: [{ user_id: OTHER_COACH, email: "autre-coach@x.fr", display_name: "Autre Coach", active: true, last_login_at: "2026-03-02T10:00:00Z" }],
    profiles: [
      memberProfile(M1, "Awa", { formation_completed: [] }),
      memberProfile(M2, "SecretPending"), memberProfile(M3, "SecretDeclined"), memberProfile(M4, "SecretRevoked"),
      memberProfile(M5, "SecretEnded"), memberProfile(M6, "AutreCoachMember"),
      { id: OTHER_COACH, status: "approved", account_type: "coach", email: "autre-coach@x.fr", name: "Autre Coach" },
    ],
    coach_member_assignments: [
      assignment("as1", M1),
      assignment("as2", M2, { status: "pending", consent_status: "pending", consent_at: null }),
      assignment("as3", M3, { status: "declined", consent_status: "declined", ended_at: "2026-02-03T00:00:00Z" }),
      assignment("as4", M4, { status: "revoked", consent_status: "withdrawn", ended_at: "2026-02-04T00:00:00Z" }),
      assignment("as5", M5, { status: "ended", ended_at: "2026-02-05T00:00:00Z" }),
      assignment("as6", M6, { coach_id: OTHER_COACH }),
    ],
    coach_notifications: [],
    coach_audit_logs: [],
  };
  world.user = caller === "anonymous" ? null : { id: COACH, email: "coach@x.fr" };
  if (caller === "coach_active") { base.coach_accounts.push(coachRow(true)); base.profiles.push({ id: COACH, status: "approved", account_type: "coach", email: "coach@x.fr", name: "Coach Awa" }); }
  if (caller === "coach_suspended") { base.coach_accounts.push(coachRow(false)); base.profiles.push({ id: COACH, status: "suspended", account_type: "coach", email: "coach@x.fr", name: "Coach Awa" }); }
  if (caller === "coach_desync") { base.coach_accounts.push(coachRow(false)); base.profiles.push({ id: COACH, status: "approved", account_type: "coach", email: "coach@x.fr", name: "Coach Awa" }); }
  if (caller === "member") base.profiles.push({ id: COACH, status: "approved", account_type: "member", email: "m@x.fr", name: "Un Membre" });
  world.tables = base;

  // Équivalent de la fonction SQL coach_can_access_member.
  world.rpc = (fn, args) => {
    if (fn !== "coach_can_access_member") return { data: null, error: { message: "rpc inconnue" } };
    const t = world.tables;
    const ok =
      t.coach_member_assignments.some((r) => r.coach_id === args.p_coach && r.member_id === args.p_member && r.status === "active" && r.consent_status === "accepted") &&
      t.coach_accounts.some((r) => r.user_id === args.p_coach && r.active === true) &&
      t.profiles.some((r) => r.id === args.p_coach && r.account_type === "coach" && r.status === "approved") &&
      t.profiles.some((r) => r.id === args.p_member && r.account_type === "member" && r.status === "approved");
    return { data: ok, error: null };
  };
}

const req = (path: string) => new NextRequest(`http://x${path}`, { headers: { authorization: "Bearer jeton-de-test" } });
type Handler = (path: string) => Promise<Response>;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const routes: Record<string, Handler> = {
  dashboard: async (p) => (await import("./dashboard/route")).GET(req(p)),
  members: async (p) => (await import("./members/route")).GET(req(p)),
  formation: async (p) => (await import("./formation/route")).GET(req(p)),
  profile: async (p) => (await import("./profile/route")).GET(req(p)),
  notifications: async (p) => (await import("./notifications/route")).GET(req(p)),
  detail: async (p) => (await import("./members/[id]/route")).GET(req(p), ctx(decodeURIComponent(p.split("?")[0].split("/").pop() ?? ""))),
};
const PATHS: Record<string, string> = {
  dashboard: "/api/coach/dashboard", members: "/api/coach/members", formation: "/api/coach/formation",
  profile: "/api/coach/profile", notifications: "/api/coach/notifications", detail: `/api/coach/members/${M1}`,
};
const call = (name: string, path = PATHS[name]) => routes[name](path);
const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;
const NO_STORE = "private, no-store";

beforeEach(() => seed("coach_active"));

describe("autorisation : seul un coach ACTIF entre", () => {
  for (const name of Object.keys(routes)) {
    it.each(DENIED)(`${name} : %s → 403, aucune donnée de membre lue ni renvoyée`, async (caller) => {
      seed(caller);
      const res = await call(name);
      expect(res.status).toBe(403);
      expect(res.headers.get("cache-control")).toBe(NO_STORE);
      const text = JSON.stringify(await json(res));
      for (const secret of [...SECRETS, "Awa", "SecretPending"]) expect(text).not.toContain(secret);
      // Aucune lecture des affectations, des profils de membres ni des notifications avant le refus.
      expect(world.log.some((q) => q.table === "coach_member_assignments")).toBe(false);
      expect(world.log.some((q) => q.table === "coach_notifications")).toBe(false);
      expect(world.log.some((q) => q.table === "profiles" && q.columns.includes("formation_completed"))).toBe(false);
      expect(world.rpcCalls).toEqual([]);
    });
  }

  it("un coach actif dont le profil est approuvé mais coach_accounts inactif (désynchronisé) est refusé partout", async () => {
    seed("coach_desync");
    for (const name of Object.keys(routes)) expect((await call(name)).status, name).toBe(403);
  });
});

describe("visibilité des membres", () => {
  it("coach actif sans aucune attribution : liste vide, tableau de bord à zéro, fiche introuvable", async () => {
    world.tables.coach_member_assignments = [];
    const list = await json(await call("members"));
    expect(list).toMatchObject({ members: [], totalMatching: 0, activeMembers: 0, loadedMembers: 0, truncated: false });
    const dash = await json(await call("dashboard"));
    expect(dash).toMatchObject({ activeMembers: 0, pendingProposals: 0, formationCompleted: 0, formationInProgress: 0, recentMembers: [] });
    expect((await call("detail")).status).toBe(404);
    expect(await json(await call("formation"))).toMatchObject({ rows: [], pillars: [] });
  });

  it("seul le membre actif ET consenti de CE coach est visible (pending, declined, revoked, ended et autre coach : jamais)", async () => {
    const list = await json(await call("members"));
    expect((list.members as Row[]).map((m) => m.id)).toEqual([M1]);
    const text = JSON.stringify([list, await json(await call("dashboard")), await json(await call("formation"))]);
    for (const hidden of ["SecretPending", "SecretDeclined", "SecretRevoked", "SecretEnded", "AutreCoachMember", M2, M3, M4, M5, M6]) {
      expect(text, hidden).not.toContain(hidden);
    }
  });

  it("proposition « pending » : le coach n'en reçoit que le NOMBRE, aucune identité", async () => {
    const dash = await json(await call("dashboard"));
    expect(dash.pendingProposals).toBe(1);
    expect(JSON.stringify(dash)).not.toMatch(/SecretPending|a0000002/);
  });

  it.each([
    ["pending", M2], ["declined", M3], ["revoked", M4], ["ended", M5], ["autre coach", M6],
  ])("fiche d'un membre %s : 404", async (_label, id) => {
    const res = await call("detail", `/api/coach/members/${id}`);
    expect(res.status).toBe(404);
  });

  it("le 404 d'un membre non autorisé est IDENTIQUE à celui d'un identifiant inexistant (aucune fuite d'existence)", async () => {
    const unauthorized = await call("detail", `/api/coach/members/${M6}`);
    const missing = await call("detail", `/api/coach/members/${UNKNOWN}`);
    expect(unauthorized.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await json(unauthorized)).toEqual(await json(missing));
  });

  it("la fiche est soumise à la fonction SQL coach_can_access_member (identifiants de la session, jamais du client)", async () => {
    expect((await call("detail")).status).toBe(200);
    expect(world.rpcCalls).toEqual([{ fn: "coach_can_access_member", args: { p_coach: COACH, p_member: M1 } }]);
  });

  it("si la fonction SQL refuse, la fiche est refusée (404) même quand les lignes semblent conformes : elle fait autorité", async () => {
    world.rpc = () => ({ data: false, error: null });
    const res = await call("detail");
    expect(res.status).toBe(404);
    expect(JSON.stringify(await json(res))).not.toContain("Awa");
    expect(world.tables.coach_audit_logs).toEqual([]);
  });

  it.each([
    ["erreur de la fonction", () => ({ data: null, error: { message: "boom" } })],
    ["réponse inattendue (null)", () => ({ data: null, error: null })],
    ["réponse inattendue (chaîne « true »)", () => ({ data: "true", error: null })],
    ["réponse inattendue (1)", () => ({ data: 1, error: null })],
  ])("fiche : %s → refus (fail-closed), aucune donnée ni audit", async (_label, rpc) => {
    world.rpc = rpc as never;
    const res = await call("detail");
    expect(res.status).toBe(404);
    expect(world.tables.coach_audit_logs).toEqual([]);
    expect(world.log.some((q) => q.table === "profiles" && q.columns.includes("formation_completed"))).toBe(false);
  });

  it("retrait du consentement : le membre disparaît IMMÉDIATEMENT de la liste, du tableau de bord et de la fiche", async () => {
    expect(((await json(await call("members"))).members as Row[]).length).toBe(1);
    expect((await call("detail")).status).toBe(200);

    Object.assign(world.tables.coach_member_assignments[0], { status: "revoked", consent_status: "withdrawn", ended_at: "2026-03-01T00:00:00Z" });

    expect((await json(await call("members"))).members).toEqual([]);
    expect(await json(await call("dashboard"))).toMatchObject({ activeMembers: 0, recentMembers: [] });
    expect((await call("detail")).status).toBe(404);
  });

  it("fin d'attribution : même effet immédiat", async () => {
    Object.assign(world.tables.coach_member_assignments[0], { status: "ended", ended_at: "2026-03-01T00:00:00Z" });
    expect((await json(await call("members"))).members).toEqual([]);
    expect((await call("detail")).status).toBe(404);
  });

  it("membre suspendu depuis : il n'est plus visible (profil non approuvé)", async () => {
    Object.assign(world.tables.profiles.find((p) => p.id === M1)!, { status: "suspended" });
    expect((await json(await call("members"))).members).toEqual([]);
    expect((await call("detail")).status).toBe(404);
  });
});

describe("confidentialité : par type de réponse, à n'importe quelle profondeur", () => {
  const assertNoLeak = (value: unknown) => {
    const keys = deepKeysOf(value);
    for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), `clé interdite « ${forbidden} »`).toBe(false);
    const text = JSON.stringify(value);
    for (const secret of SECRETS) expect(text, secret).not.toContain(secret);
  };
  function deepKeysOf(v: unknown, acc = new Set<string>()): Set<string> {
    if (Array.isArray(v)) v.forEach((x) => deepKeysOf(x, acc));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { acc.add(k); deepKeysOf(x, acc); }
    return acc;
  }

  it("liste des membres : ensemble de clés exactement égal à la liste blanche", async () => {
    const body = await json(await call("members"));
    assertNoLeak(body);
    for (const m of body.members as Row[]) expect(Object.keys(m).sort()).toEqual([...MEMBER_LIST_ITEM_KEYS].sort());
  });

  it("fiche d'un membre : identité limitée à pseudo, avatar, pays, ville", async () => {
    const body = await json(await call("detail"));
    assertNoLeak(body);
    expect(Object.keys(body.member as Row).sort()).toEqual(["avatarUrl", "city", "country", "id", "pseudo"]);
    expect(Object.keys(body.assignment as Row).sort()).toEqual(["assignedAt", "consentAt", "consentStatus", "status"]);
    expect(body.unavailable).toEqual(["quiz", "reflections", "readingPositions"]);
  });

  it("tableau de bord : derniers membres limités à 4 champs, activité à 4 champs", async () => {
    world.tables.coach_notifications = [{ id: "n1", recipient_id: COACH, kind: "assignment_accepted", title: "Awa a accepté", body: "x", link: "/l", created_at: "2026-03-01T00:00:00Z", read_at: null }];
    const body = await json(await call("dashboard"));
    assertNoLeak(body);
    for (const m of body.recentMembers as Row[]) expect(Object.keys(m).sort()).toEqual([...RECENT_MEMBER_DTO_KEYS].sort());
    for (const a of body.recentActivity as Row[]) expect(Object.keys(a).sort()).toEqual([...ACTIVITY_DTO_KEYS].sort());
  });

  it("page Formation : lignes limitées à la liste blanche", async () => {
    const body = await json(await call("formation"));
    assertNoLeak(body);
    for (const r of body.rows as Row[]) expect(Object.keys(r).sort()).toEqual([...FORMATION_ROW_KEYS].sort());
  });

  it("toutes les lectures de profils demandent exactement la liste blanche (jamais « * »)", async () => {
    await call("members"); await call("dashboard"); await call("formation"); await call("detail");
    const reads = world.log.filter((q) => q.table === "profiles" && q.columns.includes("formation_completed"));
    expect(reads.length).toBeGreaterThanOrEqual(4);
    for (const q of reads) { expect(q.columns).toBe(COACH_MEMBER_SELECT); expect(q.columns).not.toContain("*"); }
    for (const q of world.log.filter((x) => x.op === "select")) expect(q.columns.trim(), `${q.table}`).not.toBe("*");
  });
});

describe("notifications du coach : DTO sûr, filtré par destinataire", () => {
  beforeEach(() => {
    world.tables.coach_notifications = [
      { id: "n1", recipient_id: COACH, kind: "assignment_accepted", title: "Awa a accepté", body: "texte libre secret-member@x.fr", link: "/coach/members/x", created_at: "2026-03-03T00:00:00Z", read_at: null },
      { id: "n2", recipient_id: COACH, kind: "<script>alert(1)</script>", title: "Titre piégé", body: "b", link: "/l", created_at: "2026-03-02T00:00:00Z", read_at: "2026-03-02T01:00:00Z" },
      { id: "n3", recipient_id: OTHER_COACH, kind: "assignment_accepted", title: "Pour un autre coach", body: "b", link: "/l", created_at: "2026-03-04T00:00:00Z", read_at: null },
      { id: "n4", recipient_id: M1, kind: "coach_assignment_proposed", title: "Pour un membre", body: "b", link: "/l", created_at: "2026-03-05T00:00:00Z", read_at: null },
    ];
  });

  it("exactement { id, kind, createdAt, read } ; ni titre, ni corps, ni lien, ni destinataire", async () => {
    const res = await call("notifications");
    const body = await json(res);
    const items = body.notifications as Row[];
    expect(items.map((n) => n.id)).toEqual(["n1", "n2"]);
    for (const n of items) expect(Object.keys(n).sort()).toEqual([...ACTIVITY_DTO_KEYS].sort());
    const text = JSON.stringify(body);
    for (const leaked of ["Awa a accepté", "Titre piégé", "secret-member@x.fr", "/coach/members/x", "recipient_id", "title", "body", "link", "<script>"]) {
      expect(text, leaked).not.toContain(leaked);
    }
  });

  it("kind inconnu → other ; lu/non lu ; compteur de non lues limité au coach", async () => {
    const body = await json(await call("notifications"));
    const items = body.notifications as { id: string; kind: string; read: boolean }[];
    expect(items.find((n) => n.id === "n2")).toMatchObject({ kind: "other", read: true });
    expect(items.find((n) => n.id === "n1")).toMatchObject({ kind: "assignment_accepted", read: false });
    expect(body.unread).toBe(1);
  });

  it("les colonnes title, body et link ne sont JAMAIS lues en base", async () => {
    await call("notifications"); await call("dashboard");
    for (const q of world.log.filter((x) => x.table === "coach_notifications")) {
      const cols = q.columns.split(",").map((c) => c.trim());
      for (const forbidden of ["title", "body", "link", "*"]) expect(cols, q.columns).not.toContain(forbidden);
      expect(q.filters).toEqual(expect.arrayContaining([["eq", "recipient_id", COACH]]));
    }
  });
});

describe("profil du coach connecté", () => {
  it("expose uniquement nom, e-mail et dernière connexion DU coach connecté", async () => {
    const res = await call("profile");
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body).toEqual({ name: "Coach Awa", email: "coach@x.fr", lastLoginAt: "2026-03-01T10:00:00Z" });
    expect(Object.keys(body).sort()).toEqual(["email", "lastLoginAt", "name"]);
    const text = JSON.stringify(body);
    expect(text).not.toContain("autre-coach@x.fr");
    expect(text).not.toContain("Autre Coach");
  });

  it("colonne last_login_at absente (migration 20261107 non passée) : repli null, l'e-mail n'est pas masqué", async () => {
    world.failWhen = (q) => (q.table === "coach_accounts" && q.columns === "last_login_at" ? { code: "42703", message: "column does not exist" } : null);
    const res = await call("profile");
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ name: "Coach Awa", email: "coach@x.fr", lastLoginAt: null });
  });

  it("toute autre erreur de lecture : 500 générique, sans détail", async () => {
    world.failWhen = (q) => (q.table === "coach_accounts" && q.columns === "last_login_at" ? { code: "XX000", message: "boom secret" } : null);
    const res = await call("profile");
    expect(res.status).toBe(500);
    expect(JSON.stringify(await json(res))).not.toContain("boom");
  });
});

describe("paramètres et pagination", () => {
  it("fiche : UUID invalide → 400", async () => {
    for (const bad of ["pas-un-uuid", "123", "'; drop table profiles; --", "../etc/passwd"]) {
      const res = await call("detail", `/api/coach/members/${encodeURIComponent(bad)}`);
      expect(res.status, bad).toBe(400);
    }
  });

  it("liste : q trop longue, state invalide, page invalide → 400 (aucune lecture de membres)", async () => {
    for (const qs of [`q=${"a".repeat(61)}`, "state=bogus", "page=0", "page=abc", "page=1.5", "page=99999999"]) {
      world.log.length = 0;
      const res = await call("members", `/api/coach/members?${qs}`);
      expect(res.status, qs).toBe(400);
      expect(res.headers.get("cache-control")).toBe(NO_STORE);
      expect(world.log.some((q) => q.table === "coach_member_assignments"), qs).toBe(false);
    }
  });

  it("30 membres : 12 par page, aucun doublon ni oubli, tri par pseudo", async () => {
    world.tables.coach_member_assignments = Array.from({ length: 30 }, (_, i) => assignment(`bulk${i}`, M(100 + i), { consent_at: `2026-02-01T00:00:${String(i).padStart(2, "0")}Z` }));
    world.tables.profiles = [
      ...world.tables.profiles.filter((p) => !String(p.id).startsWith("a0000")),
      ...Array.from({ length: 30 }, (_, i) => memberProfile(M(100 + i), `membre-${String(29 - i).padStart(2, "0")}`)),
    ];
    const pages = await Promise.all([1, 2, 3].map(async (p) => json(await call("members", `/api/coach/members?page=${p}`))));
    expect(pages.map((p) => (p.members as Row[]).length)).toEqual([12, 12, 6]);
    expect(pages[0]).toMatchObject({ totalPages: 3, totalMatching: 30, activeMembers: 30, truncated: false });
    const pseudos = pages.flatMap((p) => (p.members as { pseudo: string }[]).map((m) => m.pseudo));
    expect(new Set(pseudos).size).toBe(30);
    expect(pseudos).toEqual([...pseudos].sort());
  });

  it("recherche et filtre portent sur les membres chargés", async () => {
    world.tables.profiles.find((p) => p.id === M1)!.formation_completed = [];
    const none = await json(await call("members", "/api/coach/members?q=zzzz"));
    expect(none).toMatchObject({ members: [], totalMatching: 0, loadedMembers: 1 });
    const completed = await json(await call("members", "/api/coach/members?state=completed"));
    expect(completed).toMatchObject({ members: [], totalMatching: 0 });
    const notStarted = await json(await call("members", "/api/coach/members?state=notStarted"));
    expect((notStarted.members as Row[]).map((m) => m.id)).toEqual([M1]);
  });
});

describe("audit des consultations", () => {
  const rows = () => world.tables.coach_audit_logs;

  it("fiche autorisée : UNE entrée member_file_viewed, sans aucun contenu personnel", async () => {
    expect((await call("detail")).status).toBe(200);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ actor_id: COACH, actor_kind: "coach", action: "member_file_viewed", target_type: "member", target_id: M1 });
    expect(rows()[0].metadata).toEqual({});
    const text = JSON.stringify(rows());
    for (const secret of [...SECRETS, "Awa"]) expect(text).not.toContain(secret);
  });

  it("aucune entrée pour un accès refusé, une fiche introuvable, un identifiant invalide ou un appelant non autorisé", async () => {
    await call("detail", `/api/coach/members/${M6}`);
    await call("detail", `/api/coach/members/${M2}`);
    await call("detail", `/api/coach/members/${UNKNOWN}`);
    await call("detail", "/api/coach/members/pas-un-uuid");
    seed("coach_suspended"); await call("detail");
    seed("member"); await call("detail");
    expect(rows()).toEqual([]);
  });

  it("liste, tableau de bord et page Formation ne journalisent aucune consultation individuelle", async () => {
    await call("members"); await call("dashboard"); await call("formation");
    expect(rows()).toEqual([]);
  });

  it("n'écrit l'audit QU'APRÈS une lecture réussie : si la lecture échoue, aucune entrée", async () => {
    world.failWhen = (q) => (q.table === "profiles" && q.columns === COACH_MEMBER_SELECT ? { code: "XX000", message: "boom" } : null);
    expect((await call("detail")).status).toBe(500);
    expect(rows()).toEqual([]);
  });

  it("un échec d'écriture du journal ne bloque pas la consultation autorisée", async () => {
    world.failWhen = (q) => (q.table === "coach_audit_logs" ? { code: "XX000", message: "boom" } : null);
    expect((await call("detail")).status).toBe(200);
  });
});

describe("erreurs et en-têtes", () => {
  it("panne de lecture : 500 générique, aucune fuite du message interne ni de données", async () => {
    world.failWhen = (q) => (q.table === "coach_member_assignments" ? { code: "XX000", message: "boom secret table coach_member_assignments" } : null);
    for (const name of ["dashboard", "members", "formation", "detail"]) {
      const res = await call(name);
      expect(res.status, name).toBe(500);
      const text = JSON.stringify(await json(res));
      expect(text).toContain("Service momentanément indisponible.");
      expect(text).not.toMatch(/boom|secret|coach_member_assignments/);
    }
  });

  it("Cache-Control « private, no-store » sur chaque route, succès comme erreurs", async () => {
    for (const name of Object.keys(routes)) {
      expect((await call(name)).headers.get("cache-control"), `${name} 200`).toBe(NO_STORE);
    }
    expect((await call("detail", `/api/coach/members/${M6}`)).headers.get("cache-control")).toBe(NO_STORE);
    expect((await call("detail", "/api/coach/members/x")).headers.get("cache-control")).toBe(NO_STORE);
  });

  it("aucune route Coach n'accepte un identifiant de coach ou de membre fourni par le client pour élargir l'accès", async () => {
    // Même avec des paramètres hostiles, les données restent celles du coach de la session.
    const res = await call("members", `/api/coach/members?coach_id=${OTHER_COACH}&member_id=${M6}&q=`);
    expect(((await json(res)).members as Row[]).map((m) => m.id)).toEqual([M1]);
    const dash = await json(await call("dashboard", `/api/coach/dashboard?coach_id=${OTHER_COACH}`));
    expect(dash.activeMembers).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Correctifs d'audit P2-2 (exposition d'« orphans ») et P2-3 (titres localisés, progression déclarative)
// ═════════════════════════════════════════════════════════════════════════════════════════════
import { ALL_LESSONS, BATIR_SUR_LE_ROC } from "@/lib/formation/batir-sur-le-roc";
import { BATIR_SUR_LE_ROC_EN } from "@/lib/formation/batir-sur-le-roc.en";
import {
  COACH_FORMATION_CURRENT_KEYS, COACH_FORMATION_LESSON_KEYS, COACH_FORMATION_PILLAR_KEYS, COACH_FORMATION_SUMMARY_KEYS,
} from "@/lib/coach/members-view";

const MARKERS = ["PRIVATE_MARKER_MEMBER_001", "PRIVATE_MARKER_MEMBER_002", "PRIVATE_MARKER_MEMBER_003"];
const realSlug = ALL_LESSONS[0].lesson.slug;
const setM1Formation = (value: unknown) => { world.tables.profiles.find((p) => p.id === M1)!.formation_completed = value; };
const allDeepKeys = (v: unknown, acc = new Set<string>()): Set<string> => {
  if (Array.isArray(v)) v.forEach((x) => allDeepKeys(x, acc));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { acc.add(k); allDeepKeys(x, acc); }
  return acc;
};

type DetailSummary = {
  done: number; total: number; percent: number;
  pillars: { number: number; title: string; done: number; total: number; status: string; lessons: { slug: string; number: string; title: string; done: boolean }[] }[];
  current: { number: string; title: string; pillar: number } | null;
};
type DetailBody = { formation: { state: string; summary: DetailSummary | null } };

describe("P2-2 : le texte libre de formation_completed n'atteint JAMAIS le navigateur du coach", () => {
  beforeEach(() => setM1Formation([...MARKERS, realSlug]));

  it("la fiche ne contient aucun marqueur privé ni aucune clé « orphans »", async () => {
    const res = await call("detail");
    expect(res.status).toBe(200);
    const body = await json(res);
    const text = JSON.stringify(body);
    for (const marker of MARKERS) expect(text, marker).not.toContain(marker);
    expect(text).not.toContain("PRIVATE_MARKER");
    expect(allDeepKeys(body).has("orphans")).toBe(false);
    expect(text).not.toContain("orphans");
  });

  it("aucune autre réponse Coach (liste, tableau de bord, page Formation, notifications, profil) ne le contient non plus", async () => {
    for (const name of ["members", "dashboard", "formation", "notifications", "profile"]) {
      const text = JSON.stringify(await json(await call(name)));
      expect(text, name).not.toContain("PRIVATE_MARKER");
      expect(text, name).not.toContain("orphans");
    }
  });

  it("le résumé reste fonctionnel : progression, pourcentage, piliers, leçons et prochaine leçon sont présents", async () => {
    const body = (await json(await call("detail"))) as unknown as DetailBody;
    const s = body.formation.summary!;
    expect(body.formation.state).toBe("inProgress");
    expect(s.done).toBe(1); // la seule leçon connue ; les marqueurs ne comptent pas comme progression
    expect(s.total).toBe(ALL_LESSONS.length);
    expect(s.percent).toBe(Math.round((1 / ALL_LESSONS.length) * 100));
    expect(s.pillars.length).toBeGreaterThan(0);
    expect(s.pillars[0].lessons.find((l) => l.slug === realSlug)?.done).toBe(true);
    expect(s.current).not.toBeNull();
  });

  it("DTO EXACT à chaque niveau : racine, pilier, leçon, prochaine leçon", async () => {
    const s = ((await json(await call("detail"))) as unknown as DetailBody).formation.summary!;
    expect(Object.keys(s).sort()).toEqual([...COACH_FORMATION_SUMMARY_KEYS].sort());
    for (const p of s.pillars) {
      expect(Object.keys(p).sort()).toEqual([...COACH_FORMATION_PILLAR_KEYS].sort());
      for (const l of p.lessons) expect(Object.keys(l).sort()).toEqual([...COACH_FORMATION_LESSON_KEYS].sort());
    }
    expect(Object.keys(s.current!).sort()).toEqual([...COACH_FORMATION_CURRENT_KEYS].sort());
  });

  it("gros volume de données libres (20 000 entrées) : jamais sérialisées, taille de réponse indépendante du volume", async () => {
    setM1Formation([...Array.from({ length: 20_000 }, (_, i) => `PRIVATE_MARKER_VOLUME_${i}`), realSlug]);
    const res = await call("detail");
    expect(res.status).toBe(200);
    const text = JSON.stringify(await json(res));
    expect(text).not.toContain("PRIVATE_MARKER");
    expect(text.length).toBeLessThan(30_000);
    setM1Formation([realSlug]);
    const reference = JSON.stringify(await json(await call("detail"))).length;
    expect(Math.abs(text.length - reference)).toBeLessThan(5); // même taille qu'avec aucune donnée libre
  });

  it("texte libre hostile (HTML, e-mail, téléphone) : aucune trace dans la réponse", async () => {
    setM1Formation(["<img src=x onerror=alert(1)>", "jean.dupont@exemple.fr +237600000000", "x".repeat(5000), realSlug]);
    const text = JSON.stringify(await json(await call("detail")));
    for (const leaked of ["<img", "onerror", "jean.dupont", "+237600000000", "xxxxxxxxxx"]) expect(text, leaked).not.toContain(leaked);
  });

  it("les données d'origine ne sont ni modifiées ni supprimées en base", async () => {
    const before = JSON.stringify(world.tables.profiles.find((p) => p.id === M1)!.formation_completed);
    await call("detail"); await call("members"); await call("formation"); await call("dashboard");
    expect(JSON.stringify(world.tables.profiles.find((p) => p.id === M1)!.formation_completed)).toBe(before);
    expect(world.log.filter((q) => q.op !== "select" && q.table === "profiles")).toEqual([]);
  });

  it("l'autorisation et la décision de coach_can_access_member sont inchangées", async () => {
    await call("detail");
    expect(world.rpcCalls).toEqual([{ fn: "coach_can_access_member", args: { p_coach: COACH, p_member: M1 } }]);
    world.rpcCalls.length = 0;
    world.rpc = () => ({ data: false, error: null });
    const refused = await call("detail");
    expect(refused.status).toBe(404);
    expect(JSON.stringify(await json(refused))).not.toContain("PRIVATE_MARKER");
    expect((await call("detail", `/api/coach/members/${M6}`)).status).toBe(404); // membre non attribué : toujours introuvable
  });

  it("un coach suspendu ne reçoit rien (403), même avec des marqueurs en base", async () => {
    seed("coach_suspended");
    setM1Formation([...MARKERS, realSlug]);
    const res = await call("detail");
    expect(res.status).toBe(403);
    expect(JSON.stringify(await json(res))).not.toContain("PRIVATE_MARKER");
  });

  it("formation_completed non tableau : « indisponible », jamais de résumé fabriqué (comportement conservé)", async () => {
    setM1Formation({ PRIVATE_MARKER_MEMBER_001: true });
    const body = (await json(await call("detail"))) as unknown as DetailBody;
    expect(body.formation).toEqual({ state: "unavailable", summary: null });
    expect(JSON.stringify(body)).not.toContain("PRIVATE_MARKER");
  });
});

describe("P2-3 : titres de formation dans la langue active, structure identique", () => {
  const summaryOf = async (qs: string) => ((await json(await call("detail", `/api/coach/members/${M1}${qs}`))) as unknown as DetailBody).formation.summary!;
  const flat = (s: DetailSummary) => s.pillars.flatMap((p) => p.lessons.map((l) => `${p.number}|${l.slug}|${l.number}|${l.done}`));

  beforeEach(() => setM1Formation([realSlug]));

  it("en français : titres français (par défaut et avec lang=fr)", async () => {
    const byDefault = await summaryOf("");
    const fr = await summaryOf("?lang=fr");
    expect(fr).toEqual(byDefault);
    expect(fr.pillars[0].title).toBe(BATIR_SUR_LE_ROC.pillars[0].title);
    expect(fr.pillars[0].lessons[0].title).toBe(BATIR_SUR_LE_ROC.pillars[0].lessons[0].title);
    expect(fr.current!.title).toBeTruthy();
  });

  it("en anglais : titres de piliers, de leçons et de prochaine leçon en anglais", async () => {
    const en = await summaryOf("?lang=en");
    expect(en.pillars[0].title).toBe(BATIR_SUR_LE_ROC_EN.pillars[0].title);
    expect(en.pillars[0].lessons[0].title).toBe(BATIR_SUR_LE_ROC_EN.pillars[0].lessons[0].title);
    expect(en.pillars[0].title).not.toBe((await summaryOf("?lang=fr")).pillars[0].title);
    const nextEn = BATIR_SUR_LE_ROC_EN.pillars.flatMap((p) => p.lessons).find((l) => l.number === en.current!.number)!;
    expect(en.current!.title).toBe(nextEn.title);
  });

  it("identifiants, numéros, ordre, statuts et progression IDENTIQUES dans les deux langues", async () => {
    const fr = await summaryOf("?lang=fr");
    const en = await summaryOf("?lang=en");
    expect(flat(en)).toEqual(flat(fr));
    expect(en.pillars.map((p) => [p.number, p.status])).toEqual(fr.pillars.map((p) => [p.number, p.status]));
    expect([en.done, en.total, en.percent]).toEqual([fr.done, fr.total, fr.percent]);
    expect([en.current!.number, en.current!.pillar]).toEqual([fr.current!.number, fr.current!.pillar]);
  });

  it("chaque pilier et chaque leçon ont un titre anglais non vide, distinct du français", async () => {
    const fr = await summaryOf("?lang=fr");
    const en = await summaryOf("?lang=en");
    fr.pillars.forEach((p, i) => {
      expect(en.pillars[i].title.trim()).not.toBe("");
      expect(en.pillars[i].title).not.toBe(p.title);
      p.lessons.forEach((l, j) => {
        expect(en.pillars[i].lessons[j].title.trim()).not.toBe("");
        expect(en.pillars[i].lessons[j].title).not.toBe(l.title);
      });
    });
  });

  it("page Formation : titres de pilier et de prochaine leçon localisés, mêmes lignes et même progression", async () => {
    type Overview = { pillars: { number: number; title: string; membersDone: number }[]; rows: { id: string; percent: number | null; nextLesson: { number: string; title: string } | null }[] };
    const get = async (lang: string) => (await json(await call("formation", `/api/coach/formation?lang=${lang}`))) as unknown as Overview;
    const fr = await get("fr");
    const en = await get("en");
    expect(en.pillars.map((p) => [p.number, p.membersDone])).toEqual(fr.pillars.map((p) => [p.number, p.membersDone]));
    expect(en.pillars[0].title).toBe(BATIR_SUR_LE_ROC_EN.pillars[0].title);
    expect(fr.pillars[0].title).toBe(BATIR_SUR_LE_ROC.pillars[0].title);
    expect(en.rows.map((r) => [r.id, r.percent, r.nextLesson?.number])).toEqual(fr.rows.map((r) => [r.id, r.percent, r.nextLesson?.number]));
    expect(en.rows[0].nextLesson!.title).not.toBe(fr.rows[0].nextLesson!.title);
  });

  it.each(["de", "EN", "fr-FR", "en;drop", "../x", "<script>"])("langue invalide « %s » → 400 sur la fiche et sur la page Formation, sans lecture de membre", async (lang) => {
    world.log.length = 0;
    const d = await call("detail", `/api/coach/members/${M1}?lang=${encodeURIComponent(lang)}`);
    const f = await call("formation", `/api/coach/formation?lang=${encodeURIComponent(lang)}`);
    expect(d.status).toBe(400);
    expect(f.status).toBe(400);
    expect(d.headers.get("cache-control")).toBe(NO_STORE);
    expect(world.log.some((q) => q.table === "coach_member_assignments")).toBe(false);
  });

  it("la langue ne change ni l'autorisation ni la confidentialité (membre non attribué : 404 dans les deux langues)", async () => {
    for (const lang of ["fr", "en"]) expect((await call("detail", `/api/coach/members/${M6}?lang=${lang}`)).status).toBe(404);
    expect(allDeepKeys(await json(await call("detail", `/api/coach/members/${M1}?lang=en`))).has("orphans")).toBe(false);
  });
});
