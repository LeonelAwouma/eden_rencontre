export type Tab = "Home" | "Discover" | "Visitors" | "Favorites" | "Requests" | "Premium" | "Messages" | "Notifications" | "Profile" | "Accueil" | "Découvrir" | "Visiteurs" | "Favoris" | "Demandes" | "Profil";

export const TABS: Tab[] = ["Home", "Discover", "Visitors", "Favorites", "Requests", "Premium", "Messages", "Notifications", "Profile"];

export type ComposerType = "Post" | "Testimony" | "Prayer" | "Publication" | "Témoignage";

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

// Versets du jour : voir src/lib/verses.ts (bilingues, selon le genre du profil).


/** Clé de traduction du libellé de chaque onglet (alias FR compris). Source unique : sidebar et page l'en dupliquaient. */
export const TAB_LABEL_KEY: Record<string, string> = {
  Home: "dashboardTabs.home", Accueil: "dashboardTabs.home",
  Discover: "dashboardTabs.discover", Découvrir: "dashboardTabs.discover",
  Visitors: "dashboardTabs.visitors", Visiteurs: "dashboardTabs.visitors",
  Favorites: "dashboardTabs.favorites", Favoris: "dashboardTabs.favorites",
  Requests: "dashboardTabs.requests", Demandes: "dashboardTabs.requests",
  Premium: "dashboardTabs.premium",
  Messages: "dashboardTabs.messages",
  Notifications: "dashboardTabs.notifications",
  Profile: "dashboardTabs.profile", Profil: "dashboardTabs.profile",
};

/** Onglets équivalents (FR / EN) : « Accueil » et « Home » désignent le même écran. */
const SAME_TAB: Record<string, Tab> = {
  Accueil: "Home", Découvrir: "Discover", Visiteurs: "Visitors", Favoris: "Favorites", Demandes: "Requests", Profil: "Profile",
};
export const canonicalTab = (tab: Tab): Tab => SAME_TAB[tab] ?? tab;
