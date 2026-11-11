import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, ADMIN_SETTINGS_ITEM,
  activeAdminGroupId, activeAdminNavHref, parseOpenGroups, withActiveGroupOpen,
  type AdminNavGroupId,
} from "./admin-nav";

/** Adresses de l'ancienne barre latérale : aucune ne doit disparaître ni changer. */
const PREVIOUS_HREFS = [
  "/admin/dashboard", "/admin/users", "/admin/photos", "/admin/matching",
  "/admin/testimonials", "/admin/chat-monitoring", "/admin/messages", "/admin/events",
  "/admin/meets", "/admin/mediatheque", "/admin/forum", "/admin/blog",
  "/admin/accessibilite", "/admin/reports", "/admin/referrals", "/admin/payments",
  "/admin/analytics", "/admin/announcements", "/admin/settings",
  "/admin/users/coaches", "/admin/users/coach-assignments", "/admin/meetings", "/admin/analytics/lessons", "/admin/password-resets",
];

/** Identifiants d'entrées d'avant le refactoring : ils restent stables. */
const PREVIOUS_IDS = [
  "dashboard", "users", "photos", "password-resets", "accessibility", "coaches", "matching",
  "chat-monitoring", "messages", "forum", "reports", "testimonials", "events", "meets",
  "coach-assignments", "meetings", "mediatheque", "blog", "announcements", "payments", "referrals",
  "analytics", "analytics-lessons", "settings",
];

const EXPECTED_GROUPS: Record<AdminNavGroupId, string[]> = {
  pilotage: ["/admin/dashboard", "/admin/analytics", "/admin/analytics/lessons"],
  members: ["/admin/users", "/admin/users/coaches", "/admin/users/coach-assignments", "/admin/photos", "/admin/password-resets", "/admin/accessibilite"],
  encounters: ["/admin/matching", "/admin/events", "/admin/meets", "/admin/meetings"],
  community: ["/admin/chat-monitoring", "/admin/messages", "/admin/forum", "/admin/reports"],
  content: ["/admin/mediatheque", "/admin/blog", "/admin/announcements", "/admin/testimonials"],
  finance: ["/admin/payments", "/admin/referrals"],
};

describe("admin-nav : structure", () => {
  it("conserve toutes les entrées et toutes les adresses existantes", () => {
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href);
    for (const href of PREVIOUS_HREFS) expect(hrefs, href).toContain(href);
    expect(hrefs).toHaveLength(PREVIOUS_HREFS.length);
  });

  it("conserve les identifiants stables des entrées", () => {
    expect(ADMIN_NAV_ITEMS.map((i) => i.id).sort()).toEqual([...PREVIOUS_IDS].sort());
  });

  it("définit exactement les six rubriques métier, dans l'ordre, toutes non vides", () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual(
      ["pilotage", "members", "encounters", "community", "content", "finance"],
    );
    expect(ADMIN_NAV_GROUPS.map((g) => g.label)).toEqual([
      "Pilotage", "Membres & Coachs", "Rencontres & Accompagnement",
      "Communauté & Modération", "Contenus & Communication", "Finance & Croissance",
    ]);
    for (const g of ADMIN_NAV_GROUPS) {
      expect(ADMIN_NAV_ITEMS.some((i) => i.group === g.id), g.id).toBe(true);
    }
  });

  it("affecte chaque entrée à la bonne rubrique", () => {
    for (const [group, hrefs] of Object.entries(EXPECTED_GROUPS)) {
      const actual = ADMIN_NAV_ITEMS.filter((i) => i.group === group).map((i) => i.href);
      expect(actual.sort(), group).toEqual([...hrefs].sort());
    }
  });

  it("garde Paramètres indépendant des six rubriques", () => {
    expect(ADMIN_SETTINGS_ITEM.href).toBe("/admin/settings");
    expect(ADMIN_SETTINGS_ITEM.group).toBeNull();
    const groupIds = new Set<string>(ADMIN_NAV_GROUPS.map((g) => g.id));
    const grouped = ADMIN_NAV_ITEMS.filter((i) => i.group !== null);
    for (const i of grouped) expect(groupIds.has(i.group as string), i.id).toBe(true);
    expect(ADMIN_NAV_ITEMS.filter((i) => i.group === null)).toEqual([ADMIN_SETTINGS_ITEM]);
  });

  it("n'a ni identifiant ni adresse en double", () => {
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.id)).size).toBe(ADMIN_NAV_ITEMS.length);
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.href)).size).toBe(ADMIN_NAV_ITEMS.length);
  });

  it("n'utilise que des routes internes sous /admin", () => {
    for (const i of ADMIN_NAV_ITEMS) expect(i.href.startsWith("/admin/")).toBe(true);
  });
});

describe("admin-nav : entrée active", () => {
  const label = (path: string) => {
    const href = activeAdminNavHref(path);
    return ADMIN_NAV_ITEMS.find((i) => i.href === href)?.label;
  };

  it("la correspondance la plus précise l'emporte", () => {
    expect(label("/admin/dashboard")).toBe("Tableau de bord");
    expect(label("/admin/users")).toBe("Utilisateurs");
    expect(label("/admin/users/abc")).toBe("Utilisateurs");
    expect(label("/admin/users/coaches")).toBe("Coachs");
    expect(label("/admin/matching")).toBe("Matching");
    expect(label("/admin/events")).toBe("Événements");
    expect(label("/admin/meetings")).toBe("Rendez-vous");
    expect(label("/admin/meets/42/salle")).toBe("Visioconférences");
    expect(label("/admin/mediatheque")).toBe("Médiathèque et Académie du Mariage");
    expect(label("/admin/mediatheque/academie")).toBe("Médiathèque et Académie du Mariage");
    expect(label("/admin/blog/new")).toBe("Blog");
    expect(label("/admin/analytics")).toBe("Analytics");
    expect(label("/admin/analytics/lessons")).toBe("Analyse des leçons");
    expect(label("/admin/settings")).toBe("Paramètres");
  });

  it("jamais de simple préfixe de texte, ni d'adresse inconnue", () => {
    expect(activeAdminNavHref("/admin/usersx")).toBeNull();
    expect(activeAdminNavHref("/admin/meetingsfoo")).toBeNull();
    expect(activeAdminNavHref("/admin/inconnu")).toBeNull();
    expect(activeAdminNavHref("/admin")).toBeNull();
  });

  it("activeAdminGroupId : rubrique de la page consultée", () => {
    expect(activeAdminGroupId("/admin/users/coaches")).toBe("members");
    expect(activeAdminGroupId("/admin/analytics/lessons")).toBe("pilotage");
    expect(activeAdminGroupId("/admin/blog/new")).toBe("content");
    expect(activeAdminGroupId("/admin/payments")).toBe("finance");
    expect(activeAdminGroupId("/admin/settings")).toBeNull();
    expect(activeAdminGroupId("/admin/inconnu")).toBeNull();
  });
});

describe("admin-nav : rubriques ouvertes", () => {
  it("parseOpenGroups ignore les valeurs invalides", () => {
    expect(parseOpenGroups(null)).toEqual([]);
    expect(parseOpenGroups("pas du json")).toEqual([]);
    expect(parseOpenGroups('{"a":1}')).toEqual([]);
    expect(parseOpenGroups('["members","inconnu",3,"finance"]')).toEqual(["members", "finance"]);
  });

  it("withActiveGroupOpen conserve plusieurs rubriques ouvertes et ouvre l'active", () => {
    const open = new Set<AdminNavGroupId>(["members", "finance"]);
    const next = withActiveGroupOpen(open, "content");
    expect([...next].sort()).toEqual(["content", "finance", "members"]);
    expect(open.has("content")).toBe(false);
    expect(withActiveGroupOpen(open, null)).toEqual(open);
  });
});
