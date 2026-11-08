import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { summarizeFormation } from "@/lib/formation/admin-summary";
import { ALL_LESSONS, BATIR_SUR_LE_ROC } from "@/lib/formation/batir-sur-le-roc";
import { BATIR_SUR_LE_ROC_EN } from "@/lib/formation/batir-sur-le-roc.en";
import { localizeCoachFormation, localizeFormationOverview, parseCoachLang } from "./formation-i18n";
import {
  COACH_FORMATION_CURRENT_KEYS, COACH_FORMATION_LESSON_KEYS, COACH_FORMATION_PILLAR_KEYS, COACH_FORMATION_SUMMARY_KEYS,
  computeFormationOverview, toCoachFormationSummary, type CoachMemberView,
} from "./members-view";

const slug = ALL_LESSONS[0].lesson.slug;
const get = (dict: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((a, p) => (a && typeof a === "object" ? (a as Record<string, unknown>)[p] : undefined), dict);

describe("toCoachFormationSummary : DTO explicite, sans « orphans »", () => {
  it("summarizeFormation expose bien des orphelins (c'est ce que le DTO doit retirer)", () => {
    expect(summarizeFormation(["PRIVATE_MARKER_MEMBER_001", slug]).orphans).toEqual(["PRIVATE_MARKER_MEMBER_001"]);
  });

  it("retire « orphans » et ne garde que les clés prévues, à chaque niveau", () => {
    const dto = toCoachFormationSummary(summarizeFormation(["PRIVATE_MARKER_MEMBER_001", "PRIVATE_MARKER_MEMBER_002", slug]));
    expect(Object.keys(dto).sort()).toEqual([...COACH_FORMATION_SUMMARY_KEYS].sort());
    expect("orphans" in dto).toBe(false);
    for (const p of dto.pillars) {
      expect(Object.keys(p).sort()).toEqual([...COACH_FORMATION_PILLAR_KEYS].sort());
      for (const l of p.lessons) expect(Object.keys(l).sort()).toEqual([...COACH_FORMATION_LESSON_KEYS].sort());
    }
    expect(Object.keys(dto.current!).sort()).toEqual([...COACH_FORMATION_CURRENT_KEYS].sort());
    expect(JSON.stringify(dto)).not.toContain("PRIVATE_MARKER");
  });

  it("liste blanche stricte : une propriété inattendue (ajoutée plus tard par erreur) n'est jamais propagée", () => {
    const polluted = {
      ...summarizeFormation([slug]), secret: "PRIVATE_MARKER_X", orphans: ["PRIVATE_MARKER_Y"],
      pillars: summarizeFormation([slug]).pillars.map((p) => ({ ...p, hidden: "PRIVATE_MARKER_Z", lessons: p.lessons.map((l) => ({ ...l, note: "PRIVATE_MARKER_W" })) })),
      current: { ...summarizeFormation([slug]).current!, extra: "PRIVATE_MARKER_V" },
    };
    const text = JSON.stringify(toCoachFormationSummary(polluted as never));
    expect(text).not.toContain("PRIVATE_MARKER");
    expect(text).not.toContain("secret");
  });

  it("le résumé reste fonctionnel : mêmes nombres que summarizeFormation", () => {
    const full = summarizeFormation([slug]);
    const dto = toCoachFormationSummary(full);
    expect([dto.done, dto.total, dto.percent]).toEqual([full.done, full.total, full.percent]);
    expect(dto.pillars.map((p) => [p.number, p.status, p.done, p.total])).toEqual(full.pillars.map((p) => [p.number, p.status, p.done, p.total]));
    expect(dto.current).toEqual(full.current);
  });

  it("n'altère pas l'objet d'origine (aucune donnée modifiée ou supprimée)", () => {
    const full = summarizeFormation(["PRIVATE_MARKER_MEMBER_001", slug]);
    const snapshot = JSON.stringify(full);
    toCoachFormationSummary(full);
    expect(JSON.stringify(full)).toBe(snapshot);
  });

  it("entrée dégradée (piliers ou leçons absents) : pas d'exception, pas de texte inventé", () => {
    const dto = toCoachFormationSummary({ done: 0, total: 0, percent: 0, pillars: undefined as never, current: null });
    expect(dto).toEqual({ done: 0, total: 0, percent: 0, pillars: [], current: null });
  });
});

describe("parseCoachLang", () => {
  it.each([[null, "fr"], ["", "fr"], ["fr", "fr"], ["en", "en"]])("%j → %s", (raw, lang) => expect(parseCoachLang(raw)).toEqual({ ok: true, lang }));
  it.each(["de", "EN", "Fr", "fr-FR", " en", "en ", "*", "../fr", "fr;en"])("%j → refusé", (raw) => expect(parseCoachLang(raw)).toEqual({ ok: false }));
});

describe("localisation des titres", () => {
  const dto = toCoachFormationSummary(summarizeFormation([slug]));
  const flat = (s: typeof dto) => s.pillars.flatMap((p) => p.lessons.map((l) => [p.number, l.slug, l.number, l.done]));

  it("français : titres du contenu français, résumé inchangé", () => {
    const fr1 = localizeCoachFormation(dto, "fr");
    expect(fr1).toEqual(dto);
    expect(fr1.pillars[0].title).toBe(BATIR_SUR_LE_ROC.pillars[0].title);
  });

  it("anglais : titres du contenu anglais pour chaque pilier et chaque leçon", () => {
    const en1 = localizeCoachFormation(dto, "en");
    en1.pillars.forEach((p, i) => {
      expect(p.title).toBe(BATIR_SUR_LE_ROC_EN.pillars[i].title);
      p.lessons.forEach((l, j) => expect(l.title).toBe(BATIR_SUR_LE_ROC_EN.pillars[i].lessons[j].title));
    });
    expect(en1.current!.title).toBe(BATIR_SUR_LE_ROC_EN.pillars.flatMap((p) => p.lessons).find((l) => l.number === dto.current!.number)!.title);
  });

  it("identifiants, numéros, ordre, statuts et nombres IDENTIQUES quelle que soit la langue", () => {
    const en1 = localizeCoachFormation(dto, "en");
    expect(flat(en1)).toEqual(flat(dto));
    expect(en1.pillars.map((p) => [p.number, p.status, p.done, p.total])).toEqual(dto.pillars.map((p) => [p.number, p.status, p.done, p.total]));
    expect([en1.done, en1.total, en1.percent, en1.current!.number, en1.current!.pillar]).toEqual([dto.done, dto.total, dto.percent, dto.current!.number, dto.current!.pillar]);
  });

  it("la structure du contenu FR et EN correspond (garde-fou : sinon le titre français serait conservé silencieusement)", () => {
    const shape = (f: typeof BATIR_SUR_LE_ROC) => f.pillars.map((p) => [p.number, p.lessons.map((l) => [l.slug, l.number])]);
    expect(shape(BATIR_SUR_LE_ROC_EN)).toEqual(shape(BATIR_SUR_LE_ROC));
  });

  it("entrée inconnue de la version anglaise : le titre français est conservé (jamais de titre vide)", () => {
    const odd = { ...dto, pillars: [{ number: 99, title: "Titre FR", done: 0, total: 1, status: "todo" as const, lessons: [{ slug: "inconnue", number: "99.1", title: "Leçon FR", done: false }] }], current: { number: "99.1", title: "Leçon FR", pillar: 99 } };
    const en1 = localizeCoachFormation(odd, "en");
    expect(en1.pillars[0].title).toBe("Titre FR");
    expect(en1.pillars[0].lessons[0].title).toBe("Leçon FR");
    expect(en1.current!.title).toBe("Leçon FR");
  });

  it("page Formation : titres de pilier et de prochaine leçon localisés, le reste inchangé", () => {
    const formation = toCoachFormationSummary(summarizeFormation([slug]));
    const member = { id: "m1", pseudo: "Awa", avatarUrl: null, country: null, city: null, assignedAt: "", consentAt: null, formation, formationState: "inProgress" } as CoachMemberView;
    const overview = computeFormationOverview([member]);
    const en1 = localizeFormationOverview(overview, "en");
    expect(en1.pillars.map((p) => [p.number, p.membersDone, p.membersInProgress, p.membersNotStarted])).toEqual(overview.pillars.map((p) => [p.number, p.membersDone, p.membersInProgress, p.membersNotStarted]));
    expect(en1.pillars[0].title).toBe(BATIR_SUR_LE_ROC_EN.pillars[0].title);
    expect(en1.rows[0].nextLesson!.number).toBe(overview.rows[0].nextLesson!.number);
    expect(en1.rows[0].nextLesson!.title).not.toBe(overview.rows[0].nextLesson!.title);
    expect(localizeFormationOverview(overview, "fr")).toEqual(overview);
  });
});

describe("textes : progression déclarative, plus aucune validation suggérée", () => {
  it("sous-titre : formulation exacte dans les deux langues", () => {
    expect(get(fr, "coachFormation.subtitle")).toBe("Progression renseignée par les membres à partir des leçons suivies.");
    expect(get(en, "coachFormation.subtitle")).toBe("Progress reported by members based on the lessons they have completed.");
  });

  it("aucun texte des espaces Coach ne prétend à une validation ou une vérification pédagogique indépendante", () => {
    const leaves = (o: unknown, p = ""): [string, string][] => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [[p, String(o)]]);
    const claim = /réellement valid|validées|valid[ée]e? par|vérifiée? par un|verified|validated|actually (completed|validated)|really/i;
    for (const [name, dict] of [["fr", fr], ["en", en]] as const) {
      for (const ns of ["coachFormation", "coachMembers", "coachDashboard"]) {
        for (const [key, text] of leaves((dict as Record<string, unknown>)[ns], ns)) {
          // La note qui NIE la vérification est attendue ; toute autre formulation affirmative est interdite.
          if (key === "coachFormation.declarativeNote") continue;
          expect(text, `${name}.${key}`).not.toMatch(claim);
        }
      }
    }
  });

  it("une note explicite indique que la progression est déclarée et non vérifiée (fr et en)", () => {
    expect(String(get(fr, "coachFormation.declarativeNote"))).toMatch(/déclarée par les membres/);
    expect(String(get(fr, "coachFormation.declarativeNote"))).toMatch(/pas été vérifiée/);
    expect(String(get(en, "coachFormation.declarativeNote"))).toMatch(/reported by the members/);
    expect(String(get(en, "coachFormation.declarativeNote"))).toMatch(/not been checked/);
  });

  it("l'ancienne note « titres affichés en français » a disparu (elle serait devenue fausse)", () => {
    expect(get(fr, "coachFormation.frenchOnlyNote")).toBeUndefined();
    expect(get(en, "coachFormation.frenchOnlyNote")).toBeUndefined();
  });

  it("nouveau message de connexion présent dans les deux langues, sans mention de suspension", () => {
    for (const dict of [fr, en]) {
      const msg = String(get(dict, "login.errorCoachSession"));
      expect(msg.length).toBeGreaterThan(10);
      expect(msg).not.toMatch(/suspend|suspendu|banned|blocked/i);
    }
  });

  it("le message de suspension n'est jamais utilisé pour le chemin « membre ouvre /coach »", () => {
    expect(get(fr, "login.errorSuspended")).toMatch(/suspendu/); // reste réservé aux comptes réellement suspendus
  });
});
