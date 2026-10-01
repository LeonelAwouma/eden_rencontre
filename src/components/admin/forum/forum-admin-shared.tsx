"use client";

import fr from "@/locales/fr.json";
import type { ForumMessage } from "@/lib/forum-shared";

/** Libellé français d'une clé i18n (l'admin est en français). */
export function frLabel(key: string): string {
  let cur: unknown = fr;
  for (const part of key.split(".")) {
    if (typeof cur !== "object" || cur === null) return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

export const stickerLabelFr = (id: string) => frLabel(`forum.stickers.${id}`);

export interface AdminForumAuthor {
  id: string; pseudo: string | null; name: string | null; email: string | null; avatar_url: string | null; status: string | null;
}

export type AdminForumMessage = Omit<ForumMessage, "author"> & { author: AdminForumAuthor | null; open_reports: number };

/** Pseudo public (ce que voient les membres), suivi du nom réel pour l'admin. */
export function adminAuthorName(m: { is_staff: boolean; author: { pseudo: string | null; name?: string | null } | null }): string {
  if (m.is_staff) return "Équipe Garden of Alliance";
  const pseudo = m.author?.pseudo || "Membre";
  return m.author?.name ? `${pseudo} · ${m.author.name}` : pseudo;
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
