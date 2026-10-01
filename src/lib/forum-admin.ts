// Forum — helpers des routes admin (/api/admin/forum/*), côté serveur uniquement.

import { NextResponse } from "next/server";
import { isForumMissing } from "@/lib/forum-shared";

export const FORUM_MIGRATION_MISSING =
  "Le forum n'est pas encore installé : exécutez supabase/migrations/20261001_forum.sql dans Supabase (SQL Editor).";

/** Réponse d'erreur : 409 explicite si les tables du forum n'existent pas. */
export function forumError(error: { code?: string; message?: string }) {
  if (isForumMissing(error)) return NextResponse.json({ error: FORUM_MIGRATION_MISSING }, { status: 409 });
  return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
}

/** Côté admin, l'auteur porte aussi son nom réel et son email. */
export const ADMIN_AUTHOR_COLUMNS = "id, pseudo, name, email, avatar_url, status";

/** Durées de mise en sourdine proposées dans l'admin. */
export const MUTE_DURATIONS: Record<string, number | null> = {
  "24h": 24 * 3600 * 1000,
  "7d": 7 * 24 * 3600 * 1000,
  "30d": 30 * 24 * 3600 * 1000,
  forever: null,
};
