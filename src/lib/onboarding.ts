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
          { id: "voyageReve", label: "Si vous pouviez voyager n'importe où, où iriez-vous et pourquoi ?", type: "textarea" },
        ],
      },
      {
        key: "physique",
        title: "Présentation physique",
        intro: "Pour exprimer votre identité physique — aucune réponse n'est « meilleure » qu'une autre.",
        fields: [
          { id: "teint", label: "Tonalité de peau", type: "single", options: ["Ébène très foncé", "Brun foncé", "Brun moyen", "Brun clair", "Caramel ou beige"] },
          { id: "morphologie", label: "Morphologie corporelle", type: "single", options: ["Athlétique et musclée", "Mince et élancée", "Moyenne et proportionnée", "Ronde et voluptueuse", "Corpulente et forte"] },
          { id: "taille", label: "Taille", type: "single", options: ["Très grande (+1,80 m)", "Grande (1,70–1,80 m)", "Moyenne (1,60–1,70 m)", "Petite (1,50–1,60 m)", "Très petite (–1,50 m)"] },
        ],
      },
      {
        key: "sante",
        title: "Santé & bien-être",
        private: true,
        intro: "Ces informations restent privées (visibles par vous seul). Elles aident à des connexions saines.",
        fields: [
          { id: "groupeSanguin", label: "Groupe sanguin", type: "single", options: ["A", "B", "AB", "O", "Je ne sais pas"] },
          { id: "rhesus", label: "Rhésus", type: "single", options: ["Positif (+)", "Négatif (−)", "Je ne sais pas"] },
          { id: "hematies", label: "Forme des hématies (électrophorèse)", type: "single", options: ["AA", "AS", "SS", "Je ne sais pas"], help: "Important pour la compatibilité (drépanocytose)" },
          { id: "etatSante", label: "État de santé général", type: "textarea" },
          { id: "maladies", label: "Conditions médicales chroniques à connaître", type: "textarea" },
          { id: "alimentation", label: "Habitudes alimentaires particulières", type: "text", placeholder: "Végétarien, allergies…" },
        ],
      },
    ],
  },
  {
    key: "q2",
    title: "Mon cheminement de foi",
    subtitle: "Maturité spirituelle — le cœur de votre profil",
    note: "Veuillez compléter ce questionnaire avec honnêteté et authenticité. Vos réponses permettront de garantir une correspondance significative et efficace en reflétant fidèlement vos intérêts, compétences, attentes et besoins.",
    sections: [
      {
        key: "parcoursFoi",
        title: "Votre parcours de foi",
        fields: [
          { id: "conversion", label: "Racontez votre expérience de conversion", type: "textarea", help: "Contexte, âge, ce qui vous a conduit à cette décision." },
          { id: "egliseEngagement", label: "Votre église actuelle et votre niveau d'engagement", type: "textarea", help: "Participation, services, responsabilités…" },
          { id: "contactMentor", label: "Contact d'un leader / mentor / père dans la foi", type: "text", help: "Restera privé — pour la vérification de profil." },
          { id: "priere", label: "Votre routine de prière et de méditation biblique", type: "textarea" },
          { id: "baptemes", label: "Baptême d'eau et baptême du Saint-Esprit", type: "textarea", help: "Quand, dans quel contexte." },
        ],
      },
      {
        key: "qcm",
        title: "Convictions (choix multiple)",
        intro: "Choisissez la réponse qui correspond le mieux à votre conviction actuelle.",
        fields: [
          {
            id: "qcmDecision",
            label: "Face à une décision importante, votre première démarche ?",
            type: "qcm",
            options: [
              "Je consulte mes amis et ma famille pour avoir leurs avis",
              "Je prends du temps dans la prière et la méditation biblique pour chercher la volonté de Dieu",
              "J'analyse rationnellement les options et je choisis ce qui me semble logique",
              "Je demande conseil à mon pasteur puis je prie",
            ],
          },
          {
            id: "qcmPeche",
            label: "Quand un frère/une sœur en Christ tombe dans le péché ?",
            type: "qcm",
            options: [
              "Je m'éloigne pour ne pas être influencé(e) négativement",
              "Je prie pour la personne en secret sans intervenir",
              "Je l'approche avec amour pour la restaurer (Galates 6:1), tout en m'examinant",
              "Je rapporte la situation aux responsables de l'église",
            ],
          },
          {
            id: "qcmMature",
            label: "Que signifie « être un(e) chrétien(ne) mature » ?",
            type: "qcm",
            options: [
              "Connaître la Bible par cœur et citer de nombreux versets",
              "Assister à tous les programmes de l'église sans exception",
              "Manifester le fruit de l'Esprit dans les situations difficiles et aimer comme Christ",
              "Avoir des responsabilités importantes dans l'église",
            ],
          },
          {
            id: "qcmTentations",
            label: "Comment gérez-vous les tentations et les épreuves ?",
            type: "qcm",
            options: [
              "Par ma propre force de volonté",
              "Je reconnais ma faiblesse, je fuis la tentation et je m'appuie sur la grâce de Dieu et sa Parole",
              "Je jeûne systématiquement jusqu'à ce que la tentation disparaisse",
              "Je demande à d'autres chrétiens de prier pour moi uniquement",
            ],
          },
        ],
      },
      {
        key: "visionRelations",
        title: "Vision biblique des relations",
        fields: [
          { id: "purete", label: "Votre compréhension de la pureté avant le mariage", type: "textarea", help: "Position basée sur les Écritures et limites que vous vous fixez." },
          { id: "rolesEph5", label: "Selon Éphésiens 5:21-33, les rôles dans le mariage", type: "textarea" },
          { id: "placeDeDieu", label: "La place de Dieu dans votre future relation", type: "textarea" },
          { id: "jougEtranger", label: "Votre position sur les fréquentations avec un non-croyant (2 Cor 6:14)", type: "textarea" },
        ],
      },
      {
        key: "service",
        title: "Service & dons spirituels",
        fields: [
          { id: "dons", label: "Vos dons spirituels et comment vous les exercez", type: "textarea" },
          { id: "ministere", label: "Ministère ou département où vous êtes impliqué(e)", type: "text" },
          { id: "evangelisation", label: "Comment participez-vous à l'évangélisation ?", type: "textarea" },
          { id: "dime", label: "Votre conviction sur la dîme et les offrandes", type: "textarea" },
        ],
      },
      {
        key: "croissance",
        title: "Défis & croissance",
        fields: [
          { id: "defi", label: "Votre plus grand défi spirituel actuel", type: "textarea" },
          { id: "foiEprouvee", label: "Une période où votre foi a été éprouvée", type: "textarea" },
          { id: "modeles", label: "Vos modèles spirituels (vivants ou bibliques)", type: "text" },
          { id: "saintEsprit", label: "Comment cultivez-vous votre relation avec le Saint-Esprit ?", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "q3",
    title: "Ce que je recherche",
    subtitle: "Préférences et attentes",
    note: "Veuillez compléter ce questionnaire avec honnêteté et authenticité. Vos réponses permettront de garantir une correspondance significative et efficace en reflétant fidèlement vos intérêts, compétences, attentes et besoins.",
    sections: [
      {
        key: "partenaireIdeal",
        title: "Le partenaire idéal",
        fields: [
          { id: "criteresSpirituels", label: "Maturité spirituelle recherchée (et non négociables)", type: "textarea" },
          { id: "caractere", label: "Qualités de caractère essentielles", type: "textarea" },
          { id: "aspectsPratiques", label: "Préférences pratiques (études, profession, localisation)", type: "textarea" },
        ],
      },
      {
        key: "projets",
        title: "Projets d'avenir",
        fields: [
          { id: "mariageDelai", label: "Dans combien de temps envisagez-vous le mariage ?", type: "textarea", help: "Êtes-vous prêt(e) émotionnellement, spirituellement, financièrement ?" },
          { id: "enfantsDesir", label: "Désir d'enfants et vision de leur éducation chrétienne", type: "textarea" },
          { id: "longTerme", label: "Où vous voyez-vous vivre ? Projets de ministère en couple ?", type: "textarea" },
        ],
      },
      {
        key: "preferences",
        title: "Préférences précises",
        fields: [
          { id: "trancheAge", label: "Tranche d'âge souhaitée pour votre partenaire", type: "agerange" },
          { id: "origineEthnique", label: "Préférence d'origine ethnique/régionale", type: "text", placeholder: "Ouvert(e) à toutes, ou préférences…" },
          { id: "languesPartenaire", label: "Langues souhaitées chez votre partenaire", type: "text" },
          { id: "financesCouple", label: "Gestion des finances dans le couple", type: "single", options: ["Compte joint", "Comptes séparés", "Budget commun", "À discuter"] },
        ],
      },
      {
        key: "apprehensions",
        title: "Vos appréhensions",
        private: true,
        intro: "Ces réponses restent privées. Les reconnaître aide à mieux les surmonter.",
        fields: [
          { id: "crainte", label: "Votre plus grande crainte dans une relation sérieuse", type: "textarea" },
          { id: "rupturePassee", label: "Une relation difficile passée vous influence-t-elle aujourd'hui ?", type: "textarea" },
          { id: "sujetsMalaise", label: "Sujets ou comportements qui vous mettent mal à l'aise", type: "textarea" },
        ],
      },
      {
        key: "limites",
        title: "Limites non négociables",
        fields: [
          { id: "limitesSpirituelles", label: "3 à 5 valeurs spirituelles absolument non négociables", type: "textarea" },
          { id: "limitesComportementales", label: "Comportements que vous ne pourriez pas accepter", type: "textarea", help: "Ex : alcool, tabac, manque de respect…" },
          { id: "limitesRelationnelles", label: "Vos limites physiques avant le mariage", type: "textarea" },
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
