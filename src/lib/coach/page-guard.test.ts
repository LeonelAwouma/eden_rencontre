import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import {
  COACH_INACTIVE_REDIRECT, COACH_LOGIN_REDIRECT, COACH_MEMBER_REDIRECT, resolveCoachPageAccess,
} from "./page-guard";

/**
 * Garde SERVEUR des pages `/coach` : la décision est prise à partir des cookies reçus et de la base — jamais d'une
 * valeur envoyée par le navigateur. Vraie pile d'authentification du lot 1 (api-auth, coach-auth, guard) contre un faux client.
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  rpc: undefined,
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as unknown[],
  rpcCalls: [] as unknown[],
  authAdminCalls: [] as string[],
}));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});
// Même rôle que le vrai `redirect` de Next : lève une exception, aucune ligne suivante ne s'exécute.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { to }); },
}));

const U = "c0000000-0000-4000-8000-000000000001";
type Kind =
  | "coach_active" | "coach_suspended" | "coach_disabled_account" | "coach_profile_suspended"
  | "coach_account_on_member" | "member" | "member_pending" | "member_suspended" | "no_profile";

function seed(kind: Kind, opts: { cookie?: boolean } = {}) {
  world.failWhen = undefined; world.log.length = 0; world.authAdminCalls.length = 0;
  const account = (active: boolean): Row => ({ user_id: U, email: "coach@x.fr", display_name: "Coach Awa", active });
  const profile = (status: string, account_type: string): Row => ({ id: U, status, account_type, email: "coach@x.fr", name: "Coach Awa" });
  const rows: Record<Kind, { accounts: Row[]; profiles: Row[] }> = {
    coach_active: { accounts: [account(true)], profiles: [profile("approved", "coach")] },
    coach_suspended: { accounts: [account(false)], profiles: [profile("suspended", "coach")] },
    // Désynchronisations entre coach_accounts et profiles : refusées dans les deux sens.
    coach_disabled_account: { accounts: [account(false)], profiles: [profile("approved", "coach")] },
    coach_profile_suspended: { accounts: [account(true)], profiles: [profile("suspended", "coach")] },
    coach_account_on_member: { accounts: [account(true)], profiles: [profile("approved", "member")] },
    member: { accounts: [], profiles: [profile("approved", "member")] },
    member_pending: { accounts: [], profiles: [profile("pending", "member")] },
    member_suspended: { accounts: [], profiles: [profile("suspended", "member")] },
    no_profile: { accounts: [], profiles: [] },
  };
  world.tables = { coach_accounts: rows[kind].accounts, profiles: rows[kind].profiles, coach_member_assignments: [] };
  world.user = opts.cookie === false ? null : { id: U, email: "coach@x.fr" };
}

const withCookie = (token = "jeton-de-test") => new NextRequest("http://localhost/coach", { headers: { cookie: `sb-access-token=${token}` } });
const noCookie = () => new NextRequest("http://localhost/coach");
const snapshot = () => JSON.stringify(world.tables);

beforeEach(() => seed("coach_active"));

describe("resolveCoachPageAccess : décision serveur par profil", () => {
  it("utilisateur non connecté (aucun cookie) → /login, sans lire la base", async () => {
    seed("coach_active", { cookie: false });
    const r = await resolveCoachPageAccess(noCookie());
    expect(r).toEqual({ decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "anonymous" });
    expect(world.log).toEqual([]); // aucune lecture : sans jeton, rien à vérifier
  });

  it("cookie présent mais jeton invalide ou expiré → /login (un cookie seul ne prouve rien)", async () => {
    seed("coach_active", { cookie: false }); // le service d'authentification ne reconnaît pas le jeton
    const r = await resolveCoachPageAccess(withCookie("jeton-expire"));
    expect(r).toEqual({ decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "anonymous" });
  });

  it("coach actif → accès, avec son identité lue en base", async () => {
    const r = await resolveCoachPageAccess(withCookie());
    expect(r).toEqual({ decision: "allow", coach: { id: U, email: "coach@x.fr", name: "Coach Awa" } });
  });

  it("membre approuvé → /dashboard (motif « member »), sans « blocked » : aucun message de suspension", async () => {
    seed("member");
    const r = await resolveCoachPageAccess(withCookie());
    expect(r).toEqual({ decision: "redirect", to: COACH_MEMBER_REDIRECT, reason: "member" });
    expect(COACH_MEMBER_REDIRECT).toBe("/dashboard");
    expect(JSON.stringify(r)).not.toMatch(/blocked|suspend/i);
  });

  it.each(["coach_suspended", "coach_disabled_account", "coach_profile_suspended"] as const)(
    "%s → refusé, message de suspension (compte coach inactif ou désynchronisé)", async (kind) => {
      seed(kind);
      const r = await resolveCoachPageAccess(withCookie());
      expect(r).toEqual({ decision: "redirect", to: COACH_INACTIVE_REDIRECT, reason: "inactive_coach" });
      expect(r.decision).not.toBe("allow");
    });

  it("ligne coach_accounts parasite sur un profil de type « membre » : jamais coach, traité comme membre", async () => {
    seed("coach_account_on_member");
    const r = await resolveCoachPageAccess(withCookie());
    expect(r).toMatchObject({ decision: "redirect", to: COACH_MEMBER_REDIRECT, reason: "member" });
  });

  it.each(["member_pending", "member_suspended", "no_profile"] as const)(
    "%s → /login (l'espace membre décidera), jamais d'accès ni de message de suspension coach", async (kind) => {
      seed(kind);
      const r = await resolveCoachPageAccess(withCookie());
      expect(r).toEqual({ decision: "redirect", to: COACH_LOGIN_REDIRECT, reason: "other" });
    });

  it("le motif vient de la BASE, jamais du navigateur : aucun en-tête de rôle n'influence la décision", async () => {
    seed("member");
    const req = new NextRequest("http://localhost/coach?role=coach&coach=1", {
      headers: { cookie: "sb-access-token=jeton; role=coach; eden-role=coach", "x-role": "coach", "x-coach": "true", "x-user-role": "coach" },
    });
    expect(await resolveCoachPageAccess(req)).toMatchObject({ decision: "redirect", reason: "member" });
  });
});

describe("pannes : jamais d'accès par défaut, jamais de déconnexion", () => {
  it("lecture de coach_accounts impossible → « unavailable » (pas d'accès, pas de redirection trompeuse)", async () => {
    world.failWhen = (q) => (q.table === "coach_accounts" ? { code: "XX000", message: "boom" } : null);
    expect(await resolveCoachPageAccess(withCookie())).toEqual({ decision: "unavailable" });
  });

  it("lecture de profiles impossible → « unavailable »", async () => {
    world.failWhen = (q) => (q.table === "profiles" ? { code: "XX000", message: "boom" } : null);
    expect(await resolveCoachPageAccess(withCookie())).toEqual({ decision: "unavailable" });
  });

  it("une panne ne devient jamais un refus de rôle : un membre n'est pas renvoyé « suspendu » à cause d'une panne", async () => {
    seed("member");
    world.failWhen = (q) => (q.table === "profiles" ? { code: "XX000", message: "boom" } : null);
    const r = await resolveCoachPageAccess(withCookie());
    expect(r.decision).toBe("unavailable");
  });
});

describe("la session du membre est conservée", () => {
  it("la garde ne déconnecte, ne bloque et ne modifie rien (aucun appel d'administration d'Auth, base inchangée)", async () => {
    seed("member");
    const before = snapshot();
    await resolveCoachPageAccess(withCookie());
    expect(world.authAdminCalls).toEqual([]);
    expect(snapshot()).toBe(before);
    expect(world.log.every((q) => (q as { op: string }).op === "select")).toBe(true); // lectures seules
  });

  it("après la redirection, la même session fonctionne encore sur les routes membre (/dashboard)", async () => {
    seed("member");
    expect((await resolveCoachPageAccess(withCookie())).decision).toBe("redirect");

    const { GET } = await import("@/app/api/member/coach/route");
    const res = await GET(new NextRequest("http://localhost/api/member/coach", { headers: { cookie: "sb-access-token=jeton-de-test" } }));
    expect(res.status).toBe(200); // le membre reste authentifié : session intacte
    expect(await res.json()).toEqual({ current: null, history: [] });
  });

  it("un coach suspendu n'obtient rien non plus des routes Coach avec le même cookie", async () => {
    seed("coach_suspended");
    const { GET } = await import("@/app/api/coach/dashboard/route");
    const res = await GET(new NextRequest("http://localhost/api/coach/dashboard", { headers: { cookie: "sb-access-token=jeton-de-test" } }));
    expect(res.status).toBe(403);
  });
});

describe("enforceCoachPageAccess : ce que le layout serveur exécute avant tout rendu", () => {
  const callGuard = async (kind: Kind, cookie = true) => {
    seed(kind, { cookie });
    const { enforceCoachPageAccess } = await import("./layout-guard");
    return enforceCoachPageAccess(new Headers(cookie ? { cookie: "sb-access-token=jeton-de-test" } : {}));
  };
  const redirected = (p: Promise<unknown>) => p.then(() => null, (e: { message?: string; to?: string }) => (e.message === "NEXT_REDIRECT" ? e.to : "autre-erreur"));

  it("coach actif : retourne le coach (la page peut être rendue)", async () => {
    expect(await callGuard("coach_active")).toEqual({ id: U, email: "coach@x.fr", name: "Coach Awa" });
  });

  it.each([
    ["utilisateur non connecté", "member" as Kind, false, COACH_LOGIN_REDIRECT],
    ["membre approuvé", "member" as Kind, true, "/dashboard"],
    ["coach suspendu", "coach_suspended" as Kind, true, COACH_INACTIVE_REDIRECT],
    ["coach désactivé", "coach_disabled_account" as Kind, true, COACH_INACTIVE_REDIRECT],
    ["compte coach désynchronisé", "coach_profile_suspended" as Kind, true, COACH_INACTIVE_REDIRECT],
  ])("%s : redirection levée côté serveur vers %s", async (_label, kind, cookie, to) => {
    expect(await redirected(callGuard(kind, cookie))).toBe(to);
  });

  it("panne de lecture : « unavailable », sans redirection ni accès", async () => {
    seed("coach_active");
    world.failWhen = (q) => (q.table === "profiles" ? { message: "boom" } : null);
    const { enforceCoachPageAccess } = await import("./layout-guard");
    expect(await enforceCoachPageAccess(new Headers({ cookie: "sb-access-token=jeton" }))).toBe("unavailable");
  });

  it("seuls les cookies sont transmis à la garde : un en-tête Authorization du navigateur est ignoré", async () => {
    seed("member", { cookie: false });
    const { enforceCoachPageAccess } = await import("./layout-guard");
    const to = await redirected(enforceCoachPageAccess(new Headers({ authorization: "Bearer jeton-ignore" })));
    expect(to).toBe(COACH_LOGIN_REDIRECT);
  });
});
