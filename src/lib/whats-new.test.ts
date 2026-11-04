import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEMBER_GROUPS, destHref } from "./member-nav";
import { RESOLVERS } from "./whats-new-server";
import {
  ANNOUNCEMENTS, COPY_LIMITS, DEFAULT_LIFETIME_DAYS, badgeTarget, badgeTargets, effectiveExpiry,
  getAnnouncement, isInWindow, isSafeInternalHref, localize, matchesDestination, pickCard,
  type Announcement, type AnnouncementView,
} from "./whats-new";

/**
 * ── Garde-fous du REGISTRE réel ───────────────────────────────────────────────
 */

/**
 * Annonces dont l'activation a été décidée en connaissance de cause (fonctionnalité déployée,
 * activée et accessible en production). Ajouter un identifiant ici est le second geste, volontaire,
 * qui accompagne le passage de `active` à `true` dans le registre : aucune annonce ne peut donc
 * partir en ligne par simple oubli ou parce que son code existe sur une branche.
 */
const ACTIVATED_IDS: readonly string[] = [];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("registre des nouveautés", () => {
  it("n'active aucune annonce sans décision explicite", () => {
    const active = ANNOUNCEMENTS.filter((a) => a.active).map((a) => a.id).sort();
    expect(active).toEqual([...ACTIVATED_IDS].sort());
  });

  it("a des identifiants uniques, stables (kebab-case) et courts", () => {
    const ids = ANNOUNCEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id, id).toMatch(KEBAB);
      expect(id.length, id).toBeLessThanOrEqual(80);
    }
  });

  it("fournit un texte français ET anglais, court, non vide", () => {
    for (const a of ANNOUNCEMENTS) {
      for (const lang of ["fr", "en"] as const) {
        const c = a[lang];
        expect(c.title.trim().length, `${a.id} ${lang} title`).toBeGreaterThan(0);
        expect(c.title.length, `${a.id} ${lang} title`).toBeLessThanOrEqual(COPY_LIMITS.title);
        expect(c.description.trim().length, `${a.id} ${lang} description`).toBeGreaterThan(0);
        expect(c.description.length, `${a.id} ${lang} description`).toBeLessThanOrEqual(COPY_LIMITS.description);
        if (c.cta) expect(c.cta.length, `${a.id} ${lang} cta`).toBeLessThanOrEqual(COPY_LIMITS.cta);
      }
      // Pas de texte recopié tel quel d'une langue à l'autre (oubli de traduction).
      expect(a.en.title, a.id).not.toBe(a.fr.title);
    }
  });

  it("n'accepte que des destinations internes sûres, dans la bonne zone", () => {
    for (const a of ANNOUNCEMENTS) {
      for (const target of [a.href, a.navHref].filter(Boolean) as string[]) {
        expect(isSafeInternalHref(target), `${a.id} ${target}`).toBe(true);
        if (a.surface === "member") expect(target, a.id).toMatch(/^\/dashboard/);
        if (a.surface === "admin") expect(target, a.id).toMatch(/^\/admin\//);
      }
    }
  });

  it("badge une entrée de menu réelle (navHref ?? href), sans exiger que href figure au menu", () => {
    const memberMenu = new Set(MEMBER_GROUPS.flatMap((g) => g.dests).map(destHref).filter(Boolean));
    const adminSidebar = readFileSync("src/components/admin/sidebar.tsx", "utf8");

    for (const a of ANNOUNCEMENTS) {
      const target = badgeTarget(a);
      if (a.surface === "member") expect(memberMenu.has(target), `${a.id} → ${target}`).toBe(true);
      if (a.surface === "admin") expect(adminSidebar.includes(`href: "${target}"`), `${a.id} → ${target}`).toBe(true);
    }
  });

  it("autorise une destination `href` qui est une vraie sous-page absente du menu", () => {
    const formation = getAnnouncement("formations-pillars-2-3")!;
    const memberMenu = new Set(MEMBER_GROUPS.flatMap((g) => g.dests).map(destHref));
    expect(memberMenu.has(formation.href)).toBe(false); // la sous-page n'est pas au menu…
    expect(memberMenu.has(badgeTarget(formation))).toBe(true); // …mais l'entrée « Académie » l'est
    expect(badgeTarget(formation)).toBe("/dashboard/academie");
  });

  it("référence une clé de disponibilité qui a un résolveur serveur", () => {
    for (const a of ANNOUNCEMENTS) expect(Object.keys(RESOLVERS), a.id).toContain(a.availability);
  });

  it("a des dates cohérentes avec une durée de vie positive", () => {
    for (const a of ANNOUNCEMENTS) {
      expect(Number.isNaN(Date.parse(a.activatesAt)), `${a.id} activatesAt`).toBe(false);
      if (a.expiresAt) expect(Date.parse(a.expiresAt), `${a.id} expiresAt`).toBeGreaterThan(Date.parse(a.activatesAt));
      expect(effectiveExpiry(a), a.id).toBeGreaterThan(Date.parse(a.activatesAt));
    }
  });
});

/**
 * ── Logique de sélection (jeux d'essai) ───────────────────────────────────────
 */

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-12-01T00:00:00Z");

const fixture = (over: Partial<Announcement> = {}): Announcement => ({
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

const view = (over: Partial<AnnouncementView> = {}): AnnouncementView => ({
  id: "essai",
  surface: "member",
  href: "/dashboard/forum",
  activatesAt: "2026-12-01T00:00:00Z",
  fr: { title: "Titre", description: "Description" },
  en: { title: "Title", description: "Description" },
  dismissed: false,
  discovered: false,
  ...over,
});

describe("fenêtre de validité", () => {
  it("n'affiche rien avant l'activation, ni une fois expirée", () => {
    const a = fixture({ expiresAt: "2026-12-10T00:00:00Z" });
    expect(isInWindow(a, T0 - 1)).toBe(false);
    expect(isInWindow(a, T0)).toBe(true);
    expect(isInWindow(a, Date.parse("2026-12-10T00:00:00Z"))).toBe(false);
  });

  it("éteint d'elle-même une annonce sans expiresAt après la durée par défaut", () => {
    const a = fixture();
    expect(DEFAULT_LIFETIME_DAYS).toBe(45);
    expect(isInWindow(a, T0 + 44 * DAY)).toBe(true);
    expect(isInWindow(a, T0 + 45 * DAY)).toBe(false);
  });

  it("`active: false` l'emporte toujours, même en pleine fenêtre de dates", () => {
    expect(isInWindow(fixture({ active: false }), T0 + DAY)).toBe(false);
  });
});

describe("fermer n'est pas découvrir", () => {
  it("une carte fermée disparaît mais son badge reste", () => {
    const views = [view({ dismissed: true })];
    expect(pickCard(views)).toBeNull();
    expect(badgeTargets(views)).toEqual(["/dashboard/forum"]);
  });

  it("une fonctionnalité découverte éteint la carte ET le badge", () => {
    const views = [view({ discovered: true })];
    expect(pickCard(views)).toBeNull();
    expect(badgeTargets(views)).toEqual([]);
  });

  it("fermer la carte prioritaire laisse la suivante apparaître", () => {
    const high = view({ id: "a", priority: 20 });
    const low = view({ id: "b", priority: 10 });
    expect(pickCard([low, high])?.id).toBe("a");
    expect(pickCard([low, { ...high, dismissed: true }])?.id).toBe("b");
  });

  it("n'affiche jamais plus d'une carte à la fois", () => {
    const many = [view({ id: "a" }), view({ id: "b" }), view({ id: "c" })];
    expect(pickCard(many)).not.toBeNull();
    expect(Array.isArray(pickCard(many))).toBe(false);
  });

  it("à priorité égale, la plus récente passe d'abord", () => {
    const older = view({ id: "old", activatesAt: "2026-12-01T00:00:00Z" });
    const newer = view({ id: "new", activatesAt: "2026-12-05T00:00:00Z" });
    expect(pickCard([older, newer])?.id).toBe("new");
  });
});

describe("badge sur navHref, destination sur href", () => {
  it("badge l'entrée parente quand navHref est fourni", () => {
    const v = view({ href: "/dashboard/academie/batir-sur-le-roc", navHref: "/dashboard/academie" });
    expect(badgeTargets([v])).toEqual(["/dashboard/academie"]);
  });

  it("retombe sur href sans navHref, et ne duplique pas une entrée", () => {
    expect(badgeTargets([view(), view({ id: "autre" })])).toEqual(["/dashboard/forum"]);
  });
});

describe("découverte = la vraie destination atteinte", () => {
  const href = "/dashboard/academie/batir-sur-le-roc";

  it("ouvrir la section parente « Académie » ne compte pas", () => {
    expect(matchesDestination(href, "/dashboard/academie", null)).toBe(false);
  });

  it("ouvrir la formation, ou une leçon dessous, compte", () => {
    expect(matchesDestination(href, "/dashboard/academie/batir-sur-le-roc", null)).toBe(true);
    expect(matchesDestination(href, "/dashboard/academie/batir-sur-le-roc/1-2", null)).toBe(true);
  });

  it("ne confond pas deux chemins qui partagent un préfixe de texte", () => {
    expect(matchesDestination("/dashboard/forum", "/dashboard/forum-archive", null)).toBe(false);
  });

  it("une destination à onglet exige cet onglet", () => {
    expect(matchesDestination("/dashboard?tab=Messages", "/dashboard", "Messages")).toBe(true);
    expect(matchesDestination("/dashboard?tab=Messages", "/dashboard", "Home")).toBe(false);
    expect(matchesDestination("/dashboard?tab=Messages", "/dashboard", null)).toBe(false);
  });
});

describe("outils", () => {
  it("refuse les destinations externes ou ambiguës", () => {
    for (const bad of ["https://exemple.com", "//exemple.com", "javascript:alert(1)", "dashboard", "/a b", "/a\\b", ""]) {
      expect(isSafeInternalHref(bad), bad).toBe(false);
    }
    expect(isSafeInternalHref("/dashboard/forum")).toBe(true);
    expect(isSafeInternalHref("/dashboard?tab=Messages")).toBe(true);
  });

  it("choisit le texte selon la langue, avec repli français", () => {
    const v = view();
    expect(localize(v, "en").title).toBe("Title");
    expect(localize(v, "fr").title).toBe("Titre");
    expect(localize(v, "de").title).toBe("Titre");
  });
});
