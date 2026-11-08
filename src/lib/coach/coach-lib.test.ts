import { describe, expect, test, vi } from "vitest";
import { sanitizeAuditMetadata, writeCoachAudit } from "@/lib/coach/audit";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { mapAssignmentError } from "@/lib/coach/assignment-errors";
import { classifyTarget, refuseIfCoach } from "@/lib/coach/guard";
import { toCoachMemberDto, COACH_MEMBER_COLUMNS } from "@/lib/coach/dto";

const C = "11111111-1111-4111-8111-111111111111";
const M = "22222222-2222-4222-8222-222222222222";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcDb = (result: { data?: unknown; error?: unknown } | "throw") => {
  const inserts: unknown[] = [];
  const db = {
    rpc: vi.fn(async () => { if (result === "throw") throw new Error("boom"); return { data: null, error: null, ...result }; }),
    from: () => ({ insert: async (row: unknown) => { inserts.push(row); return { error: null }; } }),
  };
  return { db: db as never, inserts, rpc: db.rpc };
};

describe("accès d'un coach au dossier d'un membre (consentement)", () => {
  test("accordé seulement si la fonction SQL répond exactement true, et la consultation est journalisée", async () => {
    const { db, inserts, rpc } = rpcDb({ data: true });
    expect(await assertCoachMemberAccess(db, C, M)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("coach_can_access_member", { p_coach: C, p_member: M });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ actor_kind: "coach", action: "member_file_viewed", target_id: M });
  });
  test.each([[false], [null], ["true"], [1], [undefined]])("refusé pour %s (avant consentement, fin, retrait, autre coach)", async (data) => {
    const { db, inserts } = rpcDb({ data });
    expect(await assertCoachMemberAccess(db, C, M)).toBe(false);
    expect(inserts).toHaveLength(0);
  });
  test("une erreur de base ou une exception refuse (fail-closed)", async () => {
    expect(await assertCoachMemberAccess(rpcDb({ data: true, error: { message: "x" } }).db, C, M)).toBe(false);
    expect(await assertCoachMemberAccess(rpcDb("throw").db, C, M)).toBe(false);
  });
  test("un coach ne peut pas s'accorder l'accès à lui-même", async () => {
    expect(await assertCoachMemberAccess(rpcDb({ data: true }).db, C, C)).toBe(false);
  });
});

describe("journal d'audit : jamais de contenu confidentiel", () => {
  test("les clés sensibles sont retirées, les valeurs bornées", () => {
    const out = sanitizeAuditMetadata({
      coach_id: C, note: "secret", content: "x", observations: "y", password: "p", token: "t", api_key: "k",
      count: 3, long: "a".repeat(500), nested: { a: 1 },
    });
    expect(Object.keys(out).sort()).toEqual(["coach_id", "count", "long"]);
    expect((out.long as string).length).toBe(200);
  });
  test("une écriture en échec ne lève pas d'exception", async () => {
    const db = { from: () => ({ insert: async () => { throw new Error("db"); } }) } as never;
    expect(await writeCoachAudit(db, { actorId: "a", actorKind: "admin", action: "x", targetType: "t" })).toBe(false);
  });
});

describe("traduction des erreurs SQL", () => {
  test("course d'attributions (index unique) → 409", () => expect(mapAssignmentError({ code: "23505" }).status).toBe(409));
  test("transition refusée par le déclencheur → 409", () => expect(mapAssignmentError({ code: "23514" }).status).toBe(409));
  test("attribution d'un autre membre → 404", () => expect(mapAssignmentError({ message: "assignment_not_found" }).status).toBe(404));
  test("auto-attribution → 400, coach inactif → 409, membre inéligible → 409", () => {
    expect(mapAssignmentError({ message: "self_assignment" }).status).toBe(400);
    expect(mapAssignmentError({ message: "coach_not_active" }).status).toBe(409);
    expect(mapAssignmentError({ message: "member_not_eligible" }).status).toBe(409);
  });
  test("erreur inconnue → 500 sans fuite du message", () => {
    const f = mapAssignmentError({ message: "relation secret_table does not exist" });
    expect(f.status).toBe(500);
    expect(f.message).not.toContain("secret_table");
  });
});

const targetDb = (profile: unknown, account: unknown) => ({
  from: (t: string) => {
    const r = t === "profiles" ? profile : account;
    const q: Record<string, unknown> = { select: () => q, eq: () => q, maybeSingle: async () => r };
    return q;
  },
}) as never;

describe("garde des routes génériques (classifyTarget / refuseIfCoach)", () => {
  test("coach détecté par coach_accounts OU par account_type", async () => {
    expect(await classifyTarget(targetDb({ data: { account_type: "member" } }, { data: { user_id: C } }), C)).toBe("coach");
    expect(await classifyTarget(targetDb({ data: { account_type: "coach" } }, { data: null }), C)).toBe("coach");
  });
  test("un membre n'est pas un coach", async () => {
    expect(await classifyTarget(targetDb({ data: { account_type: "member" } }, { data: null }), M)).toBe("other");
    expect(await refuseIfCoach(targetDb({ data: { account_type: "member" } }, { data: null }), M)).toBeNull();
  });
  test("toute erreur de lecture refuse (fail-closed)", async () => {
    expect(await classifyTarget(targetDb({ data: null }, { data: null, error: { code: "XX" } }), M)).toBe("error");
    expect(await classifyTarget(targetDb({ data: null, error: { code: "XX" } }, { data: null }), M)).toBe("error");
    expect((await refuseIfCoach(targetDb({ data: null }, { data: null, error: { code: "XX" } }), M))?.status).toBe(500);
  });
  test("un coach est refusé avec 409", async () => {
    const res = await refuseIfCoach(targetDb({ data: { account_type: "coach" } }, { data: { user_id: C } }), C);
    expect(res?.status).toBe(409);
  });
});

describe("DTO coach : liste blanche", () => {
  test("aucune colonne sensible n'est demandée", () => {
    for (const forbidden of ["email", "phone", "name", "questionnaire", "selfie", "profile_photos", "birth_date", "*"]) {
      expect(COACH_MEMBER_COLUMNS.split(/,\s*/)).not.toContain(forbidden);
    }
  });
  test("le DTO ne recopie pas les champs hors liste", () => {
    const dto = toCoachMemberDto({ id: M, pseudo: "Awa", avatar_url: null, country: "CM", city: "Douala", email: "x@y.z", phone: "1", questionnaire: {} });
    expect(Object.keys(dto!).sort()).toEqual(["avatarUrl", "city", "country", "id", "pseudo"]);
  });
});
