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

// ── Neutral verses (suitable for all) ──
const NEUTRAL_VERSES = [
  { text: "Let marriage be held in honor among all, and let the marriage bed be undefiled.", ref: "Hebrews 13:4" },
  { text: "Love is patient, love is kind.", ref: "1 Corinthians 13:4" },
  { text: "What God has joined together, let no one separate.", ref: "Matthew 19:6" },
  { text: "It is not good that the man should be alone.", ref: "Genesis 2:18" },
  { text: "Two are better than one… if one falls, the other lifts him up.", ref: "Ecclesiastes 4:9-10" },
  { text: "Let love be genuine.", ref: "Romans 12:9" },
  { text: "Above all, put on love, which binds everything together in perfect harmony.", ref: "Colossians 3:14" },
  { text: "Submit to one another out of reverence for Christ.", ref: "Ephesians 5:21" },
  { text: "Love covers a multitude of sins.", ref: "1 Peter 4:8" },
  { text: "Unless the Lord builds the house, those who build it labor in vain.", ref: "Psalm 127:1" },
  { text: "Trust in the Lord with all your heart.", ref: "Proverbs 3:5" },
  { text: "Love never ends.", ref: "1 Corinthians 13:8" },
];

// ── Male-specific verses ──
const MALE_VERSES = [
  { text: "He who finds a wife finds a good thing and obtains favor from the Lord.", ref: "Proverbs 18:22" },
  { text: "Husbands, love your wives, as Christ loved the church.", ref: "Ephesians 5:25" },
  { text: "Rejoice in the wife of your youth.", ref: "Proverbs 5:18" },
  { text: "An excellent wife who can find? She is far more precious than jewels.", ref: "Proverbs 31:10" },
  { text: "Let him who is without sin cast the first stone.", ref: "John 8:7" },
];

// ── Female-specific verses ──
const FEMALE_VERSES = [
  { text: "An excellent wife, who can find? Her worth is far above jewels.", ref: "Proverbs 31:10" },
  { text: "Wives, submit to your own husbands, as to the Lord.", ref: "Ephesians 5:22" },
  { text: "The Lord is my strength and my shield; in him my heart trusts.", ref: "Psalm 28:7" },
  { text: "She is clothed with strength and dignity, and she laughs at the time to come.", ref: "Proverbs 31:25" },
  { text: "The Lord gives joy to the wife of her youth.", ref: "Psalm 46:17" },
];

export function getDailyVerses(gender?: string | null): { text: string; ref: string }[] {
  const all = [...NEUTRAL_VERSES];
  if (gender === "homme" || gender === "male" || gender === "M") {
    all.push(...MALE_VERSES);
  } else if (gender === "femme" || gender === "female" || gender === "F") {
    all.push(...FEMALE_VERSES);
  }
  return all;
}

export const DAILY_VERSES = [...NEUTRAL_VERSES, ...MALE_VERSES];

export const VERSE_OF_DAY = NEUTRAL_VERSES[0];
