export type Tab = "Accueil" | "Découvrir" | "Visiteurs" | "Favoris" | "Demandes" | "Premium" | "Messages" | "Notifications" | "Profil";

export const TABS: Tab[] = ["Accueil", "Découvrir", "Visiteurs", "Favoris", "Demandes", "Premium", "Messages", "Notifications", "Profil"];

export type ComposerType = "Publication" | "Témoignage" | "Prière";

export type FeedPost = {
  id: string;
  type: string;
  name: string;
  avatar?: string | null;
  when: string;
  text: string;
  image?: string | null;
  likes: number;
  comments: number;
  mine?: boolean;
  createdAt?: number;
};

export const EDIT_WINDOW_MS = 10 * 60 * 1000;

export const DAILY_VERSES = [
  { text: "Que le mariage soit honoré de tous, et le lit conjugal exempt de souillure.", ref: "Hébreux 13:4" },
  { text: "L'amour est patient, il est plein de bonté.", ref: "1 Corinthiens 13:4" },
  { text: "Ce que Dieu a uni, que l'homme ne le sépare point.", ref: "Matthieu 19:6" },
  { text: "Il n'est pas bon que l'homme soit seul.", ref: "Genèse 2:18" },
  { text: "Deux valent mieux qu'un… si l'un tombe, l'autre le relève.", ref: "Ecclésiaste 4:9-10" },
  { text: "Que l'amour soit sans hypocrisie.", ref: "Romains 12:9" },
  { text: "Au-dessus de tout, revêtez-vous de l'amour, lien de la perfection.", ref: "Colossiens 3:14" },
  { text: "Celui qui trouve une femme trouve le bonheur ; c'est une grâce de l'Éternel.", ref: "Proverbes 18:22" },
  { text: "Maris, aimez vos femmes comme Christ a aimé l'Église.", ref: "Éphésiens 5:25" },
  { text: "Soumettez-vous les uns aux autres dans la crainte de Christ.", ref: "Éphésiens 5:21" },
  { text: "L'amour couvre une multitude de péchés.", ref: "1 Pierre 4:8" },
  { text: "Si l'Éternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain.", ref: "Psaume 127:1" },
  { text: "Réjouis-toi avec la femme de ta jeunesse.", ref: "Proverbes 5:18" },
  { text: "Confie-toi en l'Éternel de tout ton cœur.", ref: "Proverbes 3:5" },
  { text: "L'amour ne périt jamais.", ref: "1 Corinthiens 13:8" },
];

export const VERSE_OF_DAY = DAILY_VERSES[0];