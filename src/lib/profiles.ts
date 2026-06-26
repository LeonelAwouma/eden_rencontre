// 100 contacts fictifs pour enrichir la plateforme (générés de façon déterministe).

export interface Profile {
  id: number;
  name: string;
  age: number;
  gender: "femme" | "homme";
  location: string;
  country: string;
  profession: string;
  match: string;
  image: string;
  faith: string;
  bio: string;
}

const FEMMES = [
  "Daba", "Awa", "Ndeye", "Fama", "Aïcha", "Grâce", "Esther", "Ruth", "Marie", "Sarah",
  "Rébecca", "Déborah", "Naomi", "Lydie", "Priscille", "Hannah", "Abigaëlle", "Salomé", "Myriam", "Rachel",
  "Eunice", "Tabitha", "Kadiatou", "Fatou", "Mariama",
];

const HOMMES = [
  "Jean", "Paul", "Pierre", "Daniel", "David", "Samuel", "Josué", "Emmanuel", "Étienne", "Timothée",
  "Élie", "Isaac", "Jacob", "Nathan", "Gédéon", "Ézéchiel", "Boaz", "Siméon", "Barnabé", "Philippe",
  "Aaron", "Moïse", "Ibrahima", "Mamadou", "Joseph",
];

const INITIALS = ["D.", "N.", "M.", "S.", "B.", "K.", "T.", "F.", "G.", "C.", "L.", "A."];

const CITIES = [
  { city: "Dakar", country: "Sénégal" }, { city: "Thiès", country: "Sénégal" },
  { city: "Abidjan", country: "Côte d'Ivoire" }, { city: "Yamoussoukro", country: "Côte d'Ivoire" },
  { city: "Douala", country: "Cameroun" }, { city: "Yaoundé", country: "Cameroun" },
  { city: "Kinshasa", country: "RD Congo" }, { city: "Lubumbashi", country: "RD Congo" },
  { city: "Libreville", country: "Gabon" }, { city: "Cotonou", country: "Bénin" },
  { city: "Lomé", country: "Togo" }, { city: "Ouagadougou", country: "Burkina Faso" },
  { city: "Bamako", country: "Mali" }, { city: "Conakry", country: "Guinée" },
  { city: "Brazzaville", country: "Congo" }, { city: "Paris", country: "France" },
  { city: "Bruxelles", country: "Belgique" }, { city: "Montréal", country: "Canada" },
  { city: "Genève", country: "Suisse" }, { city: "Londres", country: "Royaume-Uni" },
];

const PROFESSIONS = [
  "Infirmière", "Enseignant", "Ingénieur", "Comptable", "Juriste", "Médecin", "Assistant pastoral",
  "Entrepreneur", "Développeur", "Sage-femme", "Architecte", "Professeur", "Banquier", "Styliste",
  "Agronome", "Pharmacien", "Journaliste", "Travailleur social", "Étudiant en théologie", "Commerçant",
];

const FAITH = ["Évangélique", "Protestant", "Catholique", "Pentecôtiste", "Baptiste", "Méthodiste", "Adventiste"];

const BIOS = [
  "Je place Christ au centre de ma vie et je recherche une alliance bâtie sur la foi et le respect.",
  "Passionné(e) de louange et de service à l'église, je crois en un foyer fondé sur la prière.",
  "À la recherche d'une personne sincère pour cheminer vers le mariage dans la crainte de Dieu.",
  "La famille, la fidélité et la Parole guident mes choix. Je crois au temps parfait du Seigneur.",
  "Engagé(e) dans mon assemblée, je désire un foyer où l'amour et la foi grandissent chaque jour.",
  "Je crois qu'une union bénie se construit sur la communication, la patience et la prière commune.",
];

export const PROFILES: Profile[] = Array.from({ length: 100 }, (_, i) => {
  const gender: "femme" | "homme" = i % 2 === 0 ? "femme" : "homme";
  const pool = gender === "femme" ? FEMMES : HOMMES;
  const first = pool[Math.floor(i / 2) % pool.length];
  const initial = INITIALS[i % INITIALS.length];
  const loc = CITIES[i % CITIES.length];
  const profession = PROFESSIONS[(i * 3) % PROFESSIONS.length];
  const faith = FAITH[i % FAITH.length];
  const bio = BIOS[i % BIOS.length];
  const age = 20 + ((i * 3) % 19); // 20 → 38
  const match = 99 - ((i * 5) % 30); // 70 → 99

  return {
    id: i + 1,
    name: `${first} ${initial}`,
    age,
    gender,
    location: loc.city,
    country: loc.country,
    profession,
    match: `${match}%`,
    image: `https://picsum.photos/seed/eden${i + 1}/400/500`,
    faith,
    bio,
  };
});

export const FEATURED_PROFILES = PROFILES.slice(0, 8);
