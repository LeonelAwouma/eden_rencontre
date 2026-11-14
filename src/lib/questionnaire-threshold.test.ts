import { describe, it, expect } from "vitest";
import {
  QUESTIONNAIRE_MIN_COMPLETION,
  QUESTIONNAIRES,
  checkQuestionnaireCompletion,
  getAllQuestionnaireFieldIds,
  isQuestionnaireSufficient,
  questionnaireDisplayPercent,
} from "./onboarding";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

const ratio = (pct: number) => ({ answered: Math.round(pct * 100), total: 10000 });

describe("seuil de complétion du questionnaire (90 %)", () => {
  it("la constante centrale vaut 90", () => expect(QUESTIONNAIRE_MIN_COMPLETION).toBe(90));

  it.each([
    [0, false], [50, false], [89, false], [89.99, false],
    [90, true], [91, true], [95, true], [99, true], [100, true],
  ])("%s %% → seuil atteint : %s", (pct, expected) => {
    expect(isQuestionnaireSufficient(ratio(pct))).toBe(expected);
  });

  it("n'utilise pas le pourcentage arrondi : 89,6 % est refusé et affiché 89", () => {
    const c = { answered: 896, total: 1000 };
    expect(isQuestionnaireSufficient(c)).toBe(false);
    expect(questionnaireDisplayPercent(c)).toBe(89);
  });

  it("aucune question attendue → jamais suffisant", () => {
    expect(isQuestionnaireSufficient({ answered: 0, total: 0 })).toBe(false);
  });

  it("sur le vrai questionnaire : retirer 10 % des réponses passe, davantage non ; un ancien compte à 100 % reste suffisant", () => {
    const ids = getAllQuestionnaireFieldIds({ excludeOptional: true });
    const all = Object.fromEntries(
      QUESTIONNAIRES.flatMap((q) => q.sections.flatMap((s) => s.fields)).filter((f) => ids.includes(f.id) && !f.showIf)
        .map((f) => [f.id, f.type === "multi" ? ["x"] : f.type === "agerange" ? { min: "25", max: "35" } : f.options?.[0] ?? "x"])
    );
    const full = checkQuestionnaireCompletion(all, { excludeOptional: true });
    expect(isQuestionnaireSufficient(full)).toBe(true);
    const keys = Object.keys(all);
    const drop = (n: number) => checkQuestionnaireCompletion(Object.fromEntries(keys.slice(n).map((k) => [k, all[k]])), { excludeOptional: true });
    expect(isQuestionnaireSufficient(drop(0))).toBe(true);
    const tooMany = Math.floor(full.total * 0.1) + 1;
    expect(isQuestionnaireSufficient(drop(tooMany))).toBe(false);
  });
});

describe("traductions du seuil et du libellé de création de compte", () => {
  it("libellé de création de compte", () => {
    expect(fr.login.createProfile).toBe("Créer mon compte");
    expect(en.login.createProfile).toBe("Create my account");
  });

  it("clés du seuil présentes en FR et EN avec les mêmes variables", () => {
    for (const key of ["missingDesc", "thresholdProgress", "thresholdReached"] as const) {
      const f = fr.onboarding[key], e = en.onboarding[key];
      expect(f, key).toBeTruthy();
      expect(e, key).toBeTruthy();
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(vars(f), key).toEqual(vars(e));
    }
    expect(fr.onboarding.missingDesc).toContain("{min} %");
    expect(en.onboarding.missingDesc).toContain("{min}%");
  });
});
