// Forum — helpers des routes admin (/api/admin/forum/*), côté serveur uniquement.

import { NextResponse } from "next/server";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isForumMissing } from "@/lib/forum-shared";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export const FORUM_MIGRATION_MISSING =
  "Le forum n'est pas encore installé : exécutez supabase/migrations/20261001_forum.sql dans Supabase (SQL Editor).";

/** Réponse d'erreur : 409 explicite si les tables du forum n'existent pas. */
export function forumError(error: { code?: string; message?: string }) {
  if (isForumMissing(error)) return NextResponse.json({ error: FORUM_MIGRATION_MISSING }, { status: 409 });
  return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
}

export const ADMIN_AUTHOR = "author:profiles!%s_author_id_fkey(id, pseudo, name, email, avatar_url, status)";

/** Signalements non traités, regroupés par sujet et par réponse. */
export async function openReportCounts(db: SupabaseAdmin, topicIds?: string[]) {
  let q = db.from("forum_reports").select("topic_id, reply_id").eq("resolved", false);
  if (topicIds) q = q.in("topic_id", topicIds.length ? topicIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data, error } = await q;
  const byTopic: Record<string, number> = {};
  const byReply: Record<string, number> = {};
  for (const r of data || []) {
    byTopic[r.topic_id] = (byTopic[r.topic_id] || 0) + 1;
    if (r.reply_id) byReply[r.reply_id] = (byReply[r.reply_id] || 0) + 1;
  }
  return { byTopic, byReply, error };
}
