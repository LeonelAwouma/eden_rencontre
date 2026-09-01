"use client";

// Liste des membres réels + demandes d'amitié (Supabase).
import { supabase } from "./supabase";
import type { MemberProfile } from "./chat";

export type RelationStatus = "none" | "pending_out" | "pending_in" | "friends" | "declined";

export interface FriendRequest {
  id: string; // id de la ligne friendships
  requester: MemberProfile;
  message?: string | null;
  when: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

const PROFILE_COLS =
  "id, name, email, city, country, region, gender, birth_date, civil_status, profession, bio, marriage_vision, avatar_url, verification_status";

// Champs du questionnaire utilisés par l'algorithme de matching (src/lib/matching.ts).
// On ne sélectionne jamais les sections privées (santé, appréhensions) d'un AUTRE membre :
// seuls ces champs précis sont extraits du JSONB `questionnaire`. Les 3 derniers sont les questions
// "non négociables" de fin de questionnaire (choix structurés) — non marquées privées dans
// onboarding.ts, donc destinées à être visibles par un partenaire potentiel.
const MATCH_QUESTIONNAIRE_COLS =
  "trancheAge:questionnaire->trancheAge, langues:questionnaire->langues, relationDieu:questionnaire->>relationDieu, roleDieu:questionnaire->>roleDieu, rythme:questionnaire->>rythme, organisation:questionnaire->>organisation, budget:questionnaire->>budget, enfants:questionnaire->>enfants, limitesSpirituelles:questionnaire->limitesSpirituelles, limitesComportementales:questionnaire->limitesComportementales, limitesRelationnelles:questionnaire->>limitesRelationnelles";

const FULL_PROFILE_COLS = `${PROFILE_COLS}, ${MATCH_QUESTIONNAIRE_COLS}`;

function mapRow(d: any): MemberProfile {
  return {
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
    verification_status: d.verification_status,
    questionnaire: {
      trancheAge: d.trancheAge,
      langues: d.langues,
      relationDieu: d.relationDieu,
      roleDieu: d.roleDieu,
      rythme: d.rythme,
      organisation: d.organisation,
      budget: d.budget,
      enfants: d.enfants,
      limitesSpirituelles: d.limitesSpirituelles,
      limitesComportementales: d.limitesComportementales,
      limitesRelationnelles: d.limitesRelationnelles,
    },
  };
}

function whenLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// Tous les membres (hors soi-même).
export async function listMembers(myId: string): Promise<MemberProfile[]> {
  if (!supabase || !myId) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(FULL_PROFILE_COLS)
    .neq("id", myId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[Eden] liste des membres échouée:", error.message);
    return [];
  }
  return (data || []).map(mapRow);
}

// Toutes mes relations (envoyées ou reçues) pour calculer l'état de chaque profil.
export async function listMyFriendships(myId: string): Promise<Friendship[]> {
  if (!supabase || !myId) return [];
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error) {
    console.error("[Eden] chargement des relations échoué:", error.message);
    return [];
  }
  return (data || []) as Friendship[];
}

// Demandes d'amitié reçues (en attente), avec le profil de l'expéditeur.
export async function listIncomingRequests(myId: string): Promise<FriendRequest[]> {
  if (!supabase || !myId) return [];
  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, message, created_at")
    .eq("addressee_id", myId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Eden] chargement des demandes échoué:", error.message);
    return [];
  }
  if (!rows || rows.length === 0) return [];
  const ids = rows.map((r: any) => r.requester_id);
  const { data: profs } = await supabase.from("profiles").select(FULL_PROFILE_COLS).in("id", ids);
  const byId: Record<string, MemberProfile> = {};
  (profs || []).forEach((p: any) => (byId[p.id] = mapRow(p)));
  // On n'écarte jamais une demande : si le profil de l'expéditeur manque, on met un repli minimal.
  return rows.map((r: any) => ({
    id: r.id,
    requester: byId[r.requester_id] || { id: r.requester_id, name: "Membre Eden", email: "" },
    message: r.message,
    when: whenLabel(r.created_at),
  }));
}

// Envoie une demande d'amitié.
export async function sendFriendRequest(addresseeId: string, message?: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré." };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, error: "Vous devez être connecté." };
  if (me === addresseeId) return { ok: false, error: "Action impossible." };
  const { error } = await supabase
    .from("friendships")
    .upsert(
      { requester_id: me, addressee_id: addresseeId, status: "pending", message: message ?? null, updated_at: new Date().toISOString() },
      { onConflict: "requester_id,addressee_id" }
    );
  if (error) {
    console.error("[Eden] demande d'amitié échouée:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Accepte ou décline une demande reçue.
export async function respondToRequest(requestId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré." };
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) {
    console.error("[Eden] réponse à la demande échouée:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ── FAVORIS ──────────────────────────────────────────────
export async function listFavoriteIds(myId: string): Promise<string[]> {
  if (!supabase || !myId) return [];
  const { data } = await supabase.from("favorites").select("target_id").eq("user_id", myId);
  return (data || []).map((r: any) => r.target_id);
}

export async function listFavorites(myId: string): Promise<MemberProfile[]> {
  if (!supabase || !myId) return [];
  const ids = await listFavoriteIds(myId);
  if (!ids.length) return [];
  const { data } = await supabase.from("profiles").select(FULL_PROFILE_COLS).in("id", ids);
  return (data || []).map(mapRow);
}

export async function isFavorited(targetId: string): Promise<boolean> {
  if (!supabase || !targetId) return false;
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return false;
  const { data } = await supabase.from("favorites").select("target_id").eq("user_id", me).eq("target_id", targetId).maybeSingle();
  return !!data;
}

export async function setFavorite(targetId: string, fav: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase non configuré." };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, error: "Vous devez être connecté." };
  if (fav) {
    const { error } = await supabase.from("favorites").upsert({ user_id: me, target_id: targetId }, { onConflict: "user_id,target_id" });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("favorites").delete().eq("user_id", me).eq("target_id", targetId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ── VISITES DE PROFIL ────────────────────────────────────
export interface Visitor {
  member: MemberProfile;
  when: string;
}

export async function recordProfileView(profileId: string): Promise<void> {
  if (!supabase || !profileId) return;
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me || me === profileId) return;
  await supabase
    .from("profile_views")
    .upsert({ viewer_id: me, profile_id: profileId, viewed_at: new Date().toISOString() }, { onConflict: "viewer_id,profile_id" });
}

export async function listVisitors(myId: string): Promise<Visitor[]> {
  if (!supabase || !myId) return [];
  const { data: rows } = await supabase
    .from("profile_views")
    .select("viewer_id, viewed_at")
    .eq("profile_id", myId)
    .order("viewed_at", { ascending: false })
    .limit(50);
  if (!rows || rows.length === 0) return [];
  const ids = rows.map((r: any) => r.viewer_id);
  const { data: profs } = await supabase.from("profiles").select(FULL_PROFILE_COLS).in("id", ids);
  const byId: Record<string, MemberProfile> = {};
  (profs || []).forEach((p: any) => (byId[p.id] = mapRow(p)));
  return rows
    .filter((r: any) => byId[r.viewer_id])
    .map((r: any) => ({ member: byId[r.viewer_id], when: whenLabel(r.viewed_at) }));
}

// État de la relation avec un membre précis (utilisé sur sa fiche profil).
export async function getRelationStatus(otherId: string): Promise<RelationStatus> {
  if (!supabase || !otherId) return "none";
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me || me === otherId) return "none";
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`);
  if (error || !data || data.length === 0) return "none";
  // On privilégie l'état le plus fort : amis > en attente > décliné
  if (data.some((r: any) => r.status === "accepted")) return "friends";
  const pending = data.find((r: any) => r.status === "pending");
  if (pending) return pending.requester_id === me ? "pending_out" : "pending_in";
  return "declined";
}

// Construit une table { otherId: { status, requestId } } à partir de mes relations.
export function buildRelationMap(myId: string, friendships: Friendship[]): Record<string, { status: RelationStatus; requestId: string }> {
  const rel: Record<string, { status: RelationStatus; requestId: string }> = {};
  friendships.forEach((f) => {
    const other = f.requester_id === myId ? f.addressee_id : f.requester_id;
    let status: RelationStatus = "none";
    if (f.status === "accepted") status = "friends";
    else if (f.status === "pending") status = f.requester_id === myId ? "pending_out" : "pending_in";
    else if (f.status === "declined") status = "declined";
    rel[other] = { status, requestId: f.id };
  });
  return rel;
}
