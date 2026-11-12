import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import { QUESTIONNAIRES, getAllQuestionnaireFieldIds } from "@/lib/onboarding";
import { DISCOVERY_SOURCE_ARCHIVE, MARRIAGE_VISION_ARCHIVE } from "@/lib/onboarding-legacy";

/**
 * Routes d'enregistrement du questionnaire contre un faux client Supabase : identité du jeton, validation serveur
 * des réponses synchronisées, colonnes historiques, archives, et badge calculé sans réécrire le questionnaire.
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as { table: string; op: string; columns: string; filters: [string, string, unknown][] }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
}));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});
vi.mock("@/lib/email", () => ({ sendVerificationApprovedEmail: async () => true }));
vi.mock("@/lib/referrals", () => ({ reevaluateReferral: async () => {} }));

import { POST as saveAnswers } from "./answers/route";
import { POST as complete } from "./complete/route";

const ME = "a0000001-0000-4000-8000-000000000000";
const OTHER = "a0000002-0000-4000-8000-000000000000";
const COACH = "c0000000-0000-4000-8000-000000000001";

const required = getAllQuestionnaireFieldIds({ excludeOptional: true });
/** Toutes les réponses requises SAUF la vision du mariage : le questionnaire d'un membre inscrit avant ce lot. */
const OLD_ANSWERS: Row = Object.fromEntries(
  QUESTIONNAIRES.flatMap((q) => q.sections.flatMap((s) => s.fields))
    .filter((f) => required.includes(f.id) && f.id !== "marriageVision" && !f.showIf)
    .map((f) => [f.id, f.type === "multi" ? [f.options?.[0] ?? "x"] : f.type === "agerange" ? { min: "25", max: "35" } : f.options?.[0] ?? "réponse"])
);

const profile = (id: string, over: Row = {}): Row => ({
  id, name: "Awa", pseudo: "awa", email: `${id}@x.fr`, account_type: "member", status: "approved",
  avatar_url: "/avatars/femme-1.webp", bio: "Bonjour", city: "Douala", profession: "Infirmière", civil_status: "Single",
  marriage_vision: null, discovery_source: null, questionnaire: {}, onboarding_completed: false, verification_status: "none",
  verification_rejection_reason: null, ...over,
});

function seed(me: Row = {}) {
  world.log.length = 0;
  world.failWhen = undefined;
  world.tables = {
    profiles: [profile(ME, me), profile(OTHER, { marriage_vision: ["famille"], questionnaire: { ethnie: "autre membre" } }), profile(COACH, { account_type: "coach" })],
    coach_accounts: [{ user_id: COACH, email: "coach@x.fr", display_name: "Coach", active: true }],
    meeting_notifications: [], admin_notifications: [],
  };
  world.user = { id: ME, email: "me@x.fr" };
}
const mine = () => world.tables.profiles.find((p) => p.id === ME)!;
const other = () => world.tables.profiles.find((p) => p.id === OTHER)!;
const writes = () => world.log.filter((q) => q.table === "profiles" && q.op === "update");

const req = (path: string, body: unknown, token: string | null = "t") =>
  new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const autosave = (answers: unknown, extra: Row = {}) => saveAnswers(req("/api/onboarding/answers", { answers, ...extra }));

beforeEach(() => seed());

describe("POST /api/onboarding/answers — sauvegarde automatique", () => {
  it("enregistre les réponses du membre du JETON, sans toucher à onboarding_completed, réponse non mise en cache", async () => {
    seed({ onboarding_completed: true });
    const res = await autosave({ ethnie: "Béti" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(mine().questionnaire).toEqual({ ethnie: "Béti" });
    expect(mine().onboarding_completed).toBe(true);
    for (const w of writes()) expect(w.filters).toEqual([["eq", "id", ME]]);
  });

  it("ignore tout identifiant envoyé par le navigateur : seul le jeton désigne la cible", async () => {
    const res = await saveAnswers(req("/api/onboarding/answers", { answers: { ethnie: "moi", marriageVision: ["priere"] }, user_id: OTHER, id: OTHER }));
    expect(res.status).toBe(200);
    expect(mine().marriage_vision).toEqual(["priere"]);
    expect(other().marriage_vision).toEqual(["famille"]);
    expect(other().questionnaire).toEqual({ ethnie: "autre membre" });
  });

  it("sans jeton ou jeton inconnu : 401 ; coach : 403 ; aucune écriture", async () => {
    expect((await saveAnswers(req("/api/onboarding/answers", { answers: { a: 1 } }, null))).status).toBe(401);
    world.user = null;
    expect((await autosave({ a: 1 })).status).toBe(401);
    world.user = { id: COACH, email: "coach@x.fr" };
    const refused = await autosave({ marriageVision: ["priere"] });
    expect(refused.status).toBe(403);
    expect(writes()).toHaveLength(0);
  });

  it("corps invalide : 400 sans écriture (un questionnaire n'est jamais remplacé par du vide)", async () => {
    seed({ questionnaire: { ethnie: "Béti" } });
    for (const body of [{}, { answers: null }, { answers: [] }, { answers: "x" }, "pas du json"]) {
      const res = await saveAnswers(req("/api/onboarding/answers", body));
      expect(res.status).toBe(400);
    }
    expect(mine().questionnaire).toEqual({ ethnie: "Béti" });
    expect(writes()).toHaveLength(0);
  });

  it("VALIDATION SERVEUR : valeur hors liste, libellé, doublon, 4 valeurs, source inconnue → 400 avec code, rien n'est écrit", async () => {
    seed({ marriage_vision: ["priere"], questionnaire: { ethnie: "Béti" } });
    const cases: [Row, string][] = [
      [{ marriageVision: ["inconnue"] }, "marriage_vision_invalid"],
      [{ marriageVision: ["Prière Quotidienne"] }, "marriage_vision_invalid"],
      [{ marriageVision: ["priere", "priere"] }, "marriage_vision_invalid"],
      [{ marriageVision: "priere" }, "marriage_vision_invalid"],
      [{ marriageVision: ["priere", "famille", "service", "respect"] }, "marriage_vision_too_many"],
      [{ discoverySource: "Un ami" }, "discovery_source_invalid"],
    ];
    for (const [answers, code] of cases) {
      const res = await autosave({ ethnie: "piraté", ...answers });
      expect(res.status, code).toBe(400);
      expect((await res.json()).code).toBe(code);
    }
    expect(mine().questionnaire).toEqual({ ethnie: "Béti" });
    expect(mine().marriage_vision).toEqual(["priere"]);
    expect(writes()).toHaveLength(0);
  });

  it("synchronise les colonnes historiques quand le membre répond", async () => {
    await autosave({ marriageVision: ["service", "respect"], discoverySource: "YouTube" });
    expect(mine().marriage_vision).toEqual(["service", "respect"]);
    expect(mine().discovery_source).toBe("YouTube");
    expect(mine().questionnaire).toEqual({ marriageVision: ["service", "respect"], discoverySource: "YouTube" });
  });

  it("clé absente ou réponse vide : les colonnes existantes ne sont jamais vidées", async () => {
    seed({ marriage_vision: ["priere", "Mariage biblique"], discovery_source: "Par un ami" });
    await autosave({ ethnie: "Béti" });
    await autosave({ ethnie: "Béti", marriageVision: [], discoverySource: "" });
    await autosave({ ethnie: "Béti", marriageVision: null, discoverySource: null });
    expect(mine().marriage_vision).toEqual(["priere", "Mariage biblique"]);
    expect(mine().discovery_source).toBe("Par un ami");
    // Aucune mise à jour n'a même mentionné ces colonnes.
    expect((mine().questionnaire as Row)[MARRIAGE_VISION_ARCHIVE]).toBeUndefined();
  });

  it("le simple pré-remplissage renvoyé par l'éditeur n'écrase pas l'ancienne valeur non reconnue", async () => {
    seed({ marriage_vision: ["priere", "Mariage biblique"] });
    await autosave({ ethnie: "Béti", marriageVision: ["priere"] });
    expect(mine().marriage_vision).toEqual(["priere", "Mariage biblique"]);
    expect((mine().questionnaire as Row)[MARRIAGE_VISION_ARCHIVE]).toBeUndefined();
  });

  it("choix explicite : colonne remplacée, anciennes valeurs archivées, puis conservées à chaque sauvegarde suivante", async () => {
    seed({ marriage_vision: ["priere", "Mariage biblique"], discovery_source: "Par un ami" });
    await autosave({ ethnie: "Béti", marriageVision: ["service"], discoverySource: "Instagram" });
    expect(mine().marriage_vision).toEqual(["service"]);
    expect(mine().discovery_source).toBe("Instagram");
    const archived = () => [(mine().questionnaire as Row)[MARRIAGE_VISION_ARCHIVE], (mine().questionnaire as Row)[DISCOVERY_SOURCE_ARCHIVE]];
    expect(archived()).toEqual([["Mariage biblique"], ["Par un ami"]]);

    // Ancien onglet (sans les archives), tentative de vidage, puis nouvelles réponses : l'archive tient.
    await autosave({ ethnie: "Béti", marriageVision: ["service"] });
    await autosave({ ethnie: "Béti", [MARRIAGE_VISION_ARCHIVE]: [], [DISCOVERY_SOURCE_ARCHIVE]: [] });
    await autosave({ ethnie: "Béti", marriageVision: ["priere", "famille"] });
    for (let i = 0; i < 4; i++) await autosave({ ethnie: `v${i}`, marriageVision: ["priere", "famille"] });
    expect(archived()).toEqual([["Mariage biblique"], ["Par un ami"]]);
    expect(mine().marriage_vision).toEqual(["priere", "famille"]);
    expect((mine().questionnaire as Row).ethnie).toBe("v3");
  });

  it("colonne discovery_source absente (ancienne base) : repli sans erreur, le reste est enregistré", async () => {
    world.failWhen = (q) => (q.table === "profiles" && q.op === "select" && q.columns.includes("discovery_source")
      ? { code: "42703", message: "column profiles.discovery_source does not exist" } : null);
    const res = await autosave({ ethnie: "Béti", marriageVision: ["priere"], discoverySource: "TikTok" });
    expect(res.status).toBe(200);
    expect(mine().marriage_vision).toEqual(["priere"]);
    expect(mine().discovery_source).toBeNull();
    expect((mine().questionnaire as Row).discoverySource).toBe("TikTok");
  });

  it("panne de lecture ou d'écriture : 500 générique, aucun détail interne", async () => {
    world.failWhen = (q) => (q.table === "profiles" && q.op === "update" ? { message: "secret interne" } : null);
    const res = await autosave({ ethnie: "Béti" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret interne");
  });

  it("charge utile démesurée : 413", async () => {
    expect((await autosave({ bio: "x".repeat(250_000) })).status).toBe(413);
    expect(writes()).toHaveLength(0);
  });
});

describe("POST /api/onboarding/complete — validation finale", () => {
  const finish = (answers: unknown) => complete(req("/api/onboarding/complete", { answers }));

  it("marque le questionnaire terminé, synchronise les colonnes et applique la même validation", async () => {
    const ok = await finish({ ...OLD_ANSWERS, marriageVision: ["priere"], discoverySource: "TikTok" });
    expect(ok.status).toBe(200);
    expect(mine().onboarding_completed).toBe(true);
    expect(mine().marriage_vision).toEqual(["priere"]);
    expect(mine().discovery_source).toBe("TikTok");

    seed();
    const bad = await finish({ ...OLD_ANSWERS, marriageVision: ["inconnue"] });
    expect(bad.status).toBe(400);
    expect(mine().onboarding_completed).toBe(false);
    expect(mine().questionnaire).toEqual({});
  });

  it("corps sans réponses : 400, le questionnaire existant n'est pas effacé", async () => {
    seed({ questionnaire: OLD_ANSWERS, onboarding_completed: true });
    const res = await complete(req("/api/onboarding/complete", {}));
    expect(res.status).toBe(400);
    expect(mine().questionnaire).toEqual(OLD_ANSWERS);
  });

  it("ANCIEN MEMBRE : vision déjà sur le profil, clé absente du questionnaire → badge attribué, questionnaire NON réécrit", async () => {
    seed({ questionnaire: { ...OLD_ANSWERS }, onboarding_completed: true, marriage_vision: ["Mariage biblique"] });
    const res = await finish({ ...OLD_ANSWERS });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.questionnaire).toEqual({ answered: body.questionnaire.total, total: body.questionnaire.total });
    expect(body.verification_granted).toBe(true);
    expect(mine().verification_status).toBe("verified");
    // Aucune réponse inventée, aucune colonne modifiée, aucune archive créée.
    expect(mine().questionnaire).toEqual(OLD_ANSWERS);
    expect("marriageVision" in (mine().questionnaire as Row)).toBe(false);
    expect(mine().marriage_vision).toEqual(["Mariage biblique"]);
  });

  it("ancien membre déjà vérifié : compléter les nouvelles questions ne lui retire pas son badge", async () => {
    seed({ questionnaire: { ...OLD_ANSWERS }, onboarding_completed: true, marriage_vision: ["priere"], verification_status: "verified" });
    const res = await finish({ ...OLD_ANSWERS, marriageVision: ["priere", "service"], discoverySource: "WhatsApp" });
    expect(res.status).toBe(200);
    expect((await res.json()).verification_status).toBe("verified");
    expect(mine().verification_status).toBe("verified");
    expect(mine().marriage_vision).toEqual(["priere", "service"]);
    expect(mine().discovery_source).toBe("WhatsApp");
    expect(mine().onboarding_completed).toBe(true);
  });

  it("sans vision du mariage nulle part : pas de badge, la question est signalée manquante", async () => {
    seed({ questionnaire: { ...OLD_ANSWERS }, marriage_vision: null });
    const body = await (await finish({ ...OLD_ANSWERS })).json();
    expect(body.verification_granted).toBe(false);
    expect(body.questionnaire.answered).toBe(body.questionnaire.total - 1);
    expect(mine().verification_status).toBe("none");
  });

  it("coach refusé, anonyme refusé", async () => {
    world.user = { id: COACH, email: "coach@x.fr" };
    expect((await finish({ a: 1 })).status).toBe(403);
    world.user = null;
    expect((await finish({ a: 1 })).status).toBe(401);
  });
});
