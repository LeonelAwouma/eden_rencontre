import { describe, expect, it } from "vitest";
import {
  ARCHIVE_KEYS, DISCOVERY_SOURCE_ARCHIVE, MARRIAGE_VISION_ARCHIVE, RETIRED_PROFILE_VISION_LABELS,
  answersForCompletion, archivedLegacyValues, classifyDiscoverySource, classifyMarriageVision, displayedMarriageVision,
  mergeLegacyAnswers, pendingLegacyValues, planQuestionnaireSave, validateSyncedAnswers,
} from "./onboarding-legacy";
import { DISCOVERY_SOURCE_VALUES, MARRIAGE_VISION_IDS } from "./questionnaire-choices";
import { QUESTIONNAIRES, checkQuestionnaireCompletion, effectiveQuestionnaireCompletion, getAllQuestionnaireFieldIds } from "./onboarding";

describe("classifyMarriageVision : correspondance explicite, jamais approximative", () => {
  it("reconnaît les identifiants historiques", () => {
    expect(classifyMarriageVision(["priere", "famille"])).toEqual({ recognized: ["priere", "famille"], unrecognized: [] });
    expect(classifyMarriageVision(MARRIAGE_VISION_IDS)).toEqual({ recognized: [...MARRIAGE_VISION_IDS], unrecognized: [] });
  });

  it("reconnaît les libellés français (casse, accents et espaces tolérés, texte entier exigé)", () => {
    expect(classifyMarriageVision(["Prière Quotidienne", "  foyer uni ", "SERVICE A L'EGLISE"]).recognized).toEqual(["priere", "famille", "service"]);
  });

  it("reconnaît les libellés anglais", () => {
    expect(classifyMarriageVision(["Daily Prayer", "Mutual Respect", "Christian Upbringing"]).recognized).toEqual(["priere", "respect", "enfants"]);
  });

  it("conserve telles quelles les valeurs inconnues, dont les six anciens libellés de /dashboard/profile (FR et EN)", () => {
    const legacy = classifyMarriageVision([...RETIRED_PROFILE_VISION_LABELS, "valeur libre"]);
    expect(legacy.recognized).toEqual([]);
    expect(legacy.unrecognized).toEqual([...RETIRED_PROFILE_VISION_LABELS, "valeur libre"]);
  });

  it("ne rapproche pas un libellé voisin : « Éducation chrétienne des enfants » n'est pas « Éducation Chrétienne »", () => {
    expect(classifyMarriageVision(["Éducation chrétienne des enfants"])).toEqual({ recognized: [], unrecognized: ["Éducation chrétienne des enfants"] });
    expect(classifyMarriageVision(["Prière"])).toEqual({ recognized: [], unrecognized: ["Prière"] });
  });

  it("valeurs mélangées, doublons et entrées invalides", () => {
    expect(classifyMarriageVision(["priere", "Prière Quotidienne", "Mariage biblique", "", null, 4, "Mariage biblique"]))
      .toEqual({ recognized: ["priere"], unrecognized: ["Mariage biblique"] });
    expect(classifyMarriageVision(null)).toEqual({ recognized: [], unrecognized: [] });
    expect(classifyMarriageVision("priere")).toEqual({ recognized: [], unrecognized: [] });
  });
});

describe("classifyDiscoverySource : correspondance exacte", () => {
  it("valeurs canoniques et libellés anglais", () => {
    for (const v of DISCOVERY_SOURCE_VALUES) expect(classifyDiscoverySource(v)).toEqual({ recognized: v, unrecognized: null });
    expect(classifyDiscoverySource("Word of mouth")).toEqual({ recognized: "Bouche à oreille", unrecognized: null });
    expect(classifyDiscoverySource("other")).toEqual({ recognized: "Autre", unrecognized: null });
    expect(classifyDiscoverySource(" bouche a oreille ")).toEqual({ recognized: "Bouche à oreille", unrecognized: null });
  });

  it("une valeur libre reste inconnue (aucune devinette, contrairement à l'import admin)", () => {
    expect(classifyDiscoverySource("Par un ami de l'église")).toEqual({ recognized: null, unrecognized: "Par un ami de l'église" });
    expect(classifyDiscoverySource("Instagram et TikTok")).toEqual({ recognized: null, unrecognized: "Instagram et TikTok" });
    expect(classifyDiscoverySource(null)).toEqual({ recognized: null, unrecognized: null });
    expect(classifyDiscoverySource("  ")).toEqual({ recognized: null, unrecognized: null });
  });
});

describe("mergeLegacyAnswers : reprise dans l'éditeur", () => {
  it("pré-remplit une question ABSENTE avec les valeurs reconnues", () => {
    const merged = mergeLegacyAnswers({ ethnie: "Béti" }, { marriage_vision: ["priere", "Mariage biblique"], discovery_source: "TikTok" });
    expect(merged).toEqual({ ethnie: "Béti", marriageVision: ["priere"], discoverySource: "TikTok" });
  });

  it("une clé présente — même vide — n'est jamais remplacée (absence ≠ réponse vide)", () => {
    const profile = { marriage_vision: ["priere"], discovery_source: "TikTok" };
    expect(mergeLegacyAnswers({ marriageVision: [], discoverySource: "" }, profile)).toEqual({ marriageVision: [], discoverySource: "" });
    expect(mergeLegacyAnswers({ marriageVision: ["service"] }, profile).marriageVision).toEqual(["service"]);
  });

  it("ne pré-remplit ni valeur inconnue, ni plus que le maximum (pas de troncature silencieuse)", () => {
    expect(mergeLegacyAnswers({}, { marriage_vision: ["Mariage biblique"], discovery_source: "Par un ami" })).toEqual({});
    expect(mergeLegacyAnswers({}, { marriage_vision: ["priere", "famille", "travail", "respect"] })).toEqual({});
  });

  it("ne modifie pas l'objet reçu et tolère l'absence de profil", () => {
    const answers = { a: 1 };
    expect(mergeLegacyAnswers(answers, { marriage_vision: ["priere"] })).not.toBe(answers);
    expect(answers).toEqual({ a: 1 });
    expect(mergeLegacyAnswers(null, null)).toEqual({});
  });
});

describe("validateSyncedAnswers : validation serveur", () => {
  it("accepte clé absente, réponse vide et sélections valides", () => {
    expect(validateSyncedAnswers({}).ok).toBe(true);
    expect(validateSyncedAnswers({ marriageVision: [], discoverySource: "" }).ok).toBe(true);
    expect(validateSyncedAnswers({ marriageVision: null, discoverySource: null }).ok).toBe(true);
    expect(validateSyncedAnswers({ marriageVision: ["priere"], discoverySource: "Autre" }).ok).toBe(true);
    expect(validateSyncedAnswers({ marriageVision: ["priere", "famille", "service"] }).ok).toBe(true);
  });

  it("refuse valeur hors liste, libellé à la place de l'identifiant, doublon, mauvais type, plus de 3 valeurs", () => {
    expect(validateSyncedAnswers({ marriageVision: ["inconnue"] })).toMatchObject({ ok: false, code: "marriage_vision_invalid" });
    expect(validateSyncedAnswers({ marriageVision: ["Prière Quotidienne"] })).toMatchObject({ ok: false, code: "marriage_vision_invalid" });
    expect(validateSyncedAnswers({ marriageVision: ["priere", "priere"] })).toMatchObject({ ok: false, code: "marriage_vision_invalid" });
    expect(validateSyncedAnswers({ marriageVision: "priere" })).toMatchObject({ ok: false, code: "marriage_vision_invalid" });
    expect(validateSyncedAnswers({ marriageVision: [1] })).toMatchObject({ ok: false, code: "marriage_vision_invalid" });
    expect(validateSyncedAnswers({ marriageVision: ["priere", "famille", "service", "respect"] })).toMatchObject({ ok: false, code: "marriage_vision_too_many" });
    expect(validateSyncedAnswers({ discoverySource: "Word of mouth" })).toMatchObject({ ok: false, code: "discovery_source_invalid" });
    expect(validateSyncedAnswers({ discoverySource: ["TikTok"] })).toMatchObject({ ok: false, code: "discovery_source_invalid" });
  });
});

describe("planQuestionnaireSave : colonnes et archives", () => {
  it("clé absente : aucune colonne touchée", () => {
    const plan = planQuestionnaireSave({ ethnie: "Béti" }, { questionnaire: {}, marriage_vision: ["priere"], discovery_source: "TikTok" });
    expect(plan.columns).toEqual({});
    expect(plan.questionnaire).toEqual({ ethnie: "Béti" });
  });

  it("réponse vide explicite : la colonne n'est jamais vidée", () => {
    const plan = planQuestionnaireSave({ marriageVision: [], discoverySource: "" }, { marriage_vision: ["priere", "Mariage biblique"], discovery_source: "Par un ami" });
    expect(plan.columns).toEqual({});
    expect(plan.questionnaire[MARRIAGE_VISION_ARCHIVE]).toBeUndefined();
    expect(plan.questionnaire[DISCOVERY_SOURCE_ARCHIVE]).toBeUndefined();
  });

  it("réponse identique au contenu de la colonne (simple pré-remplissage) : rien n'est réécrit ni archivé", () => {
    const plan = planQuestionnaireSave({ marriageVision: ["priere"], discoverySource: "TikTok" }, { marriage_vision: ["Prière Quotidienne", "Mariage biblique"], discovery_source: "tiktok" });
    expect(plan.columns).toEqual({});
    expect(plan.questionnaire[MARRIAGE_VISION_ARCHIVE]).toBeUndefined();
  });

  it("nouveau choix : la colonne reçoit la sélection, les anciennes valeurs non reconnues sont archivées", () => {
    const plan = planQuestionnaireSave(
      { marriageVision: ["service", "respect"], discoverySource: "YouTube" },
      { questionnaire: {}, marriage_vision: ["priere", "Mariage biblique", "Fidélité absolue"], discovery_source: "Par un ami" }
    );
    expect(plan.columns).toEqual({ marriage_vision: ["service", "respect"], discovery_source: "YouTube" });
    expect(plan.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique", "Fidélité absolue"]);
    expect(plan.questionnaire[DISCOVERY_SOURCE_ARCHIVE]).toEqual(["Par un ami"]);
  });

  it("colonne vide : première réponse écrite sans rien archiver", () => {
    const plan = planQuestionnaireSave({ marriageVision: ["priere"], discoverySource: "Autre" }, { marriage_vision: null, discovery_source: null });
    expect(plan.columns).toEqual({ marriage_vision: ["priere"], discovery_source: "Autre" });
    for (const key of ARCHIVE_KEYS) expect(plan.questionnaire[key]).toBeUndefined();
  });

  it("l'archive vient de la BASE : ce que le navigateur envoie sous ces clés est ignoré (ni vidée, ni réduite, ni falsifiée)", () => {
    const stored = { [MARRIAGE_VISION_ARCHIVE]: ["Mariage biblique"], [DISCOVERY_SOURCE_ARCHIVE]: ["Par un ami"] };
    const emptied = planQuestionnaireSave({ ethnie: "x", [MARRIAGE_VISION_ARCHIVE]: [], [DISCOVERY_SOURCE_ARCHIVE]: [] }, { questionnaire: stored });
    expect(emptied.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique"]);
    expect(emptied.questionnaire[DISCOVERY_SOURCE_ARCHIVE]).toEqual(["Par un ami"]);
    const forged = planQuestionnaireSave({ [MARRIAGE_VISION_ARCHIVE]: ["injecté"] }, { questionnaire: stored });
    expect(forged.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique"]);
    const oldTab = planQuestionnaireSave({ ethnie: "x" }, { questionnaire: stored });
    expect(oldTab.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique"]);
  });

  it("PLUSIEURS sauvegardes successives : aucune valeur historique perdue, l'archive ne fait que grossir", () => {
    // État initial : ancienne base, aucune clé dans le questionnaire.
    let row: { questionnaire: Record<string, unknown>; marriage_vision: unknown; discovery_source: unknown } = {
      questionnaire: { ethnie: "Béti" }, marriage_vision: ["priere", "Mariage biblique"], discovery_source: "Par un ami",
    };
    const save = (incoming: Record<string, unknown>) => {
      const plan = planQuestionnaireSave(incoming, row);
      row = { questionnaire: plan.questionnaire, marriage_vision: plan.columns.marriage_vision ?? row.marriage_vision, discovery_source: plan.columns.discovery_source ?? row.discovery_source };
    };

    // 1. Autosauvegarde d'une autre question, éditeur pré-rempli : rien ne bouge.
    save(mergeLegacyAnswers({ ethnie: "Béti", langues: ["Français"] }, row));
    expect(row.marriage_vision).toEqual(["priere", "Mariage biblique"]);
    expect(row.discovery_source).toBe("Par un ami");
    expect(row.questionnaire[MARRIAGE_VISION_ARCHIVE]).toBeUndefined();

    // 2. Choix explicite : colonne remplacée, ancienne valeur archivée.
    save({ ...row.questionnaire, marriageVision: ["service"] });
    expect(row.marriage_vision).toEqual(["service"]);
    expect(row.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique"]);

    // 3. Un ANCIEN onglet, chargé avant l'étape 2, sauvegarde sans connaître l'archive.
    save({ ethnie: "Béti", langues: ["Français"], marriageVision: ["service"] });
    expect(row.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique"]);

    // 4. Source de découverte choisie : la valeur libre rejoint son archive.
    save({ ...row.questionnaire, discoverySource: "Instagram" });
    expect(row.discovery_source).toBe("Instagram");
    expect(row.questionnaire[DISCOVERY_SOURCE_ARCHIVE]).toEqual(["Par un ami"]);

    // 5. Nouveau changement, puis sauvegardes répétées à l'identique.
    save({ ...row.questionnaire, marriageVision: ["priere", "famille"] });
    for (let i = 0; i < 5; i++) save({ ...row.questionnaire });
    expect(row.marriage_vision).toEqual(["priere", "famille"]);
    expect(row.questionnaire[MARRIAGE_VISION_ARCHIVE]).toEqual(["Mariage biblique"]);
    expect(row.questionnaire[DISCOVERY_SOURCE_ARCHIVE]).toEqual(["Par un ami"]);
    expect(row.questionnaire.ethnie).toBe("Béti");
  });
});

describe("avertissement de migration : état de consultation distinct de l'archive", () => {
  const profile = { marriage_vision: ["priere", "Mariage biblique"], discovery_source: "Par un ami" };

  it("visible tant que le membre n'a pas fait de choix (réponse = pré-remplissage)", () => {
    expect(pendingLegacyValues("marriageVision", ["priere"], profile)).toEqual(["Mariage biblique"]);
    expect(pendingLegacyValues("discoverySource", undefined, profile)).toEqual(["Par un ami"]);
    expect(pendingLegacyValues("marriageVision", undefined, { marriage_vision: ["Mariage biblique"] })).toEqual(["Mariage biblique"]);
  });

  it("disparaît dès un choix explicite — alors que l'archive, elle, reste", () => {
    expect(pendingLegacyValues("marriageVision", ["service"], profile)).toEqual([]);
    expect(pendingLegacyValues("discoverySource", "TikTok", profile)).toEqual([]);
    const plan = planQuestionnaireSave({ marriageVision: ["service"], discoverySource: "TikTok" }, { questionnaire: {}, ...profile });
    const after = { marriage_vision: plan.columns.marriage_vision, discovery_source: plan.columns.discovery_source };
    expect(pendingLegacyValues("marriageVision", ["service"], after)).toEqual([]);
    expect(archivedLegacyValues(plan.questionnaire)).toEqual({ marriageVision: ["Mariage biblique"], discoverySource: ["Par un ami"] });
  });

  it("rien à signaler pour une colonne entièrement reconnue, une autre question ou sans profil", () => {
    expect(pendingLegacyValues("marriageVision", ["priere"], { marriage_vision: ["priere"] })).toEqual([]);
    expect(pendingLegacyValues("ethnie", "x", profile)).toEqual([]);
    expect(pendingLegacyValues("marriageVision", [], null)).toEqual([]);
  });

  it("trop de valeurs reconnues pour être pré-remplies : elles restent toutes affichées", () => {
    const many = { marriage_vision: ["priere", "famille", "travail", "respect"] };
    expect(pendingLegacyValues("marriageVision", undefined, many)).toEqual(["priere", "famille", "travail", "respect"]);
    expect(displayedMarriageVision({}, many)).toEqual(["priere", "famille", "travail", "respect"]);
  });

  it("affichage en lecture seule : réponse du questionnaire + anciennes valeurs en attente, sinon la colonne", () => {
    expect(displayedMarriageVision({ marriageVision: ["priere"] }, profile)).toEqual(["priere", "Mariage biblique"]);
    expect(displayedMarriageVision({ marriageVision: ["service"] }, profile)).toEqual(["service"]);
    expect(displayedMarriageVision({}, profile)).toEqual(["priere", "Mariage biblique"]);
    expect(displayedMarriageVision(null, null)).toEqual([]);
  });
});

describe("complétion rétrocompatible (badge, tableau de bord, parrainage, administration)", () => {
  const required = getAllQuestionnaireFieldIds({ excludeOptional: true });
  /** Questionnaire rempli AVANT l'ajout de la question : toutes les réponses requises sauf marriageVision. */
  const oldAnswers = Object.fromEntries(
    QUESTIONNAIRES.flatMap((q) => q.sections.flatMap((s) => s.fields))
      .filter((f) => required.includes(f.id) && f.id !== "marriageVision" && !f.showIf)
      .map((f) => [f.id, f.type === "multi" ? [f.options?.[0] ?? "x"] : f.type === "agerange" ? { min: "25", max: "35" } : f.options?.[0] ?? "réponse"])
  );

  it("la nouvelle question est requise, la source de découverte est facultative", () => {
    expect(required).toContain("marriageVision");
    expect(required).not.toContain("discoverySource");
    expect(getAllQuestionnaireFieldIds()).toContain("discoverySource");
  });

  it("un ancien membre dont la colonne est remplie reste à 100 % — sans que ses réponses soient modifiées", () => {
    const frozen = JSON.stringify(oldAnswers);
    expect(checkQuestionnaireCompletion(oldAnswers, { excludeOptional: true }).unansweredIds).toEqual(["marriageVision"]);
    for (const column of [["priere"], ["Prière Quotidienne"], ["Daily Prayer"], ["Mariage biblique"]]) {
      const completion = effectiveQuestionnaireCompletion(oldAnswers, { marriage_vision: column }, { excludeOptional: true });
      expect(completion.percentage, column[0]).toBe(100);
      expect(completion.unansweredIds).toEqual([]);
    }
    expect(JSON.stringify(oldAnswers)).toBe(frozen);
    expect("marriageVision" in oldAnswers).toBe(false);
  });

  it("colonne vide : la question manque réellement ; une réponse du questionnaire suffit", () => {
    for (const column of [null, [], undefined]) {
      expect(effectiveQuestionnaireCompletion(oldAnswers, { marriage_vision: column }, { excludeOptional: true }).unansweredIds).toEqual(["marriageVision"]);
    }
    expect(effectiveQuestionnaireCompletion({ ...oldAnswers, marriageVision: ["service"] }, {}, { excludeOptional: true }).percentage).toBe(100);
  });

  it("une réponse vidée ne masque pas une colonne remplie, et la réponse du questionnaire a priorité sur la colonne", () => {
    expect(answersForCompletion({ marriageVision: [] }, { marriage_vision: ["priere"] }).marriageVision).toEqual(["priere"]);
    expect(answersForCompletion({ marriageVision: ["service"] }, { marriage_vision: ["priere"] }).marriageVision).toEqual(["service"]);
  });
});
