/**
 * Navigation de l'administration : données pures (aucune dépendance React),
 * pour que l'organisation et l'état actif se vérifient par des tests.
 *
 * Six rubriques métier repliables + « Paramètres », entrée indépendante affichée
 * en bas du menu. Les icônes sont associées par `id` dans `components/admin/sidebar.tsx`.
 * Réorganiser ce fichier ne change aucune route ni aucune permission : l'accès
 * reste imposé par le middleware (`/admin/*`) et par `requireAdmin` côté API.
 */

export type AdminNavGroupId =
  | "pilotage" | "members" | "encounters" | "community" | "content" | "finance";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  /** Rubrique d'appartenance ; `null` pour une entrée indépendante (Paramètres). */
  group: AdminNavGroupId | null;
}

export const ADMIN_NAV_GROUPS: ReadonlyArray<{ id: AdminNavGroupId; label: string }> = [
  { id: "pilotage", label: "Pilotage" },
  { id: "members", label: "Membres & Coachs" },
  { id: "encounters", label: "Rencontres & Accompagnement" },
  { id: "community", label: "Communauté & Modération" },
  { id: "content", label: "Contenus & Communication" },
  { id: "finance", label: "Finance & Croissance" },
];

/** Entrée indépendante, affichée en bas du menu (hors des six rubriques). */
export const ADMIN_SETTINGS_ITEM: AdminNavItem = {
  id: "settings", label: "Paramètres", href: "/admin/settings", group: null,
};

export const ADMIN_NAV_ITEMS: ReadonlyArray<AdminNavItem> = [
  { id: "dashboard", label: "Tableau de bord", href: "/admin/dashboard", group: "pilotage" },
  { id: "analytics", label: "Analytics", href: "/admin/analytics", group: "pilotage" },
  { id: "analytics-lessons", label: "Analyse des leçons", href: "/admin/analytics/lessons", group: "pilotage" },

  { id: "users", label: "Utilisateurs", href: "/admin/users", group: "members" },
  { id: "coaches", label: "Coachs", href: "/admin/users/coaches", group: "members" },
  { id: "coach-assignments", label: "Affectation aux coachs", href: "/admin/users/coach-assignments", group: "members" },
  { id: "photos", label: "Import de fichiers", href: "/admin/photos", group: "members" },
  { id: "password-resets", label: "Demandes de réinitialisation", href: "/admin/password-resets", group: "members" },
  { id: "accessibility", label: "Accessibilité", href: "/admin/accessibilite", group: "members" },

  { id: "matching", label: "Matching", href: "/admin/matching", group: "encounters" },
  { id: "events", label: "Événements", href: "/admin/events", group: "encounters" },
  { id: "meets", label: "Visioconférences", href: "/admin/meets", group: "encounters" },
  { id: "meetings", label: "Rendez-vous", href: "/admin/meetings", group: "encounters" },

  { id: "chat-monitoring", label: "Surveillance des discussions", href: "/admin/chat-monitoring", group: "community" },
  { id: "messages", label: "Messagerie", href: "/admin/messages", group: "community" },
  { id: "forum", label: "Forum", href: "/admin/forum", group: "community" },
  { id: "reports", label: "Rapports et signalements", href: "/admin/reports", group: "community" },

  { id: "mediatheque", label: "Médiathèque et Académie du Mariage", href: "/admin/mediatheque", group: "content" },
  { id: "blog", label: "Blog", href: "/admin/blog", group: "content" },
  { id: "announcements", label: "Annonces", href: "/admin/announcements", group: "content" },
  { id: "testimonials", label: "Témoignages", href: "/admin/testimonials", group: "content" },

  { id: "payments", label: "Paiements", href: "/admin/payments", group: "finance" },
  { id: "referrals", label: "Parrainages et récompenses", href: "/admin/referrals", group: "finance" },

  ADMIN_SETTINGS_ITEM,
];

/** Une adresse correspond à sa page exacte et à ses sous-pages (jamais à un simple préfixe de texte). */
function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Entrée active pour une adresse : la correspondance la plus précise l'emporte,
 * de sorte que /admin/users/coaches n'allume pas aussi « Utilisateurs » et que
 * /admin/analytics/lessons n'allume pas aussi « Analytics ».
 */
export function activeAdminNavHref(pathname: string, items: ReadonlyArray<AdminNavItem> = ADMIN_NAV_ITEMS): string | null {
  let best: string | null = null;
  for (const item of items) {
    if (!matches(pathname, item.href)) continue;
    if (best === null || item.href.length > best.length) best = item.href;
  }
  return best;
}

/** Rubrique de la page consultée (null pour Paramètres, une adresse inconnue ou hors menu). */
export function activeAdminGroupId(pathname: string, items: ReadonlyArray<AdminNavItem> = ADMIN_NAV_ITEMS): AdminNavGroupId | null {
  const href = activeAdminNavHref(pathname, items);
  return items.find((i) => i.href === href)?.group ?? null;
}

const VALID_GROUP_IDS = new Set<string>(ADMIN_NAV_GROUPS.map((g) => g.id));

/** Relit les rubriques ouvertes mémorisées ; toute valeur invalide est ignorée. */
export function parseOpenGroups(raw: string | null | undefined): AdminNavGroupId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g): g is AdminNavGroupId => typeof g === "string" && VALID_GROUP_IDS.has(g));
  } catch {
    return [];
  }
}

/** Ajoute la rubrique active aux rubriques ouvertes, sans jamais en fermer une autre. */
export function withActiveGroupOpen(open: ReadonlySet<AdminNavGroupId>, active: AdminNavGroupId | null): Set<AdminNavGroupId> {
  const next = new Set(open);
  if (active) next.add(active);
  return next;
}
