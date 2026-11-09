/**
 * Registre central des « Nouveautés » de Garden of Alliance.
 *
 * Donnée pure, sans JSX ni dépendance serveur : testable sous vitest
 * (environnement `node`, voir `whats-new.test.ts`). Toute la logique de
 * sélection (fenêtre de dates, carte à afficher, badges, découverte) est ici,
 * partagée par l'API et l'interface.
 *
 * ── COMMENT ANNONCER UNE NOUVELLE FONCTIONNALITÉ ───────────────────────────────
 *  1. Développez et déployez la fonctionnalité d'abord. Une annonce n'est JAMAIS
 *     un moyen de la présenter avant qu'elle soit réellement utilisable.
 *  2. Ajoutez UNE entrée à `ANNOUNCEMENTS` ci-dessous, avec `active: false`.
 *     Aucun composant, aucune bannière à développer.
 *  3. Si la fonctionnalité dépend d'un réglage (interrupteur admin, abonnement,
 *     accès), choisissez ou ajoutez la clé `availability` correspondante dans
 *     `whats-new-server.ts` : c'est elle qui garantit côté serveur qu'elle est
 *     activée ET accessible à l'utilisateur concerné.
 *  4. Une fois le déploiement effectué et la fonctionnalité vérifiée en
 *     production : passez `active` à `true` et fixez `activatesAt` à la date de
 *     MISE EN LIGNE RÉELLE. Sans `expiresAt`, l'annonce s'éteint d'elle-même
 *     `DEFAULT_LIFETIME_DAYS` jours après `activatesAt` : une date d'activation
 *     antérieure au lancement réel raccourcit d'autant sa visibilité.
 *  5. Rédigez court et tourné vers le bénéfice : un titre qui dit ce que
 *     l'utilisateur y gagne (≤ 60 caractères), une description d'une phrase
 *     (≤ 160), en français ET en anglais (le type l'impose).
 *
 *  Le test `whats-new.test.ts` refuse tout identifiant dupliqué, texte manquant
 *  ou trop long, destination invalide ou clé de disponibilité inconnue.
 */

/** Où l'annonce s'adresse : visiteurs (public), membres approuvés, administrateurs. */
export type Surface = "public" | "member" | "admin";

/**
 * Condition RÉELLE de disponibilité, résolue côté serveur (`whats-new-server.ts`).
 * `always` = aucune condition au-delà du déploiement (la fonctionnalité n'a pas
 * d'interrupteur). Toute nouvelle clé doit recevoir un résolveur, sinon la
 * compilation échoue.
 */
export type AvailabilityKey = "always" | "referral" | "formation_pillars";

export interface AnnouncementCopy {
  title: string;
  description: string;
  /** Libellé du bouton ; par défaut « Découvrir » / « Discover ». */
  cta?: string;
}

export interface Announcement {
  /** Unique et stable, en kebab-case : clé de mémorisation et de statistiques. Ne jamais le renommer. */
  id: string;
  surface: Surface;
  /**
   * Statut actif/inactif. À `false` tant que la fonctionnalité n'est pas déployée,
   * activée et accessible : le code présent sur une branche ne suffit pas, et un
   * réglage activé côté admin ne suffit pas non plus à afficher une annonce inactive.
   */
  active: boolean;
  /** ISO. Jamais affichée avant cette date. À fixer à la mise en ligne réelle. */
  activatesAt: string;
  /** ISO. Retrait automatique ; à défaut, `activatesAt` + `DEFAULT_LIFETIME_DAYS`. */
  expiresAt?: string;
  availability: AvailabilityKey;
  /**
   * Destination du bouton « Découvrir » : peut être une sous-page réelle absente du
   * menu. C'est aussi la page dont la visite vaut « découverte ».
   */
  href: string;
  /**
   * Entrée de navigation qui reçoit le badge « Nouveau », si elle diffère de `href`
   * (ex. annonce de formation : `href` = la formation, `navHref` = « Académie »).
   * Défaut : `href`. Le badge reste jusqu'à la visite de `href`, pas de `navHref`.
   */
  navHref?: string;
  /** Plus grand = plus prioritaire quand plusieurs annonces sont vivantes. */
  priority?: number;
  fr: AnnouncementCopy;
  en: AnnouncementCopy;
}

/** Durée de vie par défaut d'une annonce sans `expiresAt` : une nouveauté ne doit pas durer indéfiniment par oubli. */
export const DEFAULT_LIFETIME_DAYS = 45;

/** Limites éditoriales (vérifiées par les tests). */
export const COPY_LIMITS = { title: 60, description: 160, cta: 24 } as const;

export const ANNOUNCEMENTS: readonly Announcement[] = [
  {
    id: "referral-program",
    surface: "member",
    active: false, // → true quand le parrainage est déployé ET activé (Admin → Paramètres → Parrainage)
    activatesAt: "2026-11-05T00:00:00Z", // PROVISOIRE : à remplacer par la date de mise en ligne réelle
    availability: "referral",
    href: "/dashboard/parrainage",
    priority: 30,
    fr: {
      title: "Invitez vos proches, gagnez GOLD",
      description: "Partagez votre lien : dès que vos filleuls sont validés, vous débloquez l'abonnement GOLD.",
    },
    en: {
      title: "Invite your loved ones, earn GOLD",
      description: "Share your link: once your referrals are validated, you unlock the GOLD subscription.",
    },
  },
  {
    id: "formations-pillars-2-3",
    surface: "member",
    active: false, // → true quand les piliers 2 et 3 sont déployés en production
    activatesAt: "2026-11-05T00:00:00Z", // PROVISOIRE : à remplacer par la date de mise en ligne réelle
    availability: "formation_pillars",
    href: "/dashboard/academie/batir-sur-le-roc",
    navHref: "/dashboard/academie", // le badge va sur « Académie », le bouton mène à la formation
    priority: 20,
    fr: {
      title: "Deux nouveaux piliers de formation",
      description: "Les piliers 2 et 3 de « Bâtir sur le roc » sont ouverts : avancez à votre rythme.",
    },
    en: {
      title: "Two new formation pillars",
      description: "Pillars 2 and 3 of “Building on the Rock” are open: move forward at your own pace.",
    },
  },
  {
    id: "chat-fullscreen",
    surface: "member",
    active: false, // → true quand la nouvelle messagerie mobile est déployée
    activatesAt: "2026-11-05T00:00:00Z", // PROVISOIRE : à remplacer par la date de mise en ligne réelle
    availability: "always",
    href: "/dashboard?tab=Messages",
    priority: 10,
    fr: {
      title: "Une messagerie plus confortable",
      description: "Sur téléphone, la conversation passe en plein écran : votre champ de saisie reste toujours visible.",
    },
    en: {
      title: "A more comfortable chat",
      description: "On your phone, conversations now open full screen, with your message box always in view.",
    },
  },
  {
    id: "admin-whats-new-stats",
    surface: "admin",
    active: false, // → true quand l'écran Annonces est déployé
    activatesAt: "2026-11-05T00:00:00Z", // PROVISOIRE : à remplacer par la date de mise en ligne réelle
    availability: "always",
    href: "/admin/announcements",
    fr: {
      title: "Mesurez l'effet des nouveautés",
      description: "Consultez les affichages, clics et fermetures de chaque annonce, en mesures agrégées.",
    },
    en: {
      title: "See how announcements perform",
      description: "Review the views, clicks and dismissals of each announcement, as aggregated measures.",
    },
  },
  {
    id: "admin-password-reset-requests",
    surface: "admin",
    active: false, // → true quand l'inscription par téléphone et la migration 20261111 sont en production
    activatesAt: "2026-11-11T00:00:00Z", // PROVISOIRE : à remplacer par la date de mise en ligne réelle
    availability: "always",
    href: "/admin/password-resets",
    navHref: "/admin/password-resets",
    fr: {
      title: "Réinitialisations de mot de passe",
      description: "Les membres inscrits par téléphone demandent un lien sécurisé ici, après votre vérification.",
    },
    en: {
      title: "Password reset requests",
      description: "Members who signed up by phone ask for a secure link here, after your identity check.",
    },
  },
];

// ── Sélection (pure) ───────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fin de vie effective : `expiresAt`, sinon activation + `DEFAULT_LIFETIME_DAYS`. */
export function effectiveExpiry(a: Pick<Announcement, "activatesAt" | "expiresAt">): number {
  return a.expiresAt ? Date.parse(a.expiresAt) : Date.parse(a.activatesAt) + DEFAULT_LIFETIME_DAYS * DAY_MS;
}

/**
 * Statut actif ET dans la fenêtre de dates. `active: false` l'emporte toujours :
 * aucun réglage ailleurs ne peut rendre visible une annonce désactivée.
 * Ne dit rien de la disponibilité réelle (résolue côté serveur).
 */
export function isInWindow(a: Announcement, now: number = Date.now()): boolean {
  return a.active && now >= Date.parse(a.activatesAt) && now < effectiveExpiry(a);
}

export function getAnnouncement(id: string): Announcement | undefined {
  return ANNOUNCEMENTS.find((a) => a.id === id);
}

/** Chemin interne sûr : jamais de schéma, d'hôte, d'antislash ni de `//` (pas de redirection ouverte). */
export function isSafeInternalHref(href: string): boolean {
  return /^\/(?!\/)[^\s\\]*$/.test(href);
}

/** Entrée de navigation qui porte le badge « Nouveau » : `navHref ?? href`. */
export function badgeTarget(a: Pick<Announcement, "href" | "navHref">): string {
  return a.navHref ?? a.href;
}

/**
 * Annonce telle que le client la reçoit : uniquement ce qui est affichable.
 * (`active` et `availability` sont des détails serveur.)
 */
export interface AnnouncementView {
  id: string;
  surface: Surface;
  href: string;
  navHref?: string;
  priority?: number;
  activatesAt: string;
  fr: AnnouncementCopy;
  en: AnnouncementCopy;
  /** Carte fermée : elle ne se réaffiche plus, mais le badge peut rester. */
  dismissed: boolean;
  /** Fonctionnalité réellement découverte (sa destination `href` atteinte) : carte ET badge s'éteignent. */
  discovered: boolean;
}

const byImportance = (a: AnnouncementView, b: AnnouncementView) =>
  (b.priority ?? 0) - (a.priority ?? 0) || Date.parse(b.activatesAt) - Date.parse(a.activatesAt);

/**
 * La carte à afficher : au plus UNE à la fois. Fermer une annonce masque sa carte
 * (la suivante peut alors apparaître), sans éteindre son badge.
 */
export function pickCard(views: readonly AnnouncementView[]): AnnouncementView | null {
  return [...views].filter((v) => !v.dismissed && !v.discovered).sort(byImportance)[0] ?? null;
}

/**
 * Entrées de navigation à badger (`navHref ?? href`) : tant que la fonctionnalité
 * n'est pas découverte, même si la carte a été fermée.
 */
export function badgeTargets(views: readonly AnnouncementView[]): string[] {
  return [...new Set(views.filter((v) => !v.discovered).map(badgeTarget))];
}

export function localize(v: Pick<AnnouncementView, "fr" | "en">, locale: string): AnnouncementCopy {
  return locale === "en" ? v.en : v.fr;
}

/**
 * La destination `href` est-elle atteinte ? C'est la seule définition de « découverte » :
 * ouvrir une section parente (« Académie ») ne compte pas, seule la vraie destination
 * (ou une page située sous elle) compte. Un `href` à onglet (`/dashboard?tab=X`) exige
 * l'onglet X.
 */
export function matchesDestination(href: string, pathname: string, tab: string | null): boolean {
  const [path, query] = href.split("?");
  if (query) {
    const wanted = new URLSearchParams(query).get("tab");
    return pathname === path && wanted !== null && wanted === tab;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
