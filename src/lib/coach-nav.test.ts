import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { COACH_DESTS, COACH_GROUPS, COACH_PRIMARY, COACH_PRIMARY_IDS, isCoachRouteActive } from "./coach-nav";
import { COACH_NAV_ICONS } from "@/components/coach/coach-nav-icons";

const resolve = (dict: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((acc, part) =>
    acc && typeof acc === "object" && part in (acc as Record<string, unknown>) ? (acc as Record<string, unknown>)[part] : undefined, dict);

const allDests = COACH_GROUPS.flatMap((g) => g.dests);
const routes = allDests.filter((d) => d.kind === "route");

describe("coach-nav", () => {
  it("n'expose QUE les entrées des lots 2 et 3 : rien du lot 4 (ressources, supervision), aucune messagerie", () => {
    expect(routes.map((d) => (d.kind === "route" ? d.href : ""))).toEqual([
      "/coach", "/coach/members", "/coach/formation", "/coach/sessions", "/coach/reports", "/coach/profile",
    ]);
    for (const d of routes) {
      if (d.kind !== "route") continue;
      expect(d.href).not.toMatch(/message|messag|chat|resource|ressource|supervis|couple|admin/i);
    }
    for (const d of allDests) expect(d.id).not.toMatch(/message|chat|resource|couple/i);
  });

  it("traduit chaque libellé et chaque titre de groupe en français et en anglais", () => {
    for (const key of [...allDests.map((d) => d.labelKey), ...COACH_GROUPS.map((g) => g.labelKey)]) {
      expect(resolve(fr, key), `fr.${key}`).toEqual(expect.any(String));
      expect(resolve(en, key), `en.${key}`).toEqual(expect.any(String));
    }
  });

  it("ne répète aucun identifiant ni aucune adresse", () => {
    const ids = allDests.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const hrefs = routes.map((d) => (d.kind === "route" ? d.href : ""));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("chaque destination a une icône et la barre inférieure ne référence que des destinations existantes", () => {
    for (const d of allDests) expect(COACH_NAV_ICONS[d.id], `icône « ${d.id} »`).toBeDefined();
    for (const id of COACH_PRIMARY_IDS) expect(COACH_DESTS[id], id).toBeDefined();
    expect(COACH_PRIMARY).toHaveLength(COACH_PRIMARY_IDS.length);
  });

  it("n'utilise que des routes internes sous /coach", () => {
    for (const d of routes) if (d.kind === "route") expect(d.href === "/coach" || d.href.startsWith("/coach/")).toBe(true);
  });

  it("isCoachRouteActive : « Vue d'ensemble » exacte, les autres aussi sur leurs sous-pages", () => {
    expect(isCoachRouteActive("/coach", "/coach")).toBe(true);
    expect(isCoachRouteActive("/coach/members", "/coach")).toBe(false);
    expect(isCoachRouteActive("/coach/members", "/coach/members")).toBe(true);
    expect(isCoachRouteActive("/coach/members/abc", "/coach/members")).toBe(true);
    expect(isCoachRouteActive("/coach/membership", "/coach/members")).toBe(false);
  });
});
