/**
 * Navigation de l'administration : données pures (aucune dépendance React),
 * pour que l'organisation et l'état actif se vérifient par des tests.
 *
 * Les icônes sont associées par `id` dans `components/admin/sidebar.tsx`.
 * Réorganiser ce fichier ne change aucune route ni aucune permission : l'accès
 * reste imposé par le middleware (`/admin/*`) et par `requireAdmin` côté API.
 */

export type AdminNavGroupId =
  | "overview" | "members" | "coaches" | "matching" | "moderation"
  | "events" | "content" | "finance" | "analytics" | "config";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  group: AdminNavGroupId;
}

export const ADMIN_NAV_GROUPS: ReadonlyArray<{ id: AdminNavGroupId; label: string }> = [
  { id: "overview", label: "Vue générale" },
  { id: "members", label: "Gestion des membres" },
  { id: "coaches", label: "Gestion des Coachs" },
  { id: "matching", label: "Matching et alliances" },
  { id: "moderation", label: "Communication et modération" },
  { id: "events", label: "Événements et rendez-vous" },
  { id: "content", label: "Contenus et formation" },
  { id: "finance", label: "Finance et abonnements" },
  { id: "analytics", label: "Analyses et statistiques" },
  { id: "config", label: "Configuration" },
];

export const ADMIN_NAV_ITEMS: ReadonlyArray<AdminNavItem> = [
  { id: "dashboard", label: "Tableau de bord", href: "/admin/dashboard", group: "overview" },

  { id: "users", label: "Utilisateurs", href: "/admin/users", group: "members" },
  { id: "photos", label: "Import de fichiers", href: "/admin/photos", group: "members" },
  { id: "password-resets", label: "Demandes de réinitialisation", href: "/admin/password-resets", group: "members" },
  { id: "accessibility", label: "Accessibilité", href: "/admin/accessibilite", group: "members" },

  { id: "coaches", label: "Coachs", href: "/admin/users/coaches", group: "coaches" },
  { id: "coach-assignments", label: "Affectation aux coachs", href: "/admin/users/coach-assignments", group: "coaches" },

  { id: "matching", label: "Matching", href: "/admin/matching", group: "matching" },

  { id: "chat-monitoring", label: "Surveillance de la discussion", href: "/admin/chat-monitoring", group: "moderation" },
  { id: "messages", label: "Messagerie", href: "/admin/messages", group: "moderation" },
  { id: "forum", label: "Forum", href: "/admin/forum", group: "moderation" },
  { id: "reports", label: "Rapports", href: "/admin/reports", group: "moderation" },
  { id: "testimonials", label: "Témoignages", href: "/admin/testimonials", group: "moderation" },

  { id: "events", label: "Événements", href: "/admin/events", group: "events" },
  { id: "meets", label: "Visioconférences", href: "/admin/meets", group: "events" },
  { id: "meetings", label: "Rendez-vous", href: "/admin/meetings", group: "events" },

  { id: "mediatheque", label: "Médiathèque", href: "/admin/mediatheque", group: "content" },
  { id: "blog", label: "Blog", href: "/admin/blog", group: "content" },
  { id: "announcements", label: "Annonces", href: "/admin/announcements", group: "content" },

  { id: "payments", label: "Paiements", href: "/admin/payments", group: "finance" },
  { id: "referrals", label: "Parrainages et récompenses", href: "/admin/referrals", group: "finance" },

  { id: "analytics", label: "Analytics", href: "/admin/analytics", group: "analytics" },
  { id: "analytics-lessons", label: "Analyse des leçons", href: "/admin/analytics/lessons", group: "analytics" },

  { id: "settings", label: "Paramètres", href: "/admin/settings", group: "config" },
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
