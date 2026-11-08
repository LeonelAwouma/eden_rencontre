import { beforeEach, describe, expect, test, vi } from "vitest";

type Res = { data: unknown; error: unknown };
const w = vi.hoisted(() => ({
  profiles: { data: null, error: null } as Res,
  profilesLegacy: { data: null, error: null } as Res,
  coach: { data: null, error: null } as Res,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      let cols = "";
      const q: Record<string, unknown> = {
        select: (c: string) => { cols = c; return q; },
        eq: () => q,
        maybeSingle: async () => (table === "coach_accounts" ? w.coach : cols.includes("account_type") ? w.profiles : w.profilesLegacy),
      };
      return q;
    },
  }),
}));

import { classifyAccount, getAccountKind } from "@/lib/api-auth";

const U = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  w.profiles = { data: null, error: null };
  w.profilesLegacy = { data: null, error: null };
  w.coach = { data: null, error: null };
});

describe("classifyAccount (fonction pure)", () => {
  test("membre approuvé accepté", () => expect(classifyAccount({ status: "approved", account_type: "member" }, null)).toBe("member"));
  test("coach actif accepté", () => expect(classifyAccount({ status: "approved", account_type: "coach" }, { active: true })).toBe("coach"));
  test("coach suspendu refusé, même avec un profil « approved »", () => {
    expect(classifyAccount({ status: "approved", account_type: "coach" }, { active: false })).toBeNull();
    expect(classifyAccount({ status: "approved", account_type: "coach" }, null)).toBeNull();
  });
  test("type de compte absent ou inconnu : jamais membre", () => {
    expect(classifyAccount({ status: "approved", account_type: null }, null)).toBeNull();
    expect(classifyAccount({ status: "approved", account_type: "admin" }, null)).toBeNull();
  });
  test("profil non approuvé refusé", () => {
    for (const status of ["pending", "rejected", "suspended", null]) {
      expect(classifyAccount({ status, account_type: "member" }, null)).toBeNull();
    }
  });
});

describe("getAccountKind : en cas d'erreur, on refuse", () => {
  test("erreur de lecture du profil → refus", async () => {
    w.profiles = { data: null, error: { code: "XX000" } };
    expect(await getAccountKind(U)).toBeNull();
  });
  test("coach dont la lecture de coach_accounts échoue → refus", async () => {
    w.profiles = { data: { status: "approved", account_type: "coach" }, error: null };
    w.coach = { data: null, error: { code: "XX000" } };
    expect(await getAccountKind(U)).toBeNull();
  });
  test("coach dont la ligne coach_accounts est inactive → refus", async () => {
    w.profiles = { data: { status: "approved", account_type: "coach" }, error: null };
    w.coach = { data: { active: false }, error: null };
    expect(await getAccountKind(U)).toBeNull();
  });
  test("colonne account_type absente SANS ligne coach : repli membre toléré (aucun coach possible)", async () => {
    w.profiles = { data: null, error: { code: "42703" } };
    w.profilesLegacy = { data: { status: "approved" }, error: null };
    w.coach = { data: null, error: { code: "42P01" } }; // table coach_accounts absente
    expect(await getAccountKind(U)).toBe("member");
  });
  test("colonne account_type absente MAIS ligne coach_accounts présente : type inconnu → refus", async () => {
    w.profiles = { data: null, error: { code: "42703" } };
    w.profilesLegacy = { data: { status: "approved" }, error: null };
    w.coach = { data: { user_id: U }, error: null };
    expect(await getAccountKind(U)).toBeNull();
  });
  test("colonne absente et lecture de coach_accounts en échec : refus (jamais de repli membre)", async () => {
    w.profiles = { data: null, error: { code: "42703" } };
    w.profilesLegacy = { data: { status: "approved" }, error: null };
    w.coach = { data: null, error: { code: "XX000" } };
    expect(await getAccountKind(U)).toBeNull();
  });
});
