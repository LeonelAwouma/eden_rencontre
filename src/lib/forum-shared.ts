// Forum de l'Académie du mariage — définitions communes à l'espace membre
// (/dashboard/forum) et à l'admin (/admin/forum). Aucune dépendance au client
// Supabase : importable côté serveur comme côté navigateur.

import {
  Mountain, BookOpen, Church, MessageSquare, Wallet, Users, Flame, Briefcase, Heart, Baby, Clock,
  Sprout, HeartHandshake, MessagesSquare, type LucideIcon,
} from "lucide-react";

/**
 * Thématiques du forum : la formation « Bâtir sur le roc », les histoires,
 * puis les thèmes de l'Académie (mêmes slugs que academie.themes.* dans les
 * fichiers de langue), et un espace général.
 * `labelKey` : clé i18n du libellé.
 */
export const FORUM_CATEGORIES: { key: string; icon: LucideIcon; labelKey: string }[] = [
  { key: "batir-sur-le-roc", icon: Mountain, labelKey: "forum.categories.batirSurLeRoc" },
  { key: "histoires", icon: BookOpen, labelKey: "forum.categories.histoires" },
  { key: "vision-biblique", icon: Church, labelKey: "academie.themes.vision-biblique.title" },
  { key: "communication", icon: MessageSquare, labelKey: "academie.themes.communication.title" },
  { key: "finances", icon: Wallet, labelKey: "academie.themes.finances.title" },
  { key: "belle-famille", icon: Users, labelKey: "academie.themes.belle-famille.title" },
  { key: "intimite", icon: Flame, labelKey: "academie.themes.intimite.title" },
  { key: "roles", icon: Briefcase, labelKey: "academie.themes.roles.title" },
  { key: "vie-spirituelle", icon: Heart, labelKey: "academie.themes.vie-spirituelle.title" },
  { key: "enfants", icon: Baby, labelKey: "academie.themes.enfants.title" },
  { key: "temps-loisirs", icon: Clock, labelKey: "academie.themes.temps-loisirs.title" },
  { key: "celibat-foi", icon: Sprout, labelKey: "academie.themes.celibat-foi.title" },
  { key: "conflits-bibliques", icon: HeartHandshake, labelKey: "academie.themes.conflits-bibliques.title" },
  { key: "general", icon: MessagesSquare, labelKey: "forum.categories.general" },
];

export const FORUM_CATEGORY_KEYS = new Set(FORUM_CATEGORIES.map((c) => c.key));

export function forumCategory(key: string | null | undefined) {
  return FORUM_CATEGORIES.find((c) => c.key === key) ?? FORUM_CATEGORIES[FORUM_CATEGORIES.length - 1];
}

/** Limites, identiques aux contraintes SQL (20261001_forum.sql). */
export const FORUM_LIMITS = { titleMin: 3, titleMax: 160, bodyMax: 8000, replyMax: 5000, reportMax: 500 };

export type ForumStatus = "visible" | "hidden";

export interface ForumAuthor {
  id: string;
  pseudo: string | null;
  avatar_url: string | null;
}

export interface ForumTopic {
  id: string;
  author_id: string;
  category: string;
  lesson_slug: string | null;
  title: string;
  body: string;
  status: ForumStatus;
  is_pinned: boolean;
  is_locked: boolean;
  is_staff: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string | null;
  author: ForumAuthor | null;
}

export interface ForumReply {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  status: ForumStatus;
  is_staff: boolean;
  created_at: string;
  updated_at: string | null;
  author: ForumAuthor | null;
}

/** Table absente (migration non exécutée) : le forum n'est pas encore disponible. */
export function isForumMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" ||
    /relation .*forum_.* does not exist|could not find the table/i.test(error.message || "");
}

/** « il y a 3 h », « 2 days ago »… */
export function forumRelativeTime(iso: string, locale: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}
