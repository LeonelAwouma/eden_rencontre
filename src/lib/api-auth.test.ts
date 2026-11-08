import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Rôles serveur : un statut « approved » ne prouve JAMAIS qu'on est un membre.
 * Le coach est refusé par la garde membre, accepté seulement par getMemberOrCoach / getActiveCoach.
 */

type Row = Record<string, unknown> | null;
const world = vi.hoisted(() => ({
  user: { id: "u1", email: "u1@x.fr" } as { id: string; email: string } | null,
  profile: null as Row,
  coach: null as Row,
  profileError: null as { code?: string } | null,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    auth: { getUser: async () => ({ data: { user: world.user } }) },
    from: (table: string) => {
      const chain = {
        select: (cols?: string) => {
          // Colonne account_type absente (migration non exécutée) : Postgres répond 42703.
          if (table === "profiles" && cols?.includes("account_type") && world.profileError) {
            return { eq: () => ({ maybeSingle: async () => ({ data: null, error: world.profileError }) }) };
          }
          return chain;
        },
        eq: () => chain,
        maybeSingle: async () => ({ data: table === "profiles" ? world.profile : world.coach, error: null }),
      };
      return chain;
    },
  }),
}));

import { classifyAccount, getApprovedUser, getMemberOrCoach } from "./api-auth";
import { getActiveCoach } from "./coach-auth";

const req = () => new NextRequest("http://x/api/test", { headers: { authorization: "Bearer jeton" } });

beforeEach(() => {
  world.user = { id: "u1", email: "u1@x.fr" };
  world.profile = null;
  world.coach = null;
  world.profileError = null;
});

describe("classifyAccount (pur)", () => {
  test("membre approuvé", () => expect(classifyAccount({ status: "approved", account_type: "member" }, null)).toBe("member"));
  test("coach approuvé ET actif", () => expect(classifyAccount({ status: "approved", account_type: "coach" }, { active: true })).toBe("coach"));
  test("coach sans ligne coach_accounts : refusé", () => expect(classifyAccount({ status: "approved", account_type: "coach" }, null)).toBeNull());
  test("coach désactivé : refusé", () => expect(classifyAccount({ status: "approved", account_type: "coach" }, { active: false })).toBeNull());
  test.each(["pending", "suspended", "rejected", null])("statut %s : refusé", (status) =>
    expect(classifyAccount({ status, account_type: "member" }, null)).toBeNull());
  test("profil absent ou type inconnu : refusé", () => {
    expect(classifyAccount(null, null)).toBeNull();
    expect(classifyAccount({ status: "approved", account_type: "admin" }, null)).toBeNull();
    expect(classifyAccount({ status: "approved", account_type: null }, null)).toBeNull();
  });
});

describe("getApprovedUser — garde des fonctions matrimoniales", () => {
  test("membre approuvé : autorisé", async () => {
    world.profile = { status: "approved", account_type: "member" };
    expect(await getApprovedUser(req())).toEqual({ id: "u1", email: "u1@x.fr" });
  });
  test("membre en attente : refusé", async () => {
    world.profile = { status: "pending", account_type: "member" };
    expect(await getApprovedUser(req())).toBeNull();
  });
  test("membre suspendu : refusé", async () => {
    world.profile = { status: "suspended", account_type: "member" };
    expect(await getApprovedUser(req())).toBeNull();
  });
  test("coach approuvé et actif : REFUSÉ", async () => {
    world.profile = { status: "approved", account_type: "coach" };
    world.coach = { active: true };
    expect(await getApprovedUser(req())).toBeNull();
  });
  test("profil absent : refusé", async () => {
    world.profile = null;
    expect(await getApprovedUser(req())).toBeNull();
  });
  test("non authentifié : refusé", async () => {
    world.user = null;
    expect(await getApprovedUser(req())).toBeNull();
  });
  test("colonne account_type absente (migration non exécutée) : les membres continuent de fonctionner", async () => {
    world.profileError = { code: "42703" };
    world.profile = { status: "approved" };
    expect(await getApprovedUser(req())).toEqual({ id: "u1", email: "u1@x.fr" });
  });
});

describe("getMemberOrCoach — fonctions explicitement partagées", () => {
  test("membre : kind member", async () => {
    world.profile = { status: "approved", account_type: "member" };
    expect((await getMemberOrCoach(req()))?.kind).toBe("member");
  });
  test("coach actif : kind coach", async () => {
    world.profile = { status: "approved", account_type: "coach" };
    world.coach = { active: true };
    expect((await getMemberOrCoach(req()))?.kind).toBe("coach");
  });
  test("coach suspendu ou incohérent : refusé", async () => {
    world.profile = { status: "approved", account_type: "coach" };
    world.coach = { active: false };
    expect(await getMemberOrCoach(req())).toBeNull();
    world.coach = null;
    expect(await getMemberOrCoach(req())).toBeNull();
  });
});

describe("getActiveCoach", () => {
  const ok = { user_id: "u1", email: "c@x.fr", display_name: "Coach", active: true };
  test("coach actif et approuvé", async () => {
    world.coach = ok;
    world.profile = { status: "approved", account_type: "coach" };
    expect(await getActiveCoach(req())).toEqual({ id: "u1", email: "c@x.fr", name: "Coach" });
  });
  test("coach suspendu", async () => {
    world.coach = { ...ok, active: false };
    world.profile = { status: "suspended", account_type: "coach" };
    expect(await getActiveCoach(req())).toBeNull();
  });
  test("profil inexistant", async () => {
    world.coach = ok;
    world.profile = null;
    expect(await getActiveCoach(req())).toBeNull();
  });
  test("profil dont account_type est incorrect", async () => {
    world.coach = ok;
    world.profile = { status: "approved", account_type: "member" };
    expect(await getActiveCoach(req())).toBeNull();
  });
  test("profil du coach pas approuvé : refusé même si coach_accounts est actif", async () => {
    world.coach = ok;
    world.profile = { status: "suspended", account_type: "coach" };
    expect(await getActiveCoach(req())).toBeNull();
  });
  test("compte coach inexistant", async () => {
    world.coach = null;
    world.profile = { status: "approved", account_type: "coach" };
    expect(await getActiveCoach(req())).toBeNull();
  });
  test("utilisateur non authentifié", async () => {
    world.user = null;
    expect(await getActiveCoach(req())).toBeNull();
  });
});
