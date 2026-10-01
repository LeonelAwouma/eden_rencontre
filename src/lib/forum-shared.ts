// Forum de l'Académie — un groupe de discussion unique (façon groupe WhatsApp).
// Définitions communes à l'espace membre (/dashboard/forum) et à l'admin
// (/admin/forum). Aucune dépendance au client Supabase : importable côté
// serveur comme côté navigateur.

/* ─────────────────────────────── Stickers ─────────────────────────────── */

const FLUENT_BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets";

function fluentStickerUrl(name: string, tone = false) {
  const snake = name.toLowerCase().replace(/\s+/g, "_");
  const folder = encodeURIComponent(name);
  return tone
    ? `${FLUENT_BASE}/${folder}/Default/3D/${snake}_3d_default.png`
    : `${FLUENT_BASE}/${folder}/3D/${snake}_3d.png`;
}

/**
 * Stickers du groupe : un grand emoji 3D (Fluent, comme dans la messagerie)
 * et une légende traduite (forum.stickers.<id>). Seul l'identifiant est
 * stocké : chacun lit la légende dans sa langue.
 * Ajouter un sticker = une ligne ici + la légende en FR et en EN.
 */
export const FORUM_STICKERS: { id: string; char: string; url: string }[] = (
  [
    ["bonjour", "☀️", "Sun"],
    ["bienvenue", "💐", "Bouquet"],
    ["amen", "🙏", "Folded hands", true],
    ["alleluia", "🙌", "Raising hands", true],
    ["gloire", "✨", "Sparkles"],
    ["je-prie", "🕯️", "Candle"],
    ["parole", "📖", "Open book"],
    ["merci", "🌹", "Rose"],
    ["avec-amour", "💚", "Green heart"],
    ["bravo", "👏", "Clapping hands", true],
    ["courage", "💪", "Flexed biceps", true],
    ["fete", "🎉", "Party popper"],
    ["alliance", "💍", "Ring"],
    ["rire", "😂", "Face with tears of joy"],
    ["touche", "🥺", "Pleading face"],
    ["bonne-nuit", "🌙", "Crescent moon"],
  ] as [string, string, string, boolean?][]
).map(([id, char, name, tone]) => ({ id, char, url: fluentStickerUrl(name, tone) }));

export const findSticker = (id: string | null | undefined) => FORUM_STICKERS.find((s) => s.id === id) ?? null;

/* ─────────────────────────────── Données ─────────────────────────────── */

/** Limites, identiques aux contraintes SQL (20261001_forum.sql). */
export const FORUM_LIMITS = { bodyMax: 2000, reportMax: 500 };

/** Un message peut être modifié pendant 5 minutes après son envoi (20261002_forum_edit.sql). */
export const FORUM_EDIT_WINDOW_MS = 5 * 60 * 1000;

/** Texte encore modifiable : message avec du texte, envoyé il y a moins de 5 minutes. */
export function isEditable(m: { body: string; created_at: string }, now = Date.now()): boolean {
  return !!m.body.trim() && now - new Date(m.created_at).getTime() < FORUM_EDIT_WINDOW_MS;
}
export const FORUM_PAGE_SIZE = 50;

export interface ForumAuthor {
  id: string;
  pseudo: string | null;
  avatar_url: string | null;
}

/** Message cité (réponse à un message). */
export interface ForumQuote {
  id: string;
  body: string;
  sticker: string | null;
  is_staff: boolean;
  author: { pseudo: string | null } | null;
}

export interface ForumMessage {
  id: string;
  author_id: string;
  body: string;
  sticker: string | null;
  reply_to_id: string | null;
  is_staff: boolean;
  created_at: string;
  /** Date de la dernière modification du texte (null : jamais modifié). */
  edited_at?: string | null;
  author: ForumAuthor | null;
  reply_to: ForumQuote | null;
}

export interface ForumSettings {
  name: string;
  description: string;
  admins_only: boolean;
  pinned_message_id: string | null;
}

export const DEFAULT_FORUM_SETTINGS: ForumSettings = {
  name: "Forum de l'Académie",
  description: "",
  admins_only: false,
  pinned_message_id: null,
};

/**
 * Colonnes PostgREST d'un message, avec auteur et message cité.
 * `withEdited: false` : base sans la migration 20261002 (colonne edited_at absente).
 */
export function forumMessageColumns(authorColumns = "id, pseudo, avatar_url", withEdited = true) {
  return (
    `id, author_id, body, sticker, reply_to_id, is_staff, created_at, ${withEdited ? "edited_at, " : ""}` +
    `author:profiles!forum_messages_author_id_fkey(${authorColumns}), ` +
    "reply_to:reply_to_id(id, body, sticker, is_staff, author:profiles!forum_messages_author_id_fkey(pseudo))"
  );
}

/** Table absente (migration non exécutée) : le forum n'est pas encore disponible. */
export function isForumMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST200" ||
    /relation .*forum_.* does not exist|could not find the table|could not find a relationship/i.test(error.message || "");
}

/** Colonne absente (migration pas encore exécutée). */
export const isMissingColumn = (error: { code?: string; message?: string } | null | undefined) =>
  !!error && (error.code === "42703" || /column .* does not exist/i.test(error.message || ""));

/** Aperçu court d'un message (citation, message épinglé). */
export function messagePreview(m: { body: string; sticker: string | null }, stickerLabel: string): string {
  if (m.body.trim()) return m.body.trim();
  const s = findSticker(m.sticker);
  return s ? `${s.char} ${stickerLabel}` : "";
}

/** Clé de jour (AAAA-MM-JJ, heure locale) pour les séparateurs « Aujourd'hui », « Hier »… */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(iso: string, locale: string, today: string, yesterday: string): string {
  const key = dayKey(iso);
  const now = new Date();
  if (key === dayKey(now.toISOString())) return today;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (key === dayKey(y.toISOString())) return yesterday;
  return new Date(iso).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
}

export const timeLabel = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
