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

