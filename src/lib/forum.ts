"use client";

// Forum (groupe de discussion) — accès membre, directement via Supabase.
// La RLS de supabase/migrations/20261001_forum.sql réserve le groupe aux
// membres approuvés, et refuse l'envoi en mode « admins seulement » ou
// quand le membre est en sourdine.

import { supabase } from "@/lib/supabase";
import {
  DEFAULT_FORUM_SETTINGS, FORUM_PAGE_SIZE, forumMessageColumns, isForumMissing,
  type ForumMessage, type ForumSettings,
} from "@/lib/forum-shared";

export * from "@/lib/forum-shared";

/** Erreur renvoyée quand les tables du forum n'existent pas encore. */
export const FORUM_UNAVAILABLE = "forum_unavailable";
/** Envoi refusé : groupe réservé aux admins, ou membre en sourdine. */
export const FORUM_CANNOT_POST = "forum_cannot_post";

const COLUMNS = forumMessageColumns();

type Result<T> = { data?: T; error?: string };

function fail(error: { code?: string; message?: string }): { error: string } {
  if (isForumMissing(error)) return { error: FORUM_UNAVAILABLE };
  if (/row-level|policy|permission/i.test(error.message || "")) return { error: FORUM_CANNOT_POST };
  return { error: error.message || "error" };
}

export async function getMyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getForumSettings(): Promise<Result<ForumSettings>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data, error } = await supabase
    .from("forum_settings").select("name, description, admins_only, pinned_message_id").eq("id", 1).maybeSingle();
  if (error) return fail(error);
  return { data: (data as ForumSettings) ?? DEFAULT_FORUM_SETTINGS };
}

/** Ma mise en sourdine en cours, s'il y en a une (until = null : jusqu'à nouvel ordre). */
export async function getMyMute(myId: string): Promise<{ until: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("forum_mutes").select("until").eq("user_id", myId).maybeSingle();
  if (!data) return null;
  if (data.until && new Date(data.until).getTime() <= Date.now()) return null;
  return { until: data.until };
}

/** Nombre de membres du groupe (= membres approuvés de la plateforme). */
export async function getMemberCount(): Promise<number | null> {
  if (!supabase) return null;
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved");
  return count ?? null;
}

/** Derniers messages (du plus ancien au plus récent), ou ceux d'avant `before`. */
export async function listMessages(before?: string): Promise<Result<{ messages: ForumMessage[]; hasMore: boolean }>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  let q = supabase.from("forum_messages").select(COLUMNS)
    .order("created_at", { ascending: false }).limit(FORUM_PAGE_SIZE + 1);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return fail(error);
  const rows = (data || []) as unknown as ForumMessage[];
  return { data: { messages: rows.slice(0, FORUM_PAGE_SIZE).reverse(), hasMore: rows.length > FORUM_PAGE_SIZE } };
}

export async function getMessage(id: string): Promise<ForumMessage | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("forum_messages").select(COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as ForumMessage) ?? null;
}

export async function sendForumMessage(input: { body?: string; sticker?: string | null; replyTo?: string | null }): Promise<Result<ForumMessage>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data, error } = await supabase
    .from("forum_messages")
    .insert({ body: (input.body || "").trim(), sticker: input.sticker || null, reply_to_id: input.replyTo || null })
    .select(COLUMNS)
    .single();
  if (error) return fail(error);
  return { data: data as unknown as ForumMessage };
}

export async function deleteForumMessage(id: string): Promise<Result<true>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { error } = await supabase.from("forum_messages").delete().eq("id", id);
  return error ? fail(error) : { data: true };
}

/** « already » : ce membre a déjà signalé ce message. */
export async function reportForumMessage(messageId: string, reason: string): Promise<Result<"ok" | "already">> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { error } = await supabase.from("forum_reports").insert({ message_id: messageId, reason: reason.trim() || null });
  if (error?.code === "23505") return { data: "already" };
  return error ? fail(error) : { data: "ok" };
}

/**
 * Temps réel : nouveaux messages, suppressions, changement des réglages
 * (mode admins seulement, message épinglé…). Renvoie la fonction de désabonnement.
 */
export function subscribeForum(handlers: {
  onInsert: (id: string) => void;
  onDelete: (id: string) => void;
  onSettings: () => void;
}): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel("forum-group")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_messages" }, (p) => handlers.onInsert((p.new as { id: string }).id))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "forum_messages" }, (p) => handlers.onDelete((p.old as { id: string }).id))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "forum_settings" }, () => handlers.onSettings())
    .subscribe();
  return () => { client.removeChannel(channel); };
}
