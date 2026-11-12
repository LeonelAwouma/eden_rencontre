import { describe, expect, it } from "vitest";
import {
  QUESTIONNAIRES, answerLabel, describeMissingQuestions, fieldChoices, getOnboardingSteps, getQuestionnaires, toggleMultiValue,
  type Field, type Questionnaire,
} from "./onboarding";
import { QUESTIONNAIRES_EN } from "./onboarding.en";
import { DISCOVERY_SOURCE_VALUES, MARRIAGE_VISION_IDS, discoverySourceLabel, marriageVisionLabel } from "./questionnaire-choices";
import { MARRIAGE_VALUES } from "./values";
import { DISCOVERY_SOURCE_OPTIONS } from "./discovery-sources";

const fieldsOf = (qs: Questionnaire[]) => qs.flatMap((q) => q.sections.flatMap((s) => s.fields.map((f) => ({ q: q.key, s: s.key, f }))));
const find = (qs: Questionnaire[], id: string): Field => fieldsOf(qs).find((x) => x.f.id === id)!.f;

describe("parité français / anglais du questionnaire", () => {
  it("mêmes questionnaires, sections, identifiants, types et conditions, dans le même ordre", () => {
    const shape = (qs: Questionnaire[]) => fieldsOf(qs).map(({ q, s, f }) => ({
      q, s, id: f.id, type: f.type, max: f.max ?? null, min: f.min ?? null, showIf: f.showIf ?? null,
      options: f.options?.length ?? null, values: f.choices?.map((c) => c.value) ?? null,
    }));
    expect(shape(QUESTIONNAIRES_EN)).toEqual(shape(QUESTIONNAIRES));
  });

  it("aucun identifiant de question en double", () => {
    const ids = fieldsOf(QUESTIONNAIRES).map((x) => x.f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("questions réintégrées : vision du mariage et source de découverte", () => {
  it.each([["fr", QUESTIONNAIRES], ["en", QUESTIONNAIRES_EN]] as const)("%s : présentes, au bon endroit, avec un libellé et une aide", (_locale, qs) => {
    const vision = fieldsOf(qs).find((x) => x.f.id === "marriageVision")!;
    expect(vision).toMatchObject({ q: "q3", s: "attentes" });
    expect(vision.f).toMatchObject({ type: "multi", min: 1, max: 3 });
    const source = fieldsOf(qs).find((x) => x.f.id === "discoverySource")!;
    expect(source).toMatchObject({ q: "q3", s: "questionsFinales" });
    expect(source.f.type).toBe("single");
    for (const f of [vision.f, source.f]) {
      expect(f.label.trim()).not.toBe("");
      expect(f.help?.trim()).toBeTruthy();
      for (const c of f.choices!) expect(c.label.trim()).not.toBe("");
    }
  });

  it("les valeurs enregistrées sont canoniques et identiques dans les deux langues ; seuls les libellés changent", () => {
    expect(find(QUESTIONNAIRES, "marriageVision").choices!.map((c) => c.value)).toEqual(MARRIAGE_VALUES.map((v) => v.id));
    expect(find(QUESTIONNAIRES_EN, "marriageVision").choices!.map((c) => c.value)).toEqual([...MARRIAGE_VISION_IDS]);
    expect(find(QUESTIONNAIRES, "discoverySource").choices!.map((c) => c.value)).toEqual([...DISCOVERY_SOURCE_OPTIONS]);
    expect(find(QUESTIONNAIRES_EN, "discoverySource").choices!.map((c) => c.value)).toEqual([...DISCOVERY_SOURCE_VALUES]);
    expect(find(QUESTIONNAIRES, "marriageVision").choices!.map((c) => c.label)).toEqual(MARRIAGE_VALUES.map((v) => v.label));
    expect(find(QUESTIONNAIRES_EN, "marriageVision").choices!.map((c) => c.label)).not.toEqual(MARRIAGE_VALUES.map((v) => v.label));
    expect(find(QUESTIONNAIRES_EN, "discoverySource").choices!.find((c) => c.value === "Bouche à oreille")!.label).toBe("Word of mouth");
  });

  it("une réponse enregistrée dans une langue s'affiche correctement dans l'autre (rechargement)", () => {
    const saved = { marriageVision: ["priere", "service"], discoverySource: "Bouche à oreille" };
    const reloaded = JSON.parse(JSON.stringify(saved));
    expect(reloaded.marriageVision.map((v: string) => answerLabel(find(QUESTIONNAIRES, "marriageVision"), v))).toEqual(["Prière Quotidienne", "Service à l'Église"]);
    expect(reloaded.marriageVision.map((v: string) => answerLabel(find(QUESTIONNAIRES_EN, "marriageVision"), v))).toEqual(["Daily Prayer", "Serving the Church"]);
    expect(answerLabel(find(QUESTIONNAIRES_EN, "discoverySource"), reloaded.discoverySource)).toBe("Word of mouth");
    expect(marriageVisionLabel("priere", "en")).toBe("Daily Prayer");
    expect(marriageVisionLabel("Mariage biblique", "en")).toBe("Mariage biblique");
    expect(discoverySourceLabel("Autre", "en")).toBe("Other");
    expect(discoverySourceLabel("Par un ami", "en")).toBe("Par un ami");
  });

  it("les questions classiques ne changent pas : valeur = libellé", () => {
    const langues = find(QUESTIONNAIRES, "langues");
    expect(fieldChoices(langues)).toEqual(langues.options!.map((o) => ({ value: o, label: o })));
    expect(answerLabel(langues, "Français")).toBe("Français");
    expect(answerLabel(find(QUESTIONNAIRES, "marriageVision"), "valeur inconnue")).toBe("valeur inconnue");
  });

  it("apparaissent dans les étapes d'onboarding des deux langues", () => {
    for (const locale of ["fr", "en"] as const) {
      const ids = getOnboardingSteps(locale).flatMap((s) => s.fields.map((f) => f.id));
      expect(ids).toContain("marriageVision");
      expect(ids).toContain("discoverySource");
      expect(getQuestionnaires(locale)).toHaveLength(3);
    }
  });

  it("un compte déjà terminé est renvoyé vers la nouvelle question (bandeau des questions manquantes)", () => {
    for (const locale of ["fr", "en"] as const) {
      const groups = describeMissingQuestions(["marriageVision"], locale);
      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({ questionnaireKey: "q3" });
      expect(groups[0].questions[0].id).toBe("marriageVision");
      expect(groups[0].stepIndex).toBe(getOnboardingSteps(locale).findIndex((s) => s.key === "attentes"));
    }
  });
});

describe("toggleMultiValue : bornes d'une question à choix multiples", () => {
  const vision = { min: 1, max: 3 };

  it("ajoute jusqu'au maximum, pas au-delà", () => {
    expect(toggleMultiValue(vision, [], "priere")).toEqual(["priere"]);
    expect(toggleMultiValue(vision, ["priere", "famille"], "service")).toEqual(["priere", "famille", "service"]);
    const full = ["priere", "famille", "service"];
    expect(toggleMultiValue(vision, full, "respect")).toBe(full);
  });

  it("retire une valeur, mais jamais la dernière d'une question obligatoire", () => {
    expect(toggleMultiValue(vision, ["priere", "famille"], "priere")).toEqual(["famille"]);
    const last = ["priere"];
    expect(toggleMultiValue(vision, last, "priere")).toBe(last);
  });

  it("sans bornes : comportement historique ; valeur non-tableau traitée comme vide", () => {
    expect(toggleMultiValue({}, ["a"], "a")).toEqual([]);
    expect(toggleMultiValue({}, undefined, "a")).toEqual(["a"]);
    expect(toggleMultiValue({ max: 1 }, "a", "b")).toEqual(["b"]);
  });
});
