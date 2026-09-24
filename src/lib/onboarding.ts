"use client";

// Onboarding « Parcours en 3 étapes » — configuration des questionnaires + sauvegarde Supabase.
// Les questions sont des DONNÉES (rendu générique côté page) pour rester maintenable.

import { supabase } from "./supabase";
import { QUESTIONNAIRES_EN } from "./onboarding.en";

export type FieldType = "text" | "textarea" | "single" | "multi" | "qcm" | "agerange";

export type SupportedLocale = "fr" | "en";

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  help?: string;
  max?: number; // pour "multi"
}

export interface Section {
  key: string;
  title: string;
  intro?: string;
  private?: boolean; // données sensibles → visibles par soi uniquement
  fields: Field[];
}

export interface Questionnaire {
  key: string;
  title: string;
  subtitle: string;
  note?: string;
  sections: Section[];
}

// ── Options structurées pour les questions "non négociables" ──
// Choix fixes (plutôt que texte libre) pour que l'algorithme de matching (src/lib/matching.ts)
// puisse comparer ces réponses de façon fiable entre deux profils.
export const SPIRITUAL_VALUES_OPTIONS = [
  "Vie de prière quotidienne",
  "Lecture régulière de la Bible",
  "Fidélité à l'église locale",
  "Pureté avant le mariage",
  "Fidélité conjugale",
  "Même dénomination ou doctrine",
  "Engagement dans le service ou le ministère",
  "Dîme et générosité",
  "Respect des rôles bibliques dans le couple",
  "Éducation chrétienne des enfants",
];
export const BEHAVIORAL_DEALBREAKERS_OPTIONS = [
  "Consommation d'alcool",
  "Tabac ou cigarette",
  "Infidélité",
  "Violence ou manque de respect",
  "Mensonge répété",
  "Jalousie excessive ou contrôle",
  "Manque d'ambition ou de projets",
  "Mauvaise gestion financière",
  "Absence d'implication dans l'église",
  "Manque de communication",
];
export const PHYSICAL_BOUNDARIES_OPTIONS = [
  "Aucun contact physique avant le mariage",
  "Tenue de la main uniquement",
  "Étreintes et marques d'affection, sans baisers",
  "Baisers avec retenue",
  "À définir ensemble avec le/la partenaire",
];

// Structure alignée sur onboarding.en.ts (mêmes clés de section, mêmes id de champs, mêmes types)
// afin que le questionnaire — et donc l'algorithme de matching (src/lib/matching.ts) — soit
// cohérent quelle que soit la langue choisie à l'inscription.
export const QUESTIONNAIRES: Questionnaire[] = [
  {
    key: "q1",
    title: "Faisons connaissance",
    subtitle: "Informations personnelles",
    note: "Veuillez compléter ce questionnaire avec honnêteté et authenticité. Vos réponses permettront de garantir une correspondance significative et efficace en reflétant fidèlement vos intérêts, compétences, attentes et besoins.",
    sections: [
      {
        key: "identite",
        title: "Identité & parcours",
        fields: [
          { id: "ethnie", label: "Ethnie d'origine", type: "text", placeholder: "Ex : Bamiléké, Béti, Douala…" },
          { id: "langues", label: "Langues parlées", type: "multi", options: ["Français", "Anglais", "Langue locale", "Autre"], help: "Plusieurs choix possibles" },
          { id: "niveauEtudes", label: "Niveau d'études le plus élevé", type: "single", options: ["Secondaire", "Licence / Bachelor", "Master", "Doctorat", "Formation professionnelle", "Autre"] },
          { id: "statut", label: "Situation actuelle", type: "single", options: ["Étudiant(e)", "Employé(e)", "Entrepreneur(e)", "En recherche", "Autre"] },
          { id: "professionDetail", label: "Profession ou domaine d'études", type: "text", placeholder: "Ex : Infirmière, Génie civil…" },
          { id: "ambitions", label: "Vos ambitions pour les 5 prochaines années", type: "textarea", placeholder: "Quelques lignes sur vos projets…" },
        ],
      },
      {
        key: "famille",
        title: "Situation familiale",
        fields: [
          { id: "enfants", label: "Avez-vous des enfants ?", type: "single", options: ["Non", "Oui"] },
          { id: "enfantsDetail", label: "Si oui, combien et quels âges ?", type: "text", placeholder: "Ex : 1 enfant de 4 ans" },
          { id: "logement", label: "Vous vivez actuellement…", type: "single", options: ["En famille", "Seul(e)", "En colocation"] },
          { id: "familleComposition", label: "Composition de votre famille d'origine", type: "textarea", placeholder: "Parents, frères et sœurs…" },
          { id: "relationFamille", label: "Comment décririez-vous votre relation avec votre famille ?", type: "textarea" },
        ],
      },
      {
        key: "presentation",
        title: "Qui êtes-vous ?",
        fields: [
          { id: "adjectifs", label: "Votre personnalité en 3 à 5 adjectifs", type: "text", placeholder: "Ex : joyeux, réfléchi, déterminé" },
          { id: "hobbies", label: "Vos trois principaux centres d'intérêt", type: "text" },
          { id: "tempsLibre", label: "Comment aimez-vous passer votre temps libre ?", type: "textarea" },
          { id: "realisation", label: "Votre plus grande réalisation personnelle", type: "textarea" },
          { id: "voyageReve", label: "Votre voyage de rêve", type: "text", placeholder: "Ex : Terre Sainte, Japon…" },
          { id: "lectureActuelle", label: "Quel livre ou message vous a marqué récemment ?", type: "text" },
        ],
      },
      {
        key: "sante",
        title: "Santé & bien-être",
        intro: "Cette section aide à assurer une compatibilité transparente. Toutes les réponses restent confidentielles.",
        private: true,
        fields: [
          { id: "etatSante", label: "Comment décririez-vous votre état de santé général ?", type: "single", options: ["Excellent", "Bon", "Quelques soucis de santé", "Je préfère ne pas répondre"] },
          { id: "handicap", label: "Avez-vous un handicap ou une condition chronique à mentionner ?", type: "single", options: ["Non", "Oui"] },
          { id: "handicapDetail", label: "Si oui, merci de préciser brièvement", type: "textarea" },
          { id: "activitePhysique", label: "Pratiquez-vous une activité physique régulière ?", type: "single", options: ["Oui, régulièrement", "Occasionnellement", "Rarement", "Non"] },
          { id: "sport", label: "Si oui, quelle activité ?", type: "text", placeholder: "Ex : course, natation, yoga…" },
          { id: "alimentation", label: "Avez-vous des préférences ou restrictions alimentaires ?", type: "multi", options: ["Aucune restriction", "Végétarien(ne)", "Végan(e)", "Halal", "Sans gluten", "Autre"], help: "Plusieurs choix possibles" },
          { id: "tabacAlcool", label: "Votre rapport au tabac et à l'alcool", type: "single", options: ["Ni l'un ni l'autre", "Alcool occasionnel", "Fumeur(se) social(e)", "Les deux occasionnellement", "Je préfère ne pas répondre"] },
        ],
      },
    ],
  },
  {
    key: "q2",
    title: "Votre vie spirituelle",
    subtitle: "Foi & pratique",
    note: "Cette section explore votre relation avec Dieu, vos pratiques spirituelles et votre parcours de foi. Prenez le temps d'y réfléchir sincèrement.",
    sections: [
      {
        key: "foi",
        title: "Foi & croyances",
        fields: [
          { id: "estChretien", label: "Êtes-vous chrétien(ne) pratiquant(e) ?", type: "single", options: ["Oui", "Non, mais en recherche", "Autre"] },
          { id: "denomination", label: "Votre dénomination ou tradition ecclésiale", type: "single", options: ["Catholique", "Protestant(e) (Réformé)", "Évangélique", "Pentecôtiste", "Baptiste", "Méthodiste", "Orthodoxe", "Sans dénomination", "Autre"] },
          { id: "denominationAutre", label: "Si autre, merci de préciser", type: "text", placeholder: "Ex : Adventiste…" },
          { id: "bapteme", label: "Avez-vous été baptisé(e) ?", type: "single", options: ["Oui, à l'âge adulte", "Oui, enfant", "Pas encore, mais je le désire", "Non"] },
          { id: "converionDate", label: "Quand avez-vous donné votre vie à Christ ?", type: "text", placeholder: "Date ou année approximative" },
          { id: "temoignage", label: "Partagez brièvement votre témoignage ou votre parcours de foi", type: "textarea", placeholder: "Comment Dieu a-t-il agi dans votre vie ?" },
        ],
      },
      {
        key: "dieu",
        title: "Votre relation avec Dieu",
        fields: [
          {
            id: "relationDieu",
            label: "Comment décririez-vous votre relation actuelle avec Dieu ?",
            type: "qcm",
            options: [
              "Intime et grandissante chaque jour",
              "Sincère mais avec des axes de progrès",
              "Dans une période de recherche ou de sécheresse spirituelle",
              "Nouvelle ou récemment ravivée",
              "Je préfère ne pas répondre",
            ],
          },
          { id: "epreuve", label: "Quelle a été la plus grande épreuve de votre vie spirituelle, et qu'en avez-vous retenu ?", type: "textarea" },
          { id: "verset", label: "Un verset biblique qui guide votre vie", type: "text", placeholder: "Ex : Jérémie 29:11" },
          { id: "livreBible", label: "Votre livre préféré de la Bible et pourquoi", type: "text" },
          { id: "priereSpeciale", label: "Y a-t-il un sujet de prière qui vous tient particulièrement à cœur ?", type: "textarea" },
        ],
      },
      {
        key: "pratiques",
        title: "Disciplines spirituelles quotidiennes",
        fields: [
          { id: "priere", label: "À quelle fréquence priez-vous personnellement ?", type: "single", options: ["Plusieurs fois par jour", "Une fois par jour", "Quelques fois par semaine", "Occasionnellement", "Rarement"] },
          { id: "jeune", label: "Pratiquez-vous le jeûne ?", type: "single", options: ["Oui, régulièrement", "Occasionnellement", "Rarement", "Non"] },
          { id: "louange", label: "Écoutez-vous de la musique de louange ?", type: "single", options: ["Quotidiennement", "Plusieurs fois par semaine", "Occasionnellement", "Rarement"] },
          { id: "discipline", label: "Quelle discipline spirituelle aimeriez-vous développer ?", type: "textarea" },
          { id: "methodeBible", label: "Comment abordez-vous l'étude de la Bible ?", type: "single", options: ["Étude inductive", "Étude thématique", "Par des méditations quotidiennes", "En groupe", "Je suis encore en apprentissage"] },
        ],
      },
      {
        key: "engagement",
        title: "Engagement en église & communauté",
        fields: [
          { id: "eglise", label: "Votre parcours en église", type: "single", options: ["Dans la même église depuis l'enfance", "J'ai changé d'église une ou deux fois", "Je suis actuellement en recherche d'église", "Autre"] },
          { id: "membreActif", label: "Êtes-vous membre actif(ve) d'une église ?", type: "single", options: ["Oui", "Non, mais j'y assiste régulièrement", "Non"] },
          { id: "implication", label: "Votre niveau d'implication dans votre église", type: "single", options: ["Pasteur ou responsable", "Diacre ou ancien", "Responsable de ministère", "Membre actif", "Participant(e) occasionnel(le)"] },
          { id: "role", label: "Occupez-vous une position de leadership ?", type: "single", options: ["Oui", "Pas actuellement, mais j'y aspire", "Non, et cela ne m'intéresse pas", "Je sers d'une autre manière"] },
          { id: "communaute", label: "Comment cultivez-vous des liens spirituels en dehors de l'église ?", type: "textarea" },
        ],
      },
      {
        key: "croissance",
        title: "Croissance & place de Dieu dans votre future relation",
        fields: [
          { id: "croissance", label: "Comment avez-vous grandi spirituellement ces 3 dernières années ?", type: "textarea" },
          {
            id: "roleDieu",
            label: "Quelle place Dieu doit-il occuper dans votre future relation ?",
            type: "qcm",
            options: [
              "Il doit être le fondement absolu",
              "Il est important mais pas l'unique critère",
              "Je suis encore en train de définir sa place",
              "Je préfère ne pas répondre",
            ],
          },
        ],
      },
    ],
  },
  {
    key: "q3",
    title: "Attentes & vision",
    subtitle: "Mariage et avenir",
    note: "Cette dernière section explore votre vision du couple, du mariage et de la vie commune. Ces réponses sont essentielles pour construire une relation solide et durable.",
    sections: [
      {
        key: "attentes",
        title: "Vos attentes pour la relation",
        fields: [
          { id: "attentes", label: "Vos attentes pour cette relation", type: "multi", options: ["Sécurité affective", "Croissance spirituelle", "Fonder une famille", "Une amitié sincère", "Un partenaire de ministère", "Un soutien mutuel dans les projets"], help: "Choisissez jusqu'à 3 réponses", max: 3 },
          { id: "trancheAge", label: "Tranche d'âge souhaitée pour votre partenaire", type: "agerange" },
          { id: "qualites", label: "3 qualités essentielles que vous recherchez chez un(e) partenaire", type: "text" },
          { id: "defauts", label: "3 défauts que vous ne pourriez pas tolérer", type: "text" },
          { id: "rythmeRelation", label: "Votre rythme idéal pour la relation", type: "single", options: ["Moins de 6 mois", "6 mois à 1 an", "1 à 2 ans", "Plus de 2 ans", "Sans précipitation"] },
        ],
      },
      {
        key: "visionCouple",
        title: "Rôles & responsabilités dans le couple",
        intro: "Partagez votre vision du fonctionnement quotidien d'un couple chrétien.",
        fields: [
          { id: "visionCouple", label: "Votre vision des rôles au sein du couple", type: "textarea" },
          { id: "repartition", label: "Comment les responsabilités du foyer et les finances doivent-elles être réparties ?", type: "single", options: ["Traditionnelle (l'homme pourvoit, la femme gère le foyer)", "Égalitaire (partagée équitablement)", "Flexible (selon les capacités de chacun)", "Nous déciderons ensemble"] },
          { id: "femmeTravail", label: "Pensez-vous qu'une femme doit poursuivre sa carrière après le mariage ?", type: "single", options: ["Oui, absolument", "Cela dépend de la situation", "Non, je préfère qu'elle se consacre à la famille", "Nous déciderons ensemble"] },
          { id: "decision", label: "Comment les décisions importantes doivent-elles être prises dans le couple ?", type: "single", options: ["Le mari a le dernier mot après discussion", "Décisions conjointes et égalitaires", "La personne la plus compétente décide", "Nous établirons notre propre méthode"] },
        ],
      },
      {
        key: "finances",
        title: "Gestion financière",
        intro: "La compatibilité financière est un pilier essentiel d'un foyer stable.",
        fields: [
          { id: "budget", label: "Votre approche préférée pour gérer les finances en couple", type: "single", options: ["Compte joint", "Comptes séparés avec un compte commun", "Chacun gère le sien", "Nous déciderons ensemble"] },
          { id: "epargne", label: "Votre philosophie d'épargne et d'investissement", type: "textarea" },
          { id: "dettes", label: "Avez-vous des engagements financiers ou des dettes ?", type: "single", options: ["Non", "Oui (prêt étudiant)", "Oui (prêt immobilier)", "Oui (autre)", "Je préfère ne pas répondre"] },
          { id: "dime", label: "Pratiquez-vous la dîme ?", type: "single", options: ["Oui, fidèlement", "Occasionnellement", "Pas encore, mais j'ai l'intention de commencer", "Non"] },
        ],
      },
      {
        key: "enfants",
        title: "Enfants & éducation",
        fields: [
          { id: "nbEnfants", label: "Votre nombre d'enfants idéal", type: "single", options: ["Aucun", "1–2", "3–4", "5 ou plus", "Selon la volonté de Dieu"] },
          { id: "delaiEnfants", label: "Combien de temps après le mariage souhaitez-vous attendre avant d'avoir des enfants ?", type: "single", options: ["Tout de suite", "Après 1 an", "Après 2 à 3 ans", "Pas de préférence particulière"] },
          { id: "education", label: "Quelle approche éducative souhaitez-vous adopter ?", type: "single", options: ["Instruction en famille", "École chrétienne privée", "École publique", "Nous déciderons ensemble", "Je ne sais pas encore"] },
          { id: "positionAvortement", label: "Votre position sur l'avortement", type: "single", options: ["Absolument contre, en toutes circonstances", "Sauf en cas de danger pour la mère", "Je suis pour le libre choix", "Je préfère ne pas répondre"] },
          { id: "educationEnfants", label: "Quelles valeurs éducatives souhaitez-vous transmettre à vos enfants ?", type: "textarea" },
        ],
      },
      {
        key: "limitesNonNegociables",
        title: "Limites non négociables",
        fields: [
          { id: "limitesSpirituelles", label: "3 à 5 valeurs spirituelles absolument non négociables", type: "multi", options: SPIRITUAL_VALUES_OPTIONS, help: "Choisissez 3 à 5 valeurs", max: 5 },
          { id: "limitesComportementales", label: "Comportements que vous ne pourriez pas accepter", type: "multi", options: BEHAVIORAL_DEALBREAKERS_OPTIONS, help: "Sélectionnez tout ce qui s'applique", max: 6 },
          { id: "limitesRelationnelles", label: "Vos limites physiques avant le mariage", type: "single", options: PHYSICAL_BOUNDARIES_OPTIONS },
        ],
      },
      {
        key: "styleDeVie",
        title: "Style de vie & compatibilité",
        fields: [
          { id: "rythme", label: "Êtes-vous plutôt…", type: "single", options: ["Personne du matin", "Personne du soir"] },
          { id: "organisation", label: "Vous êtes plutôt…", type: "single", options: ["Organisé(e) et structuré(e)", "Spontané(e) et flexible"] },
          { id: "rapportTravail", label: "Votre rapport au travail (ambition vs équilibre)", type: "textarea" },
          { id: "gestionConflits", label: "Comment gérez-vous les conflits et désaccords ?", type: "textarea" },
          { id: "reseauxSociaux", label: "Quelle place pour la technologie et les réseaux sociaux ?", type: "textarea" },
        ],
      },
      {
        key: "questionsFinales",
        title: "Pour finir",
        intro: "Quelques questions ouvertes (facultatives) pour aller en profondeur.",
        fields: [
          { id: "questionPartenaire", label: "Une seule question à poser à un(e) partenaire potentiel(le) ?", type: "textarea" },
          { id: "attiranceVsAmour", label: "Ce qui différencie une simple attirance d'un amour guidé par Dieu ?", type: "textarea" },
          { id: "mariageReussi", label: "Votre définition d'un mariage réussi selon les standards bibliques", type: "textarea" },
          { id: "heritage", label: "Quel héritage spirituel espérez-vous laisser ?", type: "textarea" },
          { id: "criteresMatching", label: "Quels sont, selon vous, les critères non négociables pour un matching réussi ?", type: "textarea" },
        ],
      },
    ],
  },
];

// ── Questionnaire field helpers (shared, no client deps) ──

/**
 * Returns all field IDs from the questionnaire definitions,
 * organized by section. Optionally excludes optional sections.
 */
export function getAllQuestionnaireFieldIds(options?: { excludeOptional?: boolean }): string[] {
  const q = QUESTIONNAIRES[0]; // Single questionnaire
  if (!q) return [];

  const sections = options?.excludeOptional
    ? q.sections.filter((s) => !s.private && s.key !== "questionsFinales")
    : q.sections;

  return sections.flatMap((s) => s.fields.map((f) => f.id));
}

/**
 * Checks how many questionnaire fields are answered.
 * Returns { answered, total, percentage, unansweredIds }.
 */
export function checkQuestionnaireCompletion(
  answers: Record<string, unknown>,
  options?: { excludeOptional?: boolean }
): { answered: number; total: number; percentage: number; unansweredIds: string[] } {
  const fieldIds = getAllQuestionnaireFieldIds(options);
  const unansweredIds: string[] = [];

  for (const id of fieldIds) {
    const val = answers[id];
    if (val === undefined || val === null || val === "") {
      unansweredIds.push(id);
    } else if (Array.isArray(val) && val.length === 0) {
      unansweredIds.push(id);
    }
  }

  const answered = fieldIds.length - unansweredIds.length;
  return {
    answered,
    total: fieldIds.length,
    percentage: fieldIds.length > 0 ? Math.round((answered / fieldIds.length) * 100) : 0,
    unansweredIds,
  };
}

// ── Locale-aware questionnaire getter ──
export function getQuestionnaires(locale: SupportedLocale = "fr"): Questionnaire[] {
  return locale === "en" ? QUESTIONNAIRES_EN : QUESTIONNAIRES;
}

// Liste à plat des sections (= étapes de l'onboarding), avec leur questionnaire parent.
export interface OnboardingStep extends Section {
  qTitle: string;
  qSubtitle: string;
  note?: string;
}
export const ONBOARDING_STEPS: OnboardingStep[] = QUESTIONNAIRES.flatMap((q) =>
  q.sections.map((s) => ({ ...s, qTitle: q.title, qSubtitle: q.subtitle, note: q.note }))
);

// Locale-aware flat list of onboarding steps
export function getOnboardingSteps(locale: SupportedLocale = "fr"): OnboardingStep[] {
  const questionnaires = getQuestionnaires(locale);
  return questionnaires.flatMap((q) =>
    q.sections.map((s) => ({ ...s, qTitle: q.title, qSubtitle: q.subtitle, note: q.note }))
  );
}

// ── Sauvegarde / chargement Supabase ──
export async function getMyOnboarding(): Promise<{ answers: Record<string, any>; completed: boolean }> {
  if (!supabase) return { answers: {}, completed: false };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { answers: {}, completed: false };
  const { data } = await supabase.from("profiles").select("questionnaire, onboarding_completed").eq("id", me).maybeSingle();
  return { answers: (data?.questionnaire as Record<string, any>) || {}, completed: !!(data as any)?.onboarding_completed };
}

export async function saveOnboarding(answers: Record<string, any>, completed: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré." };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, error: "Vous devez être connecté." };
  const { error } = await supabase
    .from("profiles")
    .update({ questionnaire: answers, onboarding_completed: completed, updated_at: new Date().toISOString() })
    .eq("id", me);
  if (error) {
    console.error("[Eden] sauvegarde onboarding échouée:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Sauvegarde automatique : enregistre les réponses sans toucher à onboarding_completed. */
export async function saveQuestionnaireAnswers(answers: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré." };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, error: "Vous devez être connecté." };
  const { error } = await supabase
    .from("profiles")
    .update({ questionnaire: answers, updated_at: new Date().toISOString() })
    .eq("id", me);
  if (error) {
    console.error("[Eden] sauvegarde automatique du questionnaire échouée:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
