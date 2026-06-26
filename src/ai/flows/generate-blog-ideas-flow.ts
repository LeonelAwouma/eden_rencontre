/**
 * @fileOverview Génération locale d'idées d'articles pour le blog « Édification » (sans IA externe).
 *
 * Auparavant basé sur Genkit/Gemini (nécessitait une clé API). Désormais 100 % local :
 * un algorithme de templates compose des pistes d'articles à partir d'un sujet.
 *
 * - generateBlogIdeas — renvoie une liste d'idées (titre, description, plan).
 * - Types conservés pour compatibilité avec la page Blog.
 */

export interface GenerateBlogIdeasInput {
  topic: string;
}

export interface BlogPostIdea {
  title: string;
  description: string;
  outline: string[];
}

export interface GenerateBlogIdeasOutput {
  ideas: BlogPostIdea[];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cap(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// Modèles d'articles : chaque fabrique produit une idée complète à partir du sujet.
const TEMPLATES: ((topic: string) => BlogPostIdea)[] = [
  (t) => ({
    title: `${cap(t)} : ce que dit la Bible`,
    description: `Un regard biblique et concret sur « ${t} », pour bâtir un couple chrétien solide et durable.`,
    outline: [
      "Introduction : pourquoi ce sujet touche tant de couples",
      "Les fondements bibliques (versets clés et leur sens)",
      "Les pièges courants et comment les éviter",
      "Conseils pratiques pour la semaine",
      "Prière de clôture",
    ],
  }),
  (t) => ({
    title: `5 clés pour vivre « ${t} » dans la foi`,
    description: `Cinq principes simples et éprouvés pour aborder « ${t} » avec sagesse, patience et amour.`,
    outline: [
      "Clé 1 : mettre Christ au centre",
      "Clé 2 : communiquer avec vérité et douceur",
      "Clé 3 : poser des limites saines",
      "Clé 4 : persévérer dans la prière commune",
      "Clé 5 : célébrer les petits pas",
    ],
  }),
  (t) => ({
    title: `Témoignage : comment nous avons traversé « ${t} »`,
    description: `Le parcours édifiant d'un couple chrétien face à « ${t} » — épreuves, grâce et restauration.`,
    outline: [
      "Le contexte : là où tout a commencé",
      "L'épreuve et les doutes",
      "Le tournant : ce que Dieu a opéré",
      "Les leçons retenues",
      "Un encouragement pour les lecteurs",
    ],
  }),
  (t) => ({
    title: `Questions fréquentes sur « ${t} »`,
    description: `Les interrogations les plus courantes autour de « ${t} », avec des réponses pastorales et bienveillantes.`,
    outline: [
      "« Est-ce normal de ressentir cela ? »",
      "Ce que l'Écriture enseigne vraiment",
      "Distinguer culture et foi",
      "Quand et comment se faire accompagner",
      "Ressources pour aller plus loin",
    ],
  }),
  (t) => ({
    title: `${cap(t)} : avant, pendant et après le mariage`,
    description: `Comment « ${t} » évolue au fil du chemin, du célibat à l'alliance — préparer, vivre, durer.`,
    outline: [
      "Pendant le célibat : se préparer",
      "Aux fiançailles : poser les bases",
      "Dans le mariage : entretenir la flamme",
      "Face aux saisons difficiles",
      "Transmettre aux générations suivantes",
    ],
  }),
];

export async function generateBlogIdeas(input: GenerateBlogIdeasInput): Promise<GenerateBlogIdeasOutput> {
  const topic = (input.topic || "le couple chrétien").trim();

  // On mélange les modèles et on en retient 3 ou 4 (variés à chaque génération).
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5);
  const count = 3 + Math.floor(Math.random() * 2); // 3 ou 4
  const ideas = shuffled.slice(0, count).map((make) => make(topic));

  return { ideas };
}
