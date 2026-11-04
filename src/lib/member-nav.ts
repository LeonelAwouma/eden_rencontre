import type { Tab } from "@/components/dashboard/dashboard-types";
import { SUPPORT_WHATSAPP_URL } from "@/lib/contact";

/**
 * Source unique des destinations de l'espace membre.
 *
 * Avant ce fichier, les liens de navigation étaient définis quatre fois (sidebar,
 * barre inférieure inline dans `dashboard/page.tsx`, tiroir du profil, en-têtes de
 * sous-pages), avec des libellés et des états actifs qui divergeaient. Tout passe
 * désormais par `MEMBER_GROUPS` / `MEMBER_DESTS`.
 *
 * Volontairement sans icône ni JSX : ce module reste de la donnée pure, donc
 * testable par vitest (environnement `node`, voir `member-nav.test.ts`). Les
 * icônes sont associées par `id` dans `components/dashboard/member-nav-icons.ts`.
 */

export type MemberDest =
  /** Vue de la SPA `/dashboard`, pilotée par `activeTab`. */
  | { id: string; kind: "tab"; tab: Tab; labelKey: string }
  /** Vraie route Next. */
  | { id: string; kind: "route"; href: string; labelKey: string }
  /** Lien sortant (nouvel onglet). */
  | { id: string; kind: "external"; href: string; labelKey: string }
  /** Action de la chrome, pas une destination. */
  | { id: string; kind: "action"; action: "logout"; labelKey: string };

export type MemberGroup = { key: string; labelKey: string; dests: MemberDest[] };

/**
 * Les onglets sont nommés en anglais, forme canonique du type `Tab`.
 * Les alias français (« Accueil », « Découvrir »…) existent encore dans le type
 * pour l'historique, mais ne doivent plus servir de clé : la barre inférieure les
 * utilisait et son surlignage se désynchronisait dès qu'un alias anglais passait
 * par `setActiveTab`.
 */
export const MEMBER_GROUPS: MemberGroup[] = [
  {
    key: "main",
    labelKey: "dashboardSidebar.groupMain",
    dests: [
      { id: "home", kind: "tab", tab: "Home", labelKey: "dashboardTabs.home" },
      { id: "discover", kind: "tab", tab: "Discover", labelKey: "dashboardTabs.discover" },
      { id: "messages", kind: "tab", tab: "Messages", labelKey: "dashboardTabs.messages" },
    ],
  },
  {
    key: "interactions",
    labelKey: "dashboardSidebar.groupInteractions",
    dests: [
      { id: "requests", kind: "tab", tab: "Requests", labelKey: "dashboardTabs.requests" },
      { id: "favorites", kind: "tab", tab: "Favorites", labelKey: "dashboardTabs.favorites" },
      { id: "visitors", kind: "tab", tab: "Visitors", labelKey: "dashboardTabs.visitors" },
    ],
  },
  {
    key: "community",
    labelKey: "dashboardSidebar.groupCommunity",
    dests: [
      { id: "forum", kind: "route", href: "/dashboard/forum", labelKey: "forum.title" },
      { id: "academy", kind: "route", href: "/dashboard/academie", labelKey: "dashboard.academyTitle" },
      { id: "referral", kind: "route", href: "/dashboard/parrainage", labelKey: "referral.navLabel" },
    ],
  },
  {
    key: "account",
    labelKey: "dashboardSidebar.groupAccount",
    dests: [
      // Le profil complet (et son parcours de foi) est la seule cible de « Profil » :
      // l'onglet `Profile` de la SPA reste atteignable par `?tab=Profile`.
      { id: "profile", kind: "route", href: "/dashboard/profile", labelKey: "dashboardTabs.profile" },
      { id: "subscription", kind: "tab", tab: "Premium", labelKey: "dashboardSidebar.subscription" },
      // L'onglet Notifications porte déjà les réglages (PushOptIn, préférences e-mail).
      { id: "settings", kind: "tab", tab: "Notifications", labelKey: "dashboardSidebar.notificationsSettings" },
      { id: "help", kind: "external", href: SUPPORT_WHATSAPP_URL, labelKey: "dashboardSidebar.help" },
      { id: "logout", kind: "action", action: "logout", labelKey: "dashboardSidebar.logout" },
    ],
  },
];

/** Les cinq entrées de la barre inférieure mobile ; `menu` ouvre le tiroir. */
export const MEMBER_PRIMARY_IDS = ["home", "discover", "messages", "forum"] as const;

/** Registre plat, indexé par `id`. */
export const MEMBER_DESTS: Record<string, MemberDest> = Object.fromEntries(
  MEMBER_GROUPS.flatMap((g) => g.dests).map((d) => [d.id, d])
);

export function memberDest(id: string): MemberDest {
  const dest = MEMBER_DESTS[id];
  if (!dest) throw new Error(`Destination membre inconnue : ${id}`);
  return dest;
}

/** Destinations de la barre inférieure, dans l'ordre d'affichage. */
export const MEMBER_PRIMARY: MemberDest[] = MEMBER_PRIMARY_IDS.map(memberDest);

/**
 * Adresse d'une entrée du menu, ou `null` pour un lien sortant / une action.
 * Sert à rapprocher une entrée de menu d'une annonce « Nouveauté » (`navHref`).
 */
export function destHref(dest: MemberDest): string | null {
  if (dest.kind === "tab") return `/dashboard?tab=${dest.tab}`;
  if (dest.kind === "route") return dest.href;
  return null;
}
