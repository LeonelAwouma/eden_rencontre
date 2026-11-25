"use client";

// Forum (groupe de discussion) — accès membre, directement via Supabase.
// La RLS de supabase/migrations/20261001_forum.sql réserve le groupe aux
// membres approuvés, et refuse l'envoi en mode « admins seulement » ou
// quand le membre est en sourdine.

import { supabase } from "@/lib/supabase";
import {
  DEFAULT_FORUM_SETTINGS, FORUM_CANNOT_POST, FORUM_PAGE_SIZE, forumMessageColumns, isForumMissing, isMissingColumn,
  type ForumMessage, type ForumSettings,
} from "@/lib/forum-shared";

export * from "@/lib/forum-shared";

/** Erreur renvoyée quand les tables du forum n'existent pas encore. */
export const FORUM_UNAVAILABLE = "forum_unavailable";
// FORUM_CANNOT_POST et FORUM_CONTACT_BLOCKED viennent de forum-shared (partagés avec les routes API).

/** Envoi refusé : le délai de 5 minutes pour modifier un message est dépassé. */
export const FORUM_EDIT_EXPIRED = "forum_edit_expired";

// Colonne edited_at : présente après la migration 20261002_forum_edit.sql.
// Sans elle, on relit les messages sans cette colonne plutôt que de casser le forum.
let withEdited = true;
const columns = () => forumMessageColumns(undefined, withEdited);

/** reason : explication du refus de modération, à montrer au membre. */
type Result<T> = { data?: T; error?: string; reason?: string };

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
  const run = () => {
    let q = supabase!.from("forum_messages").select(columns())
      .order("created_at", { ascending: false }).limit(FORUM_PAGE_SIZE + 1);
    if (before) q = q.lt("created_at", before);
    return q;
  };
  let { data, error } = await run();
  if (error && withEdited && isMissingColumn(error)) { withEdited = false; ({ data, error } = await run()); }
  if (error) return fail(error);
  const rows = (data || []) as unknown as ForumMessage[];
  return { data: { messages: rows.slice(0, FORUM_PAGE_SIZE).reverse(), hasMore: rows.length > FORUM_PAGE_SIZE } };
}

export async function getMessage(id: string): Promise<ForumMessage | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("forum_messages").select(columns()).eq("id", id).maybeSingle();
  return (data as unknown as ForumMessage) ?? null;
}

/**
 * Envoi et modification passent par le serveur (/api/forum/messages), qui applique la
 * modération : aucune coordonnée (téléphone, e-mail, lien…) n'est publiée dans le groupe.
 */
async function forumApi(path: string, method: "POST" | "PATCH", payload: unknown): Promise<Result<ForumMessage>> {
  if (!supabase) return { error: FORUM_UNAVAILABLE };
  const { data: auth } = await supabase.auth.getSession();
  const token = auth.session?.access_token;
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.message) return { error: typeof json.error === "string" ? json.error : "error", reason: json.reason };
    return { data: json.message as ForumMessage };
  } catch {
    return { error: "network" };
  }
}

export async function sendForumMessage(input: { body?: string; sticker?: string | null; replyTo?: string | null }): Promise<Result<ForumMessage>> {
  return forumApi("/api/forum/messages", "POST", {
    body: (input.body || "").trim(), sticker: input.sticker || null, replyTo: input.replyTo || null,
  });
}

/** Modifier le texte de son message (5 minutes après l'envoi au plus, contrôlé par le serveur). */
export async function editForumMessage(id: string, body: string): Promise<Result<ForumMessage>> {
  if (!withEdited) return { error: FORUM_UNAVAILABLE };
  return forumApi(`/api/forum/messages/${encodeURIComponent(id)}`, "PATCH", { body: body.trim() });
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
 * Temps réel : nouveaux messages, modifications, suppressions, changement des réglages
 * (mode admins seulement, message épinglé…). Renvoie la fonction de désabonnement.
 */
export function subscribeForum(handlers: {
  onInsert: (id: string) => void;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
  onSettings: () => void;
}): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel("forum-group")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_messages" }, (p) => handlers.onInsert((p.new as { id: string }).id))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "forum_messages" }, (p) => handlers.onUpdate((p.new as { id: string }).id))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "forum_messages" }, (p) => handlers.onDelete((p.old as { id: string }).id))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "forum_settings" }, () => handlers.onSettings())
    .subscribe();
  return () => { client.removeChannel(channel); };
}
