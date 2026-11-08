import { beforeEach, describe, expect, it } from "vitest";
import { COACH_MEMBER_SELECT, countPendingProposals, loadCoachMembers, toCoachMemberView } from "./members-data";
import { MAX_MEMBERS_LOADED } from "./members-view";
import { createFakeDb, newWorld, type FakeWorld, type Row } from "@/test-utils/fake-db";

const COACH = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH = "c0000000-0000-4000-8000-000000000002";
const mid = (n: number) => `a${String(n).padStart(7, "0")}-0000-4000-8000-000000000000`;

let world: FakeWorld;
const db = () => createFakeDb(world) as never;

const profile = (id: string, over: Row = {}): Row => ({
  id, pseudo: `pseudo-${id.slice(0, 8)}`, avatar_url: null, country: "CM", city: "Douala", status: "approved", account_type: "member",
  formation_completed: [], email: "secret@x.fr", phone: "+237600000000", name: "Nom Réel", first_name: "Nom", last_name: "Réel",
  questionnaire: { q: 1 }, selfie_url: "selfie/x.jpg", profile_photos: ["p1"], ...over,
});
const assignment = (n: number, over: Row = {}): Row => ({
  id: `as-${n}`, coach_id: COACH, member_id: mid(n), status: "active", consent_status: "accepted",
  assigned_at: "2026-01-01T00:00:00Z", consent_at: `2026-02-${String((n % 27) + 1).padStart(2, "0")}T00:00:00Z`, ...over,
});

beforeEach(() => { world = newWorld(); world.tables = { coach_member_assignments: [], profiles: [] }; });

describe("loadCoachMembers : prédicat d'accès", () => {
  it("n'interroge que les affectations ACTIVES et CONSENTIES du coach, et uniquement des profils approuvés de type membre", async () => {
    world.tables.coach_member_assignments = [assignment(1)];
    world.tables.profiles = [profile(mid(1))];
    await loadCoachMembers(db(), COACH);

    const a = world.log.find((q) => q.table === "coach_member_assignments")!;
    expect(a.filters).toEqual(expect.arrayContaining([["eq", "coach_id", COACH], ["eq", "status", "active"], ["eq", "consent_status", "accepted"]]));
    const p = world.log.find((q) => q.table === "profiles")!;
    expect(p.filters).toEqual(expect.arrayContaining([["eq", "status", "approved"], ["eq", "account_type", "member"]]));
  });

  it("ne lit que la liste blanche de colonnes (jamais « * », jamais e-mail, téléphone, nom, questionnaire, selfie, photos)", async () => {
    world.tables.coach_member_assignments = [assignment(1)];
    world.tables.profiles = [profile(mid(1))];
    await loadCoachMembers(db(), COACH);
    for (const q of world.log.filter((x) => x.table === "profiles")) {
      expect(q.columns).toBe(COACH_MEMBER_SELECT);
      expect(q.columns).not.toContain("*");
      for (const forbidden of ["email", "phone", "name", "first_name", "last_name", "questionnaire", "selfie_url", "profile_photos", "birth_date"]) {
        expect(q.columns.split(",").map((c) => c.trim())).not.toContain(forbidden);
      }
    }
  });

  it.each(["pending", "declined", "revoked", "ended"])("une affectation « %s » n'expose aucun membre", async (status) => {
    world.tables.coach_member_assignments = [assignment(1, { status, consent_status: status === "pending" ? "pending" : status === "revoked" ? "withdrawn" : "declined" })];
    world.tables.profiles = [profile(mid(1))];
    const r = await loadCoachMembers(db(), COACH);
    expect(r.members).toEqual([]);
    expect(r.coverage).toMatchObject({ activeMembers: 0, selectedAssignments: 0, loadedMembers: 0 });
  });

  it("active mais consentement non accepté : aucun membre", async () => {
    world.tables.coach_member_assignments = [assignment(1, { consent_status: "withdrawn" })];
    world.tables.profiles = [profile(mid(1))];
    expect((await loadCoachMembers(db(), COACH)).members).toEqual([]);
  });

  it("les membres d'un autre coach ne sont jamais visibles", async () => {
    world.tables.coach_member_assignments = [assignment(1), assignment(2, { coach_id: OTHER_COACH })];
    world.tables.profiles = [profile(mid(1)), profile(mid(2))];
    const r = await loadCoachMembers(db(), COACH);
    expect(r.members.map((m) => m.id)).toEqual([mid(1)]);
  });

  it("un profil suspendu, en attente ou de type coach est exclu (et compté comme profil exclu)", async () => {
    world.tables.coach_member_assignments = [assignment(1), assignment(2), assignment(3), assignment(4)];
    world.tables.profiles = [
      profile(mid(1)), profile(mid(2), { status: "suspended" }), profile(mid(3), { status: "pending" }), profile(mid(4), { account_type: "coach" }),
    ];
    const r = await loadCoachMembers(db(), COACH);
    expect(r.members.map((m) => m.id)).toEqual([mid(1)]);
    expect(r.coverage).toMatchObject({ activeMembers: 4, selectedAssignments: 4, loadedMembers: 1, excludedProfiles: 3, truncated: false });
  });
});

describe("loadCoachMembers : plafond de 500", () => {
  it("320 affectations, 319 profils exploitables : pas de troncature, 1 profil exclu", async () => {
    world.tables.coach_member_assignments = Array.from({ length: 320 }, (_, i) => assignment(i + 1));
    world.tables.profiles = Array.from({ length: 320 }, (_, i) => profile(mid(i + 1), i === 5 ? { status: "suspended" } : {}));
    const r = await loadCoachMembers(db(), COACH);
    expect(r.coverage).toEqual({ activeMembers: 320, selectedAssignments: 320, loadedMembers: 319, excludedProfiles: 1, truncated: false });
    expect(r.members).toHaveLength(319);
  });

  it("650 actives : les 500 PLUS RÉCENTES sont retenues (consent_at décroissant), truncated, activeMembers exact", async () => {
    // consent_at croissant avec n : les plus récentes sont les n les plus grands.
    world.tables.coach_member_assignments = Array.from({ length: 650 }, (_, i) =>
      assignment(i + 1, { consent_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString() }));
    world.tables.profiles = Array.from({ length: 650 }, (_, i) => profile(mid(i + 1)));
    const r = await loadCoachMembers(db(), COACH);

    expect(MAX_MEMBERS_LOADED).toBe(500);
    expect(r.coverage).toEqual({ activeMembers: 650, selectedAssignments: 500, loadedMembers: 500, excludedProfiles: 0, truncated: true });
    expect(r.members).toHaveLength(500);
    const ids = new Set(r.members.map((m) => m.id));
    expect(ids.has(mid(650))).toBe(true);   // la plus récente est là
    expect(ids.has(mid(151))).toBe(true);   // la 500e plus récente aussi
    expect(ids.has(mid(150))).toBe(false);  // les plus anciennes sont écartées
    expect(ids.has(mid(1))).toBe(false);
    // Ordre de chargement : du plus récent au plus ancien.
    expect(r.members[0].id).toBe(mid(650));
    expect(r.members[499].id).toBe(mid(151));
  });

  it("égalité de consent_at : départage stable par id croissant", async () => {
    world.tables.coach_member_assignments = [
      assignment(3, { consent_at: "2026-05-01T00:00:00Z" }), assignment(1, { consent_at: "2026-05-01T00:00:00Z" }), assignment(2, { consent_at: "2026-05-01T00:00:00Z" }),
    ].map((a, i) => ({ ...a, id: ["as-c", "as-a", "as-b"][i] }));
    world.tables.profiles = [profile(mid(1)), profile(mid(2)), profile(mid(3))];
    const r = await loadCoachMembers(db(), COACH);
    // id d'affectation croissant : as-a (membre 1), as-b (membre 2), as-c (membre 3)
    expect(r.members.map((m) => m.id)).toEqual([mid(1), mid(2), mid(3)]);
  });

  it("charge les profils par lots de 100 identifiants (URL bornée)", async () => {
    world.tables.coach_member_assignments = Array.from({ length: 450 }, (_, i) => assignment(i + 1));
    world.tables.profiles = Array.from({ length: 450 }, (_, i) => profile(mid(i + 1)));
    await loadCoachMembers(db(), COACH);
    const chunks = world.log.filter((q) => q.table === "profiles").map((q) => (q.filters.find(([k, c]) => k === "in" && c === "id")![2] as string[]).length);
    expect(chunks).toEqual([100, 100, 100, 100, 50]);
  });
});

describe("toCoachMemberView : classement de la formation", () => {
  const a = { assigned_at: "2026-01-01T00:00:00Z", consent_at: "2026-01-02T00:00:00Z" };

  it("formation_completed non tableau → unavailable, sans résumé fabriqué (jamais « pas commencé »)", () => {
    for (const bad of [null, undefined, "x", 5, { a: 1 }]) {
      const v = toCoachMemberView({ id: "m", formation_completed: bad }, a)!;
      expect(v.formationState).toBe("unavailable");
      expect(v.formation).toBeNull();
    }
  });

  it("tableau vide → pas commencée ; slugs inconnus ignorés", () => {
    expect(toCoachMemberView({ id: "m", formation_completed: [] }, a)!.formationState).toBe("notStarted");
    expect(toCoachMemberView({ id: "m", formation_completed: ["inconnu-1", "inconnu-2"] }, a)!.formationState).toBe("notStarted");
  });

  it("ligne ou affectation absente → null", () => {
    expect(toCoachMemberView(null, a)).toBeNull();
    expect(toCoachMemberView({ id: "m" }, null)).toBeNull();
    expect(toCoachMemberView({ pseudo: "x" }, a)).toBeNull();
  });

  it("n'expose aucune donnée d'identité même si la ligne en contient", () => {
    const v = toCoachMemberView(profile(mid(1)), a)!;
    expect(Object.keys(v).sort()).toEqual(["assignedAt", "avatarUrl", "city", "consentAt", "country", "formation", "formationState", "id", "pseudo"]);
    expect(JSON.stringify(v)).not.toMatch(/secret@x\.fr|Nom Réel|\+2376|selfie|questionnaire|p1/);
  });
});

describe("countPendingProposals et erreurs", () => {
  it("compte seulement les propositions en attente de CE coach, sans lire d'identité", async () => {
    world.tables.coach_member_assignments = [
      assignment(1, { status: "pending", consent_status: "pending" }), assignment(2, { status: "pending", consent_status: "pending" }),
      assignment(3, { status: "pending", consent_status: "pending", coach_id: OTHER_COACH }), assignment(4),
    ];
    expect(await countPendingProposals(db(), COACH)).toBe(2);
    const q = world.log.find((x) => x.table === "coach_member_assignments")!;
    expect(q.columns).toBe("id");
  });

  it("toute erreur de lecture lève (jamais une liste partielle présentée comme complète)", async () => {
    world.failWhen = (q) => (q.table === "coach_member_assignments" ? { code: "XX000", message: "boom secret" } : null);
    await expect(loadCoachMembers(db(), COACH)).rejects.toThrow(/assignments query failed/);
    world.failWhen = (q) => (q.table === "profiles" ? { code: "XX000", message: "boom secret" } : null);
    world.tables.coach_member_assignments = [assignment(1)];
    await expect(loadCoachMembers(db(), COACH)).rejects.toThrow(/profiles query failed/);
    world.failWhen = (q) => (q.table === "coach_member_assignments" ? { message: "x" } : null);
    await expect(countPendingProposals(db(), COACH)).rejects.toThrow(/pending count failed/);
  });
});
