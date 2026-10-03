"use client";

import { supabase } from "./supabase";
import { ADMIN_SYSTEM_EMAIL } from "./admin-system-shared";
import type { EdenUser } from "./auth";
import { normalizeGender } from "./verses";

export interface ChatConversation {
  id: string;          // conversation uuid
  otherId: string;
  name: string;
  avatar?: string | null;
  last: string;
  when: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  imageUrl?: string | null;
}

export interface DirectoryUser {
  id: string;
  name: string;
  pseudo?: string | null;
  email: string;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

// Fiche complète d'un membre (consultée depuis /dashboard/profile/[id])
export interface MemberProfile {
  id: string;
  name: string;
  pseudo?: string | null;
  email: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  civilStatus?: string | null;
  profession?: string | null;
  bio?: string | null;
  marriageVision?: string[] | null;
  avatar_url?: string | null;
  verification_status?: string | null;
  questionnaire?: Record<string, any> | null;
}

// ── Fluent Emoji (Microsoft, MIT) — rendu 3D via CDN jsDelivr ──
const FLUENT_BASE = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets";

function emojiSnake(name: string) {
  // Fluent : espaces → "_", mais les traits d'union sont conservés (ex. heart-eyes)
  return name.toLowerCase().replace(/\s+/g, "_");
}

function fluentUrl(name: string, tone = false) {
  const s = emojiSnake(name);
  const folder = encodeURIComponent(name);
  return tone
    ? `${FLUENT_BASE}/${folder}/Default/3D/${s}_3d_default.png`
    : `${FLUENT_BASE}/${folder}/3D/${s}_3d.png`;
}

export interface PickerEmoji {
  char: string;
  url: string;
  category: string;
}

// [char, nom CLDR (= dossier Fluent), catégorie, a des teintes de peau ?]
const EMOJI_DEFS: [string, string, string, boolean?][] = [
  // ── Smileys ──
  ["😀", "Grinning face", "Smileys"],
  ["😁", "Beaming face with smiling eyes", "Smileys"],
  ["😂", "Face with tears of joy", "Smileys"],
  ["🤣", "Rolling on the floor laughing", "Smileys"],
  ["😊", "Smiling face with smiling eyes", "Smileys"],
  ["😇", "Smiling face with halo", "Smileys"],
  ["🙂", "Slightly smiling face", "Smileys"],
  ["😉", "Winking face", "Smileys"],
  ["😍", "Smiling face with heart-eyes", "Smileys"],
  ["🥰", "Smiling face with hearts", "Smileys"],
  ["😘", "Face blowing a kiss", "Smileys"],
  ["😋", "Face savoring food", "Smileys"],
  ["😎", "Smiling face with sunglasses", "Smileys"],
  ["🤔", "Thinking face", "Smileys"],
  ["😅", "Grinning face with sweat", "Smileys"],
  ["😆", "Grinning squinting face", "Smileys"],
  ["😜", "Winking face with tongue", "Smileys"],
  ["😴", "Sleeping face", "Smileys"],
  ["😢", "Crying face", "Smileys"],
  ["😭", "Loudly crying face", "Smileys"],
  ["🥺", "Pleading face", "Smileys"],
  ["😳", "Flushed face", "Smileys"],
  ["😬", "Grimacing face", "Smileys"],
  ["🙄", "Face with rolling eyes", "Smileys"],

  // ── Gestes ──
  ["👍", "Thumbs up", "Gestes", true],
  ["👎", "Thumbs down", "Gestes", true],
  ["👏", "Clapping hands", "Gestes", true],
  ["🙌", "Raising hands", "Gestes", true],
  ["🙏", "Folded hands", "Gestes", true],
  ["👋", "Waving hand", "Gestes", true],
  ["✌️", "Victory hand", "Gestes", true],
  ["🤝", "Handshake", "Gestes", true],
  ["💪", "Flexed biceps", "Gestes", true],
  ["🤲", "Palms up together", "Gestes", true],

  // ── Amour ──
  ["❤️", "Red heart", "Amour"],
  ["🧡", "Orange heart", "Amour"],
  ["💛", "Yellow heart", "Amour"],
  ["💚", "Green heart", "Amour"],
  ["💙", "Blue heart", "Amour"],
  ["💜", "Purple heart", "Amour"],
  ["🤎", "Brown heart", "Amour"],
  ["🖤", "Black heart", "Amour"],
  ["🤍", "White heart", "Amour"],
  ["💕", "Two hearts", "Amour"],
  ["💖", "Sparkling heart", "Amour"],
  ["💗", "Growing heart", "Amour"],
  ["💓", "Beating heart", "Amour"],
  ["💞", "Revolving hearts", "Amour"],
  ["💘", "Heart with arrow", "Amour"],
  ["💝", "Heart with ribbon", "Amour"],
  ["💍", "Ring", "Amour"],

  // ── Foi ──
  ["⛪", "Church", "Foi"],
  ["✝️", "Latin cross", "Foi"],
  ["📖", "Open book", "Foi"],
  ["🕊️", "Dove", "Foi"],
  ["🕯️", "Candle", "Foi"],
  ["✨", "Sparkles", "Foi"],
  ["🌟", "Glowing star", "Foi"],

  // ── Nature ──
  ["🌹", "Rose", "Nature"],
  ["🌸", "Cherry blossom", "Nature"],
  ["💐", "Bouquet", "Nature"],
  ["🌻", "Sunflower", "Nature"],
  ["🌷", "Tulip", "Nature"],
  ["☀️", "Sun", "Nature"],
  ["🌙", "Crescent moon", "Nature"],
  ["⭐", "Star", "Nature"],
  ["🌈", "Rainbow", "Nature"],
  ["🍀", "Four leaf clover", "Nature"],

  // ── Célébration ──
  ["🎉", "Party popper", "Célébration"],
  ["🎊", "Confetti ball", "Célébration"],
  ["🥳", "Partying face", "Célébration"],
  ["🎂", "Birthday cake", "Célébration"],
  ["☕", "Hot beverage", "Célébration"],
  ["🍷", "Wine glass", "Célébration"],
  ["🍰", "Shortcake", "Célébration"],
  ["🔥", "Fire", "Célébration"],
  ["💯", "Hundred points", "Célébration"],
  ["✅", "Check mark button", "Célébration"],
];

export const CHAT_EMOJIS: PickerEmoji[] = EMOJI_DEFS.map(([char, name, category, tone]) => ({
  char,
  url: fluentUrl(name, tone),
  category,
}));

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const isBlank = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Complète le profil de l'utilisateur connecté (annuaire) à partir de sa session.
 *
 * La table profiles est la source de vérité (inscription, « Mon profil », admin) :
 * la session ne fait que combler un champ encore VIDE, jamais en écraser un.
 * Avant, chaque ouverture du tableau de bord recopiait la session telle quelle :
 * un genre, un pays ou une ville absents de la session effaçaient ceux du profil
 * (et renvoyaient le membre vers le formulaire d'inscription), et pour un compte
 * Google la photo Google, remise dans la session à chaque connexion, remplaçait
 * l'avatar choisi.
 */
export async function upsertMyProfile(user: EdenUser): Promise<{ error?: string }> {
  if (!supabase || !user.id) return {};
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(user.birthDate || "") ? user.birthDate : null;
  const avatar = user.avatar_url && !user.avatar_url.startsWith("data:") ? user.avatar_url : null;
  const fromSession: Record<string, unknown> = {
    name: user.name,
    pseudo: user.pseudo,
    city: user.city,
    country: user.country,
    region: user.region,
    gender: normalizeGender(user.gender) || null,
    birth_date: birthDate,
    civil_status: user.civilStatus,
    profession: user.profession,
    bio: user.bio,
    marriage_vision: Array.isArray(user.marriageVision) ? user.marriageVision : null,
    avatar_url: avatar,
  };

  const { data: row, error: readError } = await supabase
    .from("profiles").select(Object.keys(fromSession).join(", ")).eq("id", user.id).maybeSingle();
  if (readError) {
    console.error("[Eden] lecture du profil échouée:", readError.message);
    return { error: readError.message };
  }

  const current = (row || {}) as unknown as Record<string, unknown>;
  const patch = Object.fromEntries(
    Object.entries(fromSession).filter(([k, v]) => !isBlank(v) && isBlank(current[k]))
  );

  // Profil absent (déclencheur d'inscription manquant) : on le crée.
  const { error } = row
    ? Object.keys(patch).length
      ? await supabase.from("profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", user.id)
      : { error: null }
    : await supabase.from("profiles").insert({ id: user.id, email: user.email, ...patch });
  if (error) {
    console.error("[Eden] complément du profil échoué:", error.message);
    return { error: error.message };
  }
  return {};
}

// Récupère la fiche complète d'un membre par son id.
export async function getProfileById(id: string): Promise<{ profile?: MemberProfile; error?: string }> {
  if (!supabase) return { error: "Supabase non configuré." };
  if (!id) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, pseudo, email, city, country, region, gender, birth_date, civil_status, profession, bio, marriage_vision, avatar_url, verification_status")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[Eden] chargement profil échoué:", error.message);
    return { error: error.message };
  }
  if (!data) return {};
  const d = data as any;
  return {
    profile: {
      id: d.id,
      name: d.pseudo || d.name,
      email: d.email,
      city: d.city,
      country: d.country,
      region: d.region,
      gender: d.gender,
      birthDate: d.birth_date,
      civilStatus: d.civil_status,
      profession: d.profession,
      bio: d.bio,
      marriageVision: d.marriage_vision,
      avatar_url: d.avatar_url,
      verification_status: d.verification_status,
    },
  };
}

// Recherche d'utilisateurs réels (par nom ou email), hors soi-même.
export async function searchUsers(
  query: string,
  myId: string
): Promise<{ users: DirectoryUser[]; error?: string }> {
  if (!supabase) return { users: [] };
  const q = query.trim();
  if (q.length < 2) return { users: [] };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, pseudo, email, city, country, avatar_url")
    .or(`name.ilike.*${q}*,pseudo.ilike.*${q}*,email.ilike.*${q}*`)
    .neq("email", ADMIN_SYSTEM_EMAIL) // l'admin se contacte via l'entrée « Admin » dédiée
    .limit(20);
  if (error) {
    console.error("[Eden] recherche membres échouée:", error.message);
    return { users: [], error: error.message };
  }
  // On s'exclut soi-même côté client (évite tout souci si myId est vide), et on
  // affiche le pseudo à la place du vrai nom (repli sur le nom si pas encore défini).
  const users = ((data as any[]) || [])
    .filter((u) => u.id !== myId)
    .map((u) => ({ ...u, name: u.pseudo || u.name }));
  return { users };
}

// Liste les conversations de l'utilisateur avec dernier message + non-lus.
export async function listConversations(myId: string): Promise<ChatConversation[]> {
  if (!supabase || !myId) return [];

  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", myId);
  if (!mine || mine.length === 0) return [];

  const convIds = mine.map((m: any) => m.conversation_id);
  const lastRead: Record<string, string> = {};
  mine.forEach((m: any) => (lastRead[m.conversation_id] = m.last_read_at || ""));

  // Autres participants
  const { data: others } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .neq("user_id", myId);
  const otherByConv: Record<string, string> = {};
  (others || []).forEach((o: any) => (otherByConv[o.conversation_id] = o.user_id));

  const otherIds = Array.from(new Set(Object.values(otherByConv)));
  const profById: Record<string, DirectoryUser> = {};
  if (otherIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, pseudo, email, city, country, avatar_url")
      .in("id", otherIds);
    (profs || []).forEach((p: any) => (profById[p.id] = p));
  }

  // Messages de toutes les conversations
  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, content, image_url, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: true });

  const convs: ChatConversation[] = convIds.map((cid: string) => {
    const rows = (msgs || []).filter((m: any) => m.conversation_id === cid);
    const lastRow = rows[rows.length - 1];
    const lr = lastRead[cid];
    const unread = rows.filter((m: any) => m.sender_id !== myId && (!lr || m.created_at > lr)).length;
    const otherId = otherByConv[cid] || "";
    const prof = profById[otherId];
    const preview = lastRow ? (lastRow.content || (lastRow.image_url ? "📷 Photo" : "")) : "New conversation";
    return {
      id: cid,
      otherId,
      name: prof?.pseudo || prof?.name || prof?.email || "Member",
      avatar: prof?.avatar_url || null,
      last: preview,
      when: lastRow ? fmt(lastRow.created_at) : "",
      unread,
    };
  });

  // Trier : non-lus puis récence (présence d'un dernier message)
  convs.sort((a, b) => b.unread - a.unread);
  return convs;
}

export async function getMessages(convId: string, myId: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, content, image_url, created_at")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  return (data || []).map((m: any) => ({
    id: m.id,
    from: m.sender_id === myId ? "me" : "them",
    text: m.content,
    time: fmt(m.created_at),
    imageUrl: m.image_url,
  }));
}

/** Erreur renvoyée par sendChatMessage quand l'admin a restreint ou bloqué la conversation. */
export const CONVERSATION_CLOSED = "conversation_closed";

/**
 * Envoi d'un message : passe par /api/chat/send, qui applique la modération
 * côté serveur et insère le message (l'insertion directe depuis le navigateur
 * est refusée par la RLS). `senderId` et `receiverId` ne sont plus utilisés :
 * l'expéditeur est toujours celui de la session.
 */
export async function sendChatMessage(
  convId: string,
  content: string,
  imageUrl?: string | null,
  _senderId?: string,
  _receiverId?: string
): Promise<{ message?: ChatMessage; error?: string; moderationError?: string }> {
  if (!supabase) return { error: "Supabase non configuré." };
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return { error: "Session expirée. Veuillez vous reconnecter." };

  try {
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversationId: convId, content: content.trim(), imageUrl: imageUrl ?? null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.message) {
      // conversation_closed / not_friends : gérés par l'interface (toast dédié).
      return { error: data.error || "Message non envoyé. Réessayez.", moderationError: data.moderationError };
    }
    const m = data.message;
    return {
      message: { id: m.id, from: "me", text: m.content, time: fmt(m.created_at), imageUrl: m.image_url },
    };
  } catch (err) {
    console.error("[Eden] envoi message échoué:", err);
    return { error: "Connexion impossible. Réessayez." };
  }
}

// Upload d'une photo dans le bucket public "chat-images" → renvoie l'URL publique.
export async function uploadChatImage(file: File, convId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: "Supabase non configuré." };
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${convId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("chat-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error("[Eden] upload photo échoué:", error.message);
    return { error: error.message };
  }
  const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function markConversationRead(convId: string, myId: string) {
  if (!supabase) return;
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", convId)
    .eq("user_id", myId);
}

/**
 * Réduit une photo avant envoi : 1080 px de côté au plus, en WebP. Une photo de
 * téléphone de plusieurs Mo passe à ~100–200 Ko et s'affiche bien plus vite
 * partout où apparaît l'avatar. Si le navigateur ne sait pas la décoder (HEIC…)
 * ou si le résultat n'est pas plus léger, l'original est envoyé tel quel.
 */
async function shrinkImage(file: File, maxSide = 1080, quality = 0.85): Promise<File> {
  try {
    if (typeof createImageBitmap !== "function" || file.type === "image/gif" || file.type === "image/svg+xml") return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

// Upload de la photo de profil (bucket public "chat-images", dossier avatars/).
export async function uploadAvatar(original: File, userId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: "Supabase non configuré." };
  const file = await shrinkImage(original);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `avatars/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("chat-images").upload(path, file, {
    // Nom unique par envoi : le fichier ne change jamais, il peut rester un an en cache.
    cacheControl: "31536000",
    // Nom de fichier unique (horodaté) : pas besoin d'écraser. `upsert: true`
    // exige en plus un droit UPDATE sur storage.objects, absent pour ce bucket,
    // et faisait échouer tout changement de photo (« row-level security »).
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error("[Eden] upload avatar échoué:", error.message);
    return { error: error.message };
  }
  const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function startConversation(otherId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { other_id: otherId });
  if (error) return null;
  return data as string;
}

// ── CONTACTER L'ADMINISTRATION ────────────────────────────
// Starting a conversation (and sending into it) requires being "friends" —
// see are_friends()/messages_insert in supabase/schema.sql. Un membre ne peut
// pas créer lui-même une alliance déjà acceptée (RLS) : c'est le serveur qui
// ouvre la conversation avec l'Admin, alliance comprise, et renvoie son id.
export async function contactAdmin(): Promise<string | null> {
  if (!supabase) return null;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return null;

  try {
    const res = await fetch("/api/support/admin-id", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { conversationId } = await res.json();
    return conversationId || null;
  } catch {
    return null;
  }
}
