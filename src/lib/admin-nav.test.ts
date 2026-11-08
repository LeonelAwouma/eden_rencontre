import { describe, expect, it } from "vitest";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, activeAdminNavHref } from "./admin-nav";

/** Adresses de l'ancienne barre latérale : aucune ne doit disparaître. */
const PREVIOUS_HREFS = [
  "/admin/dashboard", "/admin/users", "/admin/photos", "/admin/matching",
  "/admin/testimonials", "/admin/chat-monitoring", "/admin/messages", "/admin/events",
  "/admin/meets", "/admin/mediatheque", "/admin/forum", "/admin/blog",
  "/admin/accessibilite", "/admin/reports", "/admin/referrals", "/admin/payments",
  "/admin/analytics", "/admin/announcements", "/admin/settings",
];

describe("admin-nav", () => {
  it("conserve toutes les entrées existantes", () => {
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href);
    for (const href of PREVIOUS_HREFS) expect(hrefs, href).toContain(href);
  });

  it("rend accessibles les pages auparavant hors barre latérale", () => {
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href);
    for (const href of ["/admin/users/coaches", "/admin/meetings", "/admin/analytics/lessons"]) {
      expect(hrefs, href).toContain(href);
    }
  });

  it("répartit les entrées en 10 catégories, toutes non vides, sans identifiant ni adresse en double", () => {
    expect(ADMIN_NAV_GROUPS).toHaveLength(10);
    for (const g of ADMIN_NAV_GROUPS) {
      expect(ADMIN_NAV_ITEMS.some((i) => i.group === g.id), g.id).toBe(true);
    }
    const groupIds = new Set(ADMIN_NAV_GROUPS.map((g) => g.id));
    for (const i of ADMIN_NAV_ITEMS) expect(groupIds.has(i.group), i.id).toBe(true);
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.id)).size).toBe(ADMIN_NAV_ITEMS.length);
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.href)).size).toBe(ADMIN_NAV_ITEMS.length);
  });

  it("n'utilise que des routes internes sous /admin", () => {
    for (const i of ADMIN_NAV_ITEMS) expect(i.href.startsWith("/admin/")).toBe(true);
  });

  it("activeAdminNavHref : la correspondance la plus précise l'emporte", () => {
    expect(activeAdminNavHref("/admin/users")).toBe("/admin/users");
    expect(activeAdminNavHref("/admin/users/abc")).toBe("/admin/users");
    expect(activeAdminNavHref("/admin/users/coaches")).toBe("/admin/users/coaches");
    expect(activeAdminNavHref("/admin/analytics")).toBe("/admin/analytics");
    expect(activeAdminNavHref("/admin/analytics/lessons")).toBe("/admin/analytics/lessons");
    expect(activeAdminNavHref("/admin/meets/42/salle")).toBe("/admin/meets");
    expect(activeAdminNavHref("/admin/meetings")).toBe("/admin/meetings");
  });

  it("activeAdminNavHref : jamais de simple préfixe de texte, ni d'adresse inconnue", () => {
    expect(activeAdminNavHref("/admin/usersx")).toBeNull();
    expect(activeAdminNavHref("/admin/meetingsfoo")).toBeNull();
    expect(activeAdminNavHref("/admin/inconnu")).toBeNull();
    expect(activeAdminNavHref("/admin")).toBeNull();
  });
});
