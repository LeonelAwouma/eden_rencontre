"use client";

// English version of the onboarding questionnaires.
// Mirrors the structure of the French QUESTIONNAIRES in onboarding.ts.

import type { Questionnaire } from "./onboarding";

export const QUESTIONNAIRES_EN: Questionnaire[] = [
  {
    key: "q1",
    title: "Let's Get to Know Each Other",
    subtitle: "Personal Information",
    note: "Please complete this questionnaire with honesty and authenticity. Your answers will help ensure a meaningful and effective match by faithfully reflecting your interests, skills, expectations, and needs.",
    sections: [
      {
        key: "identite",
        title: "Identity & Background",
        fields: [
          { id: "ethnie", label: "Ethnic origin", type: "text", placeholder: "Ex: Bamiléké, Beti, Duala…" },
          { id: "langues", label: "Languages spoken", type: "multi", options: ["French", "English", "Local language", "Other"], help: "Multiple choices allowed" },
          { id: "niveauEtudes", label: "Highest level of education", type: "single", options: ["High school", "Bachelor's degree", "Master's degree", "Doctorate", "Professional training", "Other"] },
          { id: "statut", label: "Current situation", type: "single", options: ["Student", "Employed", "Entrepreneur", "Job seeking", "Other"] },
          { id: "professionDetail", label: "Profession or field of study", type: "text", placeholder: "Ex: Nurse, Civil Engineering…" },
          { id: "ambitions", label: "Your ambitions for the next 5 years", type: "textarea", placeholder: "A few lines about your plans…" },
        ],
      },
      {
        key: "famille",
        title: "Family Situation",
        fields: [
          { id: "enfants", label: "Do you have children?", type: "single", options: ["No", "Yes"] },
          { id: "enfantsDetail", label: "If yes, how many and what ages?", type: "text", placeholder: "Ex: 1 child, 4 years old" },
          { id: "logement", label: "You currently live…", type: "single", options: ["With family", "Alone", "With roommates"] },
          { id: "familleComposition", label: "Your family of origin composition", type: "textarea", placeholder: "Parents, siblings…" },
          { id: "relationFamille", label: "How would you describe your relationship with your family?", type: "textarea" },
        ],
      },
      {
        key: "presentation",
        title: "Who Are You?",
        fields: [
          { id: "adjectifs", label: "Your personality in 3 to 5 adjectives", type: "text", placeholder: "Ex: joyful, thoughtful, determined" },
          { id: "hobbies", label: "Your three main interests", type: "text" },
          { id: "tempsLibre", label: "How do you like to spend your free time?", type: "textarea" },
          { id: "realisation", label: "Your greatest personal achievement", type: "textarea" },
          { id: "voyageReve", label: "Your dream trip", type: "text", placeholder: "Ex: Holy Land, Japan…" },
          { id: "lectureActuelle", label: "What book or sermon has impacted you recently?", type: "text" },
        ],
      },
      {
        key: "sante",
        title: "Health & Wellness",
        intro: "This section helps ensure transparent compatibility. All responses remain confidential.",
        private: true,
        fields: [
          { id: "etatSante", label: "How would you describe your overall health?", type: "single", options: ["Excellent", "Good", "Some concerns", "Prefer not to say"] },
          { id: "handicap", label: "Do you have a disability or chronic condition to disclose?", type: "single", options: ["No", "Yes"] },
          { id: "handicapDetail", label: "If yes, please briefly describe", type: "textarea" },
          { id: "activitePhysique", label: "Do you engage in regular physical activity?", type: "single", options: ["Yes, regularly", "Occasionally", "Rarely", "No"] },
          { id: "sport", label: "If yes, what activity?", type: "text", placeholder: "Ex: running, swimming, yoga…" },
          { id: "alimentation", label: "Any dietary preferences or restrictions?", type: "multi", options: ["No restrictions", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"], help: "Multiple choices allowed" },
          { id: "tabacAlcool", label: "Your relationship with tobacco and alcohol", type: "single", options: ["Neither", "Occasional alcohol", "Social smoker", "Both occasionally", "Prefer not to say"] },
        ],
      },
    ],
  },
  {
    key: "q2",
    title: "Your Spiritual Life",
    subtitle: "Faith & Practice",
    note: "This section explores your relationship with God, your spiritual practices, and your faith journey. Take the time to reflect sincerely.",
    sections: [
      {
        key: "foi",
        title: "Faith & Beliefs",
        fields: [
          { id: "estChretien", label: "Are you a practicing Christian?", type: "single", options: ["Yes", "No, but seeking", "Other"] },
          { id: "denomination", label: "Your denomination or church tradition", type: "single", options: ["Catholic", "Protestant (Reformed)", "Evangelical", "Pentecostal", "Baptist", "Methodist", "Orthodox", "Non-denominational", "Other"] },
          { id: "denominationAutre", label: "If other, please specify", type: "text", placeholder: "Ex: Adventist…" },
          { id: "bapteme", label: "Have you been baptized?", type: "single", options: ["Yes, as an adult", "Yes, as a child", "Not yet, but I desire it", "No"] },
          { id: "converionDate", label: "When did you give your life to Christ?", type: "text", placeholder: "Approximate date or year" },
          { id: "temoignage", label: "Briefly share your testimony or faith journey", type: "textarea", placeholder: "How has God worked in your life?" },
        ],
      },
      {
        key: "dieu",
        title: "Your Relationship with God",
        fields: [
          { id: "relationDieu", label: "How would you describe your current relationship with God?", type: "qcm", options: ["Intimate and growing daily", "Sincere but with areas for growth", "In a period of seeking or spiritual dryness", "New or recently rekindled", "Prefer not to answer"] },
          { id: "epreuve", label: "What has been the greatest trial in your spiritual life, and what did you learn?", type: "textarea" },
          { id: "verset", label: "A Bible verse that guides your life", type: "text", placeholder: "Ex: Jeremiah 29:11" },
          { id: "livreBible", label: "Your favorite book of the Bible and why", type: "text" },
          { id: "priereSpeciale", label: "Is there a specific prayer request close to your heart?", type: "textarea" },
        ],
      },
      {
        key: "pratiques",
        title: "Daily Spiritual Disciplines",
        fields: [
          { id: "priere", label: "How often do you pray personally?", type: "single", options: ["Several times a day", "Once a day", "A few times a week", "Occasionally", "Rarely"] },
          { id: "jeune", label: "Do you practice fasting?", type: "single", options: ["Yes, regularly", "Occasionally", "Rarely", "No"] },
          { id: "louange", label: "Do you listen to worship music?", type: "single", options: ["Daily", "Several times a week", "Occasionally", "Rarely"] },
          { id: "discipline", label: "What spiritual discipline would you like to develop?", type: "textarea" },
          { id: "methodeBible", label: "How do you approach Bible study?", type: "single", options: ["Inductive study", "Topical study", "Through devotionals", "In a group", "I'm still learning"] },
        ],
      },
      {
        key: "engagement",
        title: "Church Involvement & Community",
        fields: [
          { id: "eglise", label: "Your church history", type: "single", options: ["In the same church since childhood", "Changed churches once or twice", "Currently seeking a church", "Other"] },
          { id: "membreActif", label: "Are you an active member of a church?", type: "single", options: ["Yes", "No, but I attend regularly", "No"] },
          { id: "implication", label: "Your level of involvement in your church", type: "single", options: ["Pastor or leader", "Deacon or elder", "Ministry leader", "Active member", "Occasional attendee"] },
          { id: "role", label: "Do you hold a leadership position?", type: "single", options: ["Yes", "Not currently, but I aspire to", "No, and it doesn't interest me", "I serve in other ways"] },
          { id: "communaute", label: "How do you build spiritual connections outside of church?", type: "textarea" },
        ],
      },
      {
        key: "croissance",
        title: "Growth & God's Place in Your Future Relationship",
        fields: [
          { id: "croissance", label: "How have you grown spiritually in the last 3 years?", type: "textarea" },
          { id: "roleDieu", label: "What role should God play in your future relationship?", type: "qcm", options: ["He must be the absolute foundation", "He is important but not the only criterion", "I'm still figuring out His place", "Prefer not to answer"] },
        ],
      },
    ],
  },
  {
    key: "q3",
    title: "Expectations & Vision",
    subtitle: "Marriage & Future",
    note: "This last section explores your vision of the couple, marriage, and life together. These answers are essential for building a solid and lasting relationship.",
    sections: [
      {
        key: "attentes",
        title: "Your Expectations for the Relationship",
        fields: [
          { id: "attentes", label: "Your expectations for this relationship", type: "multi", options: ["Emotional security", "Spiritual growth", "Building a family", "True friendship", "A ministry partner", "Mutual support in projects"], help: "Select up to 3", max: 3 },
          { id: "qualites", label: "3 essential qualities you seek in a partner", type: "text" },
          { id: "defauts", label: "3 deal-breakers you cannot tolerate", type: "text" },
          { id: "rythmeRelation", label: "Your ideal relationship timeline", type: "single", options: ["Less than 6 months", "6 months to 1 year", "1 to 2 years", "More than 2 years", "No rush"] },
        ],
      },
      {
        key: "visionCouple",
        title: "Roles & Responsibilities in a Couple",
        intro: "Share your vision of how a Christian couple should function on a daily basis.",
        fields: [
          { id: "visionCouple", label: "Your vision of roles within a couple", type: "textarea" },
          { id: "repartition", label: "How should household and financial responsibilities be shared?", type: "single", options: ["Traditional (man provides, woman manages the home)", "Egalitarian (shared equally)", "Flexible (based on each person's abilities)", "We will decide together"] },
          { id: "femmeTravail", label: "Do you think a woman should continue her career after marriage?", type: "single", options: ["Yes, absolutely", "It depends on the situation", "No, I prefer she focus on the family", "We will decide together"] },
          { id: "decision", label: "How should major decisions be made in a couple?", type: "single", options: ["The husband has the final say after discussion", "Joint and equal decisions", "The most competent person decides", "We will establish our own method"] },
        ],
      },
      {
        key: "finances",
        title: "Financial Management",
        intro: "Financial compatibility is a key pillar of a stable household.",
        fields: [
          { id: "budget", label: "Your preferred approach to managing finances as a couple", type: "single", options: ["Joint account", "Separate accounts with a shared one", "Each manages their own", "We will decide together"] },
          { id: "epargne", label: "Your savings and investment philosophy", type: "textarea" },
          { id: "dettes", label: "Do you have any financial obligations or debts?", type: "single", options: ["No", "Yes (student loan)", "Yes (mortgage)", "Yes (other)", "Prefer not to say"] },
          { id: "dime", label: "Do you practice tithing?", type: "single", options: ["Yes, faithfully", "Occasionally", "Not yet, but I plan to", "No"] },
        ],
      },
      {
        key: "enfants",
        title: "Children & Education",
        fields: [
          { id: "nbEnfants", label: "Your ideal number of children", type: "single", options: ["None", "1–2", "3–4", "5 or more", "God's will"] },
          { id: "delaiEnfants", label: "How long after marriage would you like to wait before having children?", type: "single", options: ["Right away", "After 1 year", "After 2–3 years", "No particular preference"] },
          { id: "education", label: "What educational approach would you like to adopt?", type: "single", options: ["Homeschooling", "Private Christian school", "Public school", "We will decide together", "I don't know yet"] },
          { id: "positionAvortement", label: "Your position on abortion", type: "single", options: ["Absolutely against, under any circumstances", "Except in case of danger to the mother", "I am pro-choice", "I prefer not to answer"] },
          { id: "educationEnfants", label: "What educational values do you want to pass on to your children?", type: "textarea" },
        ],
      },
      {
        key: "limitesNonNegociables",
        title: "Non-Negotiable Boundaries",
        fields: [
          { id: "limitesSpirituelles", label: "3 to 5 spiritual values that are absolutely non-negotiable", type: "textarea" },
          { id: "limitesComportementales", label: "Behaviors you could not accept", type: "textarea", help: "Ex: alcohol, tobacco, lack of respect…" },
          { id: "limitesRelationnelles", label: "Your physical boundaries before marriage", type: "textarea" },
        ],
      },
      {
        key: "styleDeVie",
        title: "Lifestyle & Compatibility",
        fields: [
          { id: "rythme", label: "Are you more of a…", type: "single", options: ["Morning person", "Night owl"] },
          { id: "organisation", label: "You are more…", type: "single", options: ["Organized and structured", "Spontaneous and flexible"] },
          { id: "rapportTravail", label: "Your relationship with work (ambition vs. balance)", type: "textarea" },
          { id: "gestionConflits", label: "How do you handle conflicts and disagreements?", type: "textarea" },
          { id: "reseauxSociaux", label: "What place do technology and social media have in your life?", type: "textarea" },
        ],
      },
      {
        key: "questionsFinales",
        title: "To Finish",
        intro: "A few open-ended questions (optional) to go deeper.",
        fields: [
          { id: "questionPartenaire", label: "If you could ask only one question to a potential partner, what would it be?", type: "textarea" },
          { id: "attiranceVsAmour", label: "What differentiates simple attraction from love guided by God?", type: "textarea" },
          { id: "mariageReussi", label: "Your definition of a successful marriage according to biblical standards", type: "textarea" },
          { id: "heritage", label: "What spiritual legacy do you hope to leave?", type: "textarea" },
          { id: "criteresMatching", label: "What are, in your opinion, the non-negotiable criteria for a successful match?", type: "textarea" },
        ],
      },
    ],
  },
];