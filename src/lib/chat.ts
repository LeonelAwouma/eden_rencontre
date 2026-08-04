"use client";

import { supabase } from "./supabase";
import type { EdenUser } from "./auth";

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
  email: string;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

// Fiche complète d'un membre (consultée depuis /dashboard/profile/[id])
export interface MemberProfile {
  id: string;
  name: string;
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
}

// [char, nom CLDR (= dossier Fluent), a des teintes de peau ?]
const EMOJI_DEFS: [string, string, boolean?][] = [
  ["😀", "Grinning face"],
  ["😁", "Beaming face with smiling eyes"],
  ["😊", "Smiling face with smiling eyes"],
  ["🥰", "Smiling face with hearts"],
  ["😍", "Smiling face with heart-eyes"],
  ["😘", "Face blowing a kiss"],
  ["😉", "Winking face"],
  ["🙂", "Slightly smiling face"],
  ["😇", "Smiling face with halo"],
  ["🙏", "Folded hands", true],
  ["❤️", "Red heart"],
  ["💕", "Two hearts"],
  ["💖", "Sparkling heart"],
  ["💍", "Ring"],
  ["💐", "Bouquet"],
  ["🌹", "Rose"],
  ["✨", "Sparkles"],
  ["🕊️", "Dove"],
  ["⛪", "Church"],
  ["😢", "Crying face"],
  ["😅", "Grinning face with sweat"],
  ["😎", "Smiling face with sunglasses"],
  ["🤔", "Thinking face"],
  ["👍", "Thumbs up", true],
  ["👏", "Clapping hands", true],
  ["🙌", "Raising hands", true],
  ["🔥", "Fire"],
  ["🎉", "Party popper"],
  ["☀️", "Sun"],
];

export const CHAT_EMOJIS: PickerEmoji[] = EMOJI_DEFS.map(([char, name, tone]) => ({
  char,
  url: fluentUrl(name, tone),
}));

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Enregistre / met à jour le profil de l'utilisateur connecté (annuaire).
export async function upsertMyProfile(user: EdenUser): Promise<{ error?: string }> {
  if (!supabase || !user.id) return {};
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    name: user.name,
    city: user.city ?? null,
    country: user.country ?? null,
    region: user.region ?? null,
    gender: user.gender ?? null,
    birth_date: user.birthDate || null,
    civil_status: user.civilStatus ?? null,
    profession: user.profession ?? null,
    bio: user.bio ?? null,
    marriage_vision: user.marriageVision ?? null,
    avatar_url: user.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[Eden] upsert profil échoué:", error.message);
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
    .select("id, name, email, city, country, region, gender, birth_date, civil_status, profession, bio, marriage_vision, avatar_url")
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
      name: d.name,
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
    .select("id, name, email, city, country, avatar_url")
    .or(`name.ilike.*${q}*,email.ilike.*${q}*`)
    .limit(20);
  if (error) {
    console.error("[Eden] recherche membres échouée:", error.message);
    return { users: [], error: error.message };
  }
  // On s'exclut soi-même côté client (évite tout souci si myId est vide)
  const users = ((data as DirectoryUser[]) || []).filter((u) => u.id !== myId);
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
      .select("id, name, email, city, country, avatar_url")
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
    const preview = lastRow ? (lastRow.content || (lastRow.image_url ? "📷 Photo" : "")) : "Nouvelle conversation";
    return {
      id: cid,
      otherId,
      name: prof?.name || prof?.email || "Membre",
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

export async function sendChatMessage(
  convId: string,
  content: string,
  imageUrl?: string | null,
  senderId?: string,
  receiverId?: string
): Promise<{ message?: ChatMessage; error?: string; moderationError?: string }> {
  if (!supabase) return { error: "Supabase non configuré." };

  // ── Moderation pipeline (text only, skip for image-only messages) ──
  if (content.trim() && senderId) {
    try {
      const modRes = await fetch("/api/moderation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId,
          receiverId: receiverId || "",
          conversationId: convId,
          content: content.trim(),
        }),
      });
      const mod = await modRes.json();
      if (!mod.allowed) {
        return { error: mod.blockReason || mod.warnings?.[0] || "Message bloqué par le système de modération.", moderationError: mod.warnings?.[0] };
      }
      // If warned (DELIVER=false but allowed=true), pass warning to caller
      if (mod.decision === "WARN" && mod.warnings?.length) {
        // Still send the message, but return the warning
      }
    } catch (modErr) {
      // Moderation service failure — fail open (allow message)
      console.warn("[Eden] moderation check failed, allowing message:", modErr);
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: convId, content, image_url: imageUrl ?? null })
    .select("id, sender_id, content, image_url, created_at")
    .single();
  if (error) {
    // Le refus « amis seulement » est attendu : on le laisse au gestionnaire d'UI (toast),
    // on ne logue bruyamment que les vraies erreurs techniques.
    if (!/row-level|policy/i.test(error.message)) console.error("[Eden] envoi message échoué:", error.message);
    return { error: error.message };
  }
  const m: any = data;
  return {
    message: { id: m.id, from: "me", text: m.content, time: fmt(m.created_at), imageUrl: m.image_url },
  };
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

// Upload de la photo de profil (bucket public "chat-images", dossier avatars/).
export async function uploadAvatar(file: File, userId: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: "Supabase non configuré." };
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `avatars/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("chat-images").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
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
