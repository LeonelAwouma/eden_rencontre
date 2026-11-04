import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { TABS } from "@/components/dashboard/dashboard-types";
import { MEMBER_DESTS, MEMBER_GROUPS, MEMBER_PRIMARY_IDS } from "./member-nav";

/**
 * Ces tests verrouillent ce qui casse silencieusement dans la navigation :
 * un libellé non traduit s'affiche sous forme de clé brute (`t()` renvoie la clé
 * quand elle est absente), et un onglet hors de `TABS` est rejeté par la liste
 * blanche de `?tab=` — dans les deux cas sans erreur visible au build.
 */

const resolve = (dict: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);

const allDests = MEMBER_GROUPS.flatMap((g) => g.dests);

describe("member-nav", () => {
  it("traduit chaque libellé de destination en français et en anglais", () => {
    for (const dest of allDests) {
      expect(resolve(fr, dest.labelKey), `fr.${dest.labelKey}`).toEqual(expect.any(String));
      expect(resolve(en, dest.labelKey), `en.${dest.labelKey}`).toEqual(expect.any(String));
    }
  });

  it("traduit chaque titre de groupe en français et en anglais", () => {
    for (const group of MEMBER_GROUPS) {
      expect(resolve(fr, group.labelKey), `fr.${group.labelKey}`).toEqual(expect.any(String));
      expect(resolve(en, group.labelKey), `en.${group.labelKey}`).toEqual(expect.any(String));
    }
  });

  it("n'utilise que des onglets connus de TABS", () => {
    for (const dest of allDests) {
      if (dest.kind === "tab") expect(TABS).toContain(dest.tab);
    }
  });

  it("ne répète aucune destination dans les menus", () => {
    const ids = allDests.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);

    const hrefs = allDests.flatMap((d) => (d.kind === "route" ? [d.href] : []));
    expect(new Set(hrefs).size).toBe(hrefs.length);

    const tabs = allDests.flatMap((d) => (d.kind === "tab" ? [d.tab] : []));
    expect(new Set(tabs).size).toBe(tabs.length);
  });

  it("expose les entrées de la barre inférieure dans le registre", () => {
    for (const id of MEMBER_PRIMARY_IDS) {
      expect(MEMBER_DESTS[id], `destination « ${id} » manquante`).toBeDefined();
    }
  });
});
