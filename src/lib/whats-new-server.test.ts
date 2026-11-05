import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement } from "./whats-new";

/**
 * Disponibilité RÉELLE : une annonce n'est montrée que si sa fonctionnalité est activée et
 * accessible, et jamais « par défaut » (échec fermé).
 */

let settings: { key: string; value: unknown }[] = [];
let settingsError: unknown = null;
let pillars: Record<number, string[]> = {};
let featureAccess = true;
let throwOnSettings = false;

vi.mock("@/lib/formation/structure", () => ({
  get PILLAR_LESSON_SLUGS() { return pillars; },
}));

vi.mock("@/lib/subscription/effective", () => ({
  hasFeatureAccess: async () => featureAccess,
}));

const db = {
  from: () => ({
    select: () => ({
      eq: async () => {
        if (throwOnSettings) throw new Error("réseau");
        return { data: settings, error: settingsError };
      },
    }),
  }),
} as never;

const ctx = (userId: string | null = "u1") => ({ db, userId });

const make = (over: Partial<Announcement> = {}): Announcement => ({
  id: "essai",
  surface: "member",
  active: true,
  activatesAt: "2026-12-01T00:00:00Z",
  availability: "always",
  href: "/dashboard/forum",
  fr: { title: "Titre", description: "Description" },
  en: { title: "Title", description: "Description" },
  ...over,
});

const NOW = Date.parse("2026-12-05T00:00:00Z");

beforeEach(() => {
  settings = [];
  settingsError = null;
  pillars = { 2: ["2-1", "2-2"], 3: ["3-1"] };
  featureAccess = true;
  throwOnSettings = false;
});

describe("parrainage (clé `referral`)", () => {
  it("n'est pas disponible tant que le programme est désactivé", async () => {
    const { isAvailable } = await import("./whats-new-server");
    settings = [{ key: "enabled", value: false }];
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false);
  });

  it("n'est pas disponible si le réglage est absent (défaut : désactivé)", async () => {
    const { isAvailable } = await import("./whats-new-server");
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false);
  });

  it("est disponible quand le programme est activé", async () => {
    const { isAvailable } = await import("./whats-new-server");
    settings = [{ key: "enabled", value: true }];
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(true);
  });

  it("respecte la fenêtre de campagne", async () => {
    const { isAvailable } = await import("./whats-new-server");
    settings = [{ key: "enabled", value: true }, { key: "campaign_start_at", value: "2026-12-10T00:00:00Z" }];
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false); // pas commencée
    settings = [{ key: "enabled", value: true }, { key: "campaign_end_at", value: "2026-12-01T00:00:00Z" }];
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false); // terminée
  });

  it("n'annonce pas si une date de campagne est illisible", async () => {
    const { isAvailable } = await import("./whats-new-server");
    settings = [{ key: "enabled", value: true }, { key: "campaign_end_at", value: "pas-une-date" }];
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false);
  });
});

describe("piliers 2 et 3 (clé `formation_pillars`)", () => {
  it("est disponible quand les deux piliers ont des leçons et que le membre y a accès", async () => {
    const { isAvailable } = await import("./whats-new-server");
    expect(await isAvailable(make({ availability: "formation_pillars" }), ctx(), NOW)).toBe(true);
  });

  it("n'annonce pas si le pilier 3 est encore vide", async () => {
    const { isAvailable } = await import("./whats-new-server");
    pillars = { 2: ["2-1"], 3: [] };
    expect(await isAvailable(make({ availability: "formation_pillars" }), ctx(), NOW)).toBe(false);
  });

  it("n'annonce pas si le pilier 2 est encore vide", async () => {
    const { isAvailable } = await import("./whats-new-server");
    pillars = { 2: [], 3: ["3-1"] };
    expect(await isAvailable(make({ availability: "formation_pillars" }), ctx(), NOW)).toBe(false);
  });

  it("n'annonce pas à un membre qui n'a pas accès aux formations", async () => {
    const { isAvailable } = await import("./whats-new-server");
    featureAccess = false;
    expect(await isAvailable(make({ availability: "formation_pillars" }), ctx("u1"), NOW)).toBe(false);
  });
});

describe("échec fermé", () => {
  it("une exception dans un résolveur vaut « indisponible »", async () => {
    const { isAvailable } = await import("./whats-new-server");
    throwOnSettings = true;
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false);
  });

  it("une erreur de lecture des réglages vaut « indisponible »", async () => {
    const { isAvailable } = await import("./whats-new-server");
    settingsError = { message: "boom" };
    expect(await isAvailable(make({ availability: "referral" }), ctx(), NOW)).toBe(false);
  });

  it("une clé de disponibilité inconnue vaut « indisponible »", async () => {
    const { isAvailable } = await import("./whats-new-server");
    expect(await isAvailable(make({ availability: "inconnue" as never }), ctx(), NOW)).toBe(false);
  });
});

describe("annonces à présenter (listLive)", () => {
  it("garde une annonce active, dans sa fenêtre, de la bonne surface et disponible", async () => {
    const { listLive } = await import("./whats-new-server");
    const registry = [make({ id: "ok" })];
    expect((await listLive("member", ctx(), NOW, registry)).map((a) => a.id)).toEqual(["ok"]);
  });

  it("`active: false` l'emporte : activer `referral.enabled` ne fait PAS apparaître une annonce désactivée", async () => {
    const { listLive } = await import("./whats-new-server");
    settings = [{ key: "enabled", value: true }]; // le programme est bien activé…
    const registry = [make({ id: "parrainage", availability: "referral", active: false })];
    expect(await listLive("member", ctx(), NOW, registry)).toEqual([]); // …mais l'annonce reste invisible
  });

  it("le même interrupteur, une fois l'annonce activée, la fait apparaître", async () => {
    const { listLive } = await import("./whats-new-server");
    settings = [{ key: "enabled", value: true }];
    const registry = [make({ id: "parrainage", availability: "referral", active: true })];
    expect((await listLive("member", ctx(), NOW, registry)).map((a) => a.id)).toEqual(["parrainage"]);
  });

  it("exclut une annonce programmée, expirée, ou d'une autre surface", async () => {
    const { listLive } = await import("./whats-new-server");
    const registry = [
      make({ id: "future", activatesAt: "2027-01-01T00:00:00Z" }),
      make({ id: "expiree", expiresAt: "2026-12-02T00:00:00Z" }),
      make({ id: "admin", surface: "admin" }),
      make({ id: "visiteur", surface: "public" }),
    ];
    expect(await listLive("member", ctx(), NOW, registry)).toEqual([]);
  });

  it("n'expose jamais à un visiteur une annonce membre ou admin", async () => {
    const { listLive } = await import("./whats-new-server");
    const registry = [make({ id: "m", surface: "member" }), make({ id: "a", surface: "admin" }), make({ id: "p", surface: "public" })];
    expect((await listLive("public", ctx(null), NOW, registry)).map((a) => a.id)).toEqual(["p"]);
  });

  it("exclut l'annonce dont la fonctionnalité est indisponible", async () => {
    const { listLive } = await import("./whats-new-server");
    const registry = [make({ id: "parrainage", availability: "referral" })]; // programme désactivé
    expect(await listLive("member", ctx(), NOW, registry)).toEqual([]);
  });
});

describe("statut pour l'administration (describeStatus)", () => {
  it("distingue inactive, programmée, expirée, indisponible et en ligne", async () => {
    const { describeStatus } = await import("./whats-new-server");
    expect(await describeStatus(make({ active: false }), ctx(null), NOW)).toBe("inactive");
    expect(await describeStatus(make({ activatesAt: "2027-01-01T00:00:00Z" }), ctx(null), NOW)).toBe("scheduled");
    expect(await describeStatus(make({ expiresAt: "2026-12-02T00:00:00Z" }), ctx(null), NOW)).toBe("expired");
    expect(await describeStatus(make({ availability: "referral" }), ctx(null), NOW)).toBe("unavailable");
    expect(await describeStatus(make(), ctx(null), NOW)).toBe("live");
  });
});

describe("vue envoyée au client", () => {
  it("n'expose ni `active` ni `availability`", async () => {
    const { toView } = await import("./whats-new-server");
    const v = toView(make(), { dismissed: true }) as unknown as Record<string, unknown>;
    expect(v).not.toHaveProperty("active");
    expect(v).not.toHaveProperty("availability");
    expect(v.dismissed).toBe(true);
    expect(v.discovered).toBe(false);
  });
});
