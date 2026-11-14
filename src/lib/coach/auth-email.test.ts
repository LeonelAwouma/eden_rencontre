import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolveAuthEmailForPhone } from "./auth-email";
import { sessionEmailFor } from "@/lib/phone-identity";

type Profile = { id?: string; account_type?: string | null } | null;
function fakeDb(opts: { profile?: Profile; profileError?: boolean; authEmail?: string | null; authError?: boolean; throws?: boolean }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (opts.throws) throw new Error("réseau");
            return { data: opts.profile ?? null, error: opts.profileError ? { code: "XX" } : null };
          },
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { email: opts.authEmail ?? null } },
          error: opts.authError ? { message: "x" } : null,
        }),
      },
    },
  };
}

describe("resolveAuthEmailForPhone", () => {
  test("numéro inconnu ou membre : adresse technique (mécanisme « téléphone seul » inchangé)", async () => {
    expect(await resolveAuthEmailForPhone(fakeDb({ profile: null }), "+237690000001"))
      .toEqual({ ok: true, authEmail: "237690000001@phone.eden.invalid", coachUserId: null });
    expect(await resolveAuthEmailForPhone(fakeDb({ profile: { id: "m", account_type: "member" } }), "+237690000001"))
      .toMatchObject({ ok: true, authEmail: "237690000001@phone.eden.invalid", coachUserId: null });
  });

  test("coach : adresse Auth lue côté serveur (réelle pour un ancien compte, technique pour un nouveau)", async () => {
    expect(await resolveAuthEmailForPhone(fakeDb({ profile: { id: "c1", account_type: "coach" }, authEmail: "Ancien@X.fr" }), "+237690000001"))
      .toEqual({ ok: true, authEmail: "ancien@x.fr", coachUserId: "c1" });
    expect(await resolveAuthEmailForPhone(fakeDb({ profile: { id: "c2", account_type: "coach" }, authEmail: "237690000002@phone.eden.invalid" }), "+237690000002"))
      .toEqual({ ok: true, authEmail: "237690000002@phone.eden.invalid", coachUserId: "c2" });
  });

  test("toute panne de lecture : refus (fermé par défaut), jamais d'adresse de repli", async () => {
    expect(await resolveAuthEmailForPhone(fakeDb({ profileError: true }), "+237690000001")).toEqual({ ok: false });
    expect(await resolveAuthEmailForPhone(fakeDb({ throws: true }), "+237690000001")).toEqual({ ok: false });
    expect(await resolveAuthEmailForPhone(fakeDb({ profile: { id: "c1", account_type: "coach" }, authError: true }), "+237690000001")).toEqual({ ok: false });
    expect(await resolveAuthEmailForPhone(fakeDb({ profile: { id: "c1", account_type: "coach" }, authEmail: null }), "+237690000001")).toEqual({ ok: false });
  });

  test("numéro invalide : refus", async () => {
    expect(await resolveAuthEmailForPhone(fakeDb({}), "690123456")).toEqual({ ok: false });
    expect(await resolveAuthEmailForPhone(fakeDb({}), "")).toEqual({ ok: false });
  });
});

describe("synchronisation de la session navigateur", () => {
  test("l'adresse Auth renvoyée par le serveur est prioritaire ; repli sur l'adresse calculée côté client", () => {
    expect(sessionEmailFor("ancien@x.fr", "237690000001@phone.eden.invalid")).toBe("ancien@x.fr");
    expect(sessionEmailFor(undefined, "237690000001@phone.eden.invalid")).toBe("237690000001@phone.eden.invalid");
    expect(sessionEmailFor("pas-une-adresse", "a@x.fr")).toBe("a@x.fr");
    expect(sessionEmailFor(null, "a@x.fr")).toBe("a@x.fr");
  });
});

describe("migration 20261114_coach_phone_login.sql", () => {
  const sql = readFileSync("supabase/migrations/20261114_coach_phone_login.sql", "utf8");
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

  test("non destructive : aucune suppression de table ni de donnée", () => {
    expect(code).not.toMatch(/drop\s+table|delete\s+from|truncate|update\s+public\./i);
  });

  test("idempotente et ciblée : e-mail facultatif, unicité d'e-mail retirée, numéros uniques vérifiés avant", () => {
    expect(code).toMatch(/alter column email drop not null/i);
    expect(code).toMatch(/create index if not exists/i);
    expect(code).toMatch(/profiles where phone is not null group by phone having count\(\*\) > 1/i);
    // L'unicité des identifiants (profiles.phone, auth.users) n'est jamais retirée.
    expect(code).not.toMatch(/profiles_phone_unique_idx/i);
    expect(code).not.toMatch(/auth\.users/i);
  });
});
