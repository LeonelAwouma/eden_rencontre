/**
 * @fileOverview Génération locale de suggestions de premiers messages (sans IA externe).
 *
 * Auparavant basé sur Genkit/Gemini (nécessitait une clé API → plantait sans clé).
 * Désormais 100 % local : un algorithme de templates personnalise 3 ouvertures
 * respectueuses à partir du nom, de la vision du foyer et de ce que la personne recherche.
 *
 * - generateMessageIdeas — renvoie 3 suggestions.
 * - GenerateMessageIdeasInput / GenerateMessageIdeasOutput — types conservés (compat).
 */

export interface GenerateMessageIdeasInput {
  profileName: string;
  visionMarriage: string;
  search: string;
}

export interface GenerateMessageIdeasOutput {
  suggestions: string[];
}

// Choix pseudo-aléatoire (varie les suggestions à chaque appel).
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Extrait une courte amorce d'un texte (sur une frontière de mot), sans ponctuation finale.
function snippet(text: string | undefined, max = 70): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean.replace(/[.…]+$/, "");
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, "") + "…";
}

export async function generateMessageIdeas(
  input: GenerateMessageIdeasInput
): Promise<GenerateMessageIdeasOutput> {
  const name = (input.profileName || "").trim() || "vous";
  const vision = snippet(input.visionMarriage);
  const search = snippet(input.search);

  // 1) Approche fondée sur la vision commune du foyer
  const visionOpeners = [
    `Bonjour ${name}, votre vision d'un foyer fondé sur la foi m'a profondément touché. J'aimerais, si vous le permettez, échanger sur ce que signifie pour vous bâtir une union qui dure.`,
    `Que la paix soit avec vous, ${name}. Votre manière d'envisager le mariage résonne avec mes propres aspirations. Seriez-vous ouvert(e) à faire connaissance, sans précipitation et dans le respect ?`,
    vision
      ? `Bonjour ${name}, lorsque vous évoquez « ${vision} », cela rejoint exactement ma vision du foyer. J'aimerais beaucoup en discuter avec vous.`
      : `Bonjour ${name}, j'ai été inspiré par votre désir d'un foyer ancré en Christ. J'aimerais apprendre à vous connaître, avec sincérité et patience.`,
  ];

  // 2) Approche fondée sur les valeurs spirituelles
  const valuesOpeners = [
    `Bonjour ${name}, on devine chez vous une foi sincère et de belles valeurs. J'aimerais échanger sur ce qui compte vraiment : la prière, l'engagement et la fidélité au quotidien.`,
    `Que Dieu vous bénisse, ${name}. Vos valeurs transparaissent dans votre profil. J'aimerais, en toute simplicité, faire votre connaissance et partager nos cheminements de foi.`,
    `Bonjour ${name}, ce qui m'a marqué, c'est la place centrale de la foi dans votre vie. Pourrions-nous échanger sur la façon dont elle guide vos choix et vos espérances ?`,
  ];

  // 3) Approche douce et encourageante
  const gentleOpeners = [
    `Bonjour ${name}, j'espère que cette journée vous est douce. Votre profil m'a donné envie de vous saluer avec respect et de vous souhaiter de belles bénédictions.`,
    `Bonjour ${name}, simplement un message bienveillant : votre profil dégage beaucoup de sincérité. Au plaisir d'échanger, si le cœur vous en dit.`,
    search
      ? `Que la grâce vous accompagne, ${name}. Vous recherchez « ${search} » — c'est aussi ce qui m'anime. J'aimerais entamer une conversation paisible pour vous découvrir.`
      : `Que la grâce vous accompagne, ${name}. J'aimerais entamer une conversation paisible, sans pression, juste pour apprendre à vous découvrir.`,
  ];

  return {
    suggestions: [pick(visionOpeners), pick(valuesOpeners), pick(gentleOpeners)],
  };
}
