"use client";

// Forum — accès membre, directement via Supabase (la RLS de
// supabase/migrations/20261001_forum.sql réserve le forum aux membres
// approuvés et fixe ce que chacun peut écrire).

import { supabase } from "@/lib/supabase";
import {
  FORUM_CATEGORY_KEYS, isForumMissing, type ForumReply, type ForumTopic,
} from "@/lib/forum-shared";

export * from "@/lib/forum-shared";

const AUTHOR = "author:profiles!%s_author_id_fkey(id, pseudo, avatar_url)";
const TOPIC_COLUMNS =
  "id, author_id, category, lesson_slug, title, body, status, is_pinned, is_locked, is_staff, reply_count, last_activity_at, created_at, updated_at, " +
  AUTHOR.replace("%s", "forum_topics");
const REPLY_COLUMNS =
  "id, topic_id, author_id, body, status, is_staff, created_at, updated_at, " + AUTHOR.replace("%s", "forum_replies");

/** Erreur renvoyée quand les tables du forum n'existent pas encore. */
export const FORUM_UNAVAILABLE = "forum_unavailable";

type Result<T> = { data?: T; error?: string };

function fail(error: { code?: string; message?: string }): { error: string } {
  return { error: isForumMissing(error) ? FORUM_UNAVAILABLE : error.message || "error" };
}

export async function getMyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listTopics(opts: {
  category?: string | null;
  lesson?: string | null;
  search?: string;
  offset?: number;
  limit?: number;
}): Promise<Result<{ topics: ForumTopic[]; hasMore: boolean }>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  let q = supabase
    .from("forum_topics")
    .select(TOPIC_COLUMNS)
    .eq("status", "visible")
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .range(offset, offset + limit); // un de plus pour savoir s'il en reste
  if (opts.category && FORUM_CATEGORY_KEYS.has(opts.category)) q = q.eq("category", opts.category);
  if (opts.lesson) q = q.eq("lesson_slug", opts.lesson);
  // Caractères réservés de la syntaxe de filtre PostgREST retirés de la recherche.
  const term = (opts.search || "").replace(/[,()%*\\]/g, " ").trim();
  if (term) q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) return fail(error);
  const rows = (data || []) as unknown as ForumTopic[];
  return { data: { topics: rows.slice(0, limit), hasMore: rows.length > limit } };
}

export async function getTopic(id: string): Promise<Result<ForumTopic | null>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data, error } = await supabase.from("forum_topics").select(TOPIC_COLUMNS).eq("id", id).maybeSingle();
  if (error) return fail(error);
  return { data: (data as unknown as ForumTopic) ?? null };
}

export async function listReplies(topicId: string): Promise<Result<ForumReply[]>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data, error } = await supabase
    .from("forum_replies").select(REPLY_COLUMNS).eq("topic_id", topicId).order("created_at", { ascending: true });
  if (error) return fail(error);
  return { data: (data || []) as unknown as ForumReply[] };
}

export async function createTopic(input: {
  category: string; lesson_slug: string | null; title: string; body: string;
}): Promise<Result<string>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data, error } = await supabase
    .from("forum_topics")
    .insert({
      category: FORUM_CATEGORY_KEYS.has(input.category) ? input.category : "general",
      lesson_slug: input.lesson_slug || null,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select("id")
    .single();
  if (error) return fail(error);
  return { data: data.id as string };
}

export async function createReply(topicId: string, body: string): Promise<Result<ForumReply>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data, error } = await supabase
    .from("forum_replies").insert({ topic_id: topicId, body: body.trim() }).select(REPLY_COLUMNS).single();
  if (error) return fail(error);
  return { data: data as unknown as ForumReply };
}

export async function deleteTopic(id: string): Promise<Result<true>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { error } = await supabase.from("forum_topics").delete().eq("id", id);
  return error ? fail(error) : { data: true };
}

export async function deleteReply(id: string): Promise<Result<true>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { error } = await supabase.from("forum_replies").delete().eq("id", id);
  return error ? fail(error) : { data: true };
}

/** Signaler un sujet (replyId absent) ou une réponse. « already » : déjà signalé par ce membre. */
export async function reportPost(topicId: string, replyId: string | null, reason: string): Promise<Result<"ok" | "already">> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { error } = await supabase
    .from("forum_reports").insert({ topic_id: topicId, reply_id: replyId, reason: reason.trim() || null });
  if (error?.code === "23505") return { data: "already" };
  return error ? fail(error) : { data: "ok" };
}
