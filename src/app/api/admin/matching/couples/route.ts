/**
 * GET /api/admin/matching/couples?stage=match|engagement_pending|relation|alliance_pending|declined|all&search=…&page=1
 *
 * Les couples de la plateforme et leur parcours. Définition retenue par
 * l'équipe : un VRAI match, c'est quand un membre clique sur « S'engager » dans
 * la conversation et que l'autre accepte (engagement_requests accepté).
 * La demande d'alliance acceptée (friendships) n'en est qu'une étape.
 *
 * Étapes d'un couple :
 *  alliance_pending     demande d'alliance envoyée, sans réponse
 *  relation             alliance acceptée : ils peuvent échanger
 *  engagement_pending   l'un a cliqué sur « S'engager », l'autre n'a pas encore validé
 *  match                engagement accepté : c'est un match
 *  engagement_declined  engagement refusé
 *  declined             demande d'alliance refusée
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";

type Stage = "alliance_pending" | "relation" | "engagement_pending" | "match" | "engagement_declined" | "declined";

interface FriendshipRow {
  id: string; requester_id: string; addressee_id: string; status: string; created_at: string; updated_at: string;
}
interface EngagementRow {
  requester_id: string; recipient_id: string; status: string; created_at: string; responded_at: string | null;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

const PROFILE_COLS =
  "id, name, pseudo, email, gender, birth_date, city, country, region, civil_status, profession, avatar_url, verification_status, status, questionnaire";

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const stageFilter = searchParams.get("stage") || "match";
  const search = (searchParams.get("search") || "").replace(/[,()%*\\]/g, " ").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const db = getSupabaseAdmin();

  // Le compte technique « Admin » de la messagerie n'est pas un membre : ses alliances ne sont pas des couples.
  const { data: adminProfile } = await db.from("profiles").select("id").eq("email", ADMIN_SYSTEM_EMAIL).maybeSingle();
  const adminId = adminProfile?.id ?? null;

  const { data: friendships, error } = await db
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Demandes d'engagement (table facultative : absente, on ignore cette étape).
  const engagementByPair = new Map<string, EngagementRow>();
  const { data: engagements } = await db
    .from("engagement_requests")
    .select("requester_id, recipient_id, status, created_at, responded_at")
    .order("created_at", { ascending: false });
  for (const e of (engagements || []) as EngagementRow[]) {
    const key = pairKey(e.requester_id, e.recipient_id);
    const prev = engagementByPair.get(key);
    // La plus récente compte, sauf qu'un engagement accepté prime toujours.
    if (!prev || (e.status === "accepted" && prev.status !== "accepted")) engagementByPair.set(key, e);
  }

  const stageOf = (f: FriendshipRow): Stage => {
    if (f.status === "declined") return "declined";
    if (f.status !== "accepted") return "alliance_pending";
    const e = engagementByPair.get(pairKey(f.requester_id, f.addressee_id));
    if (e?.status === "accepted") return "match";
    if (e?.status === "pending") return "engagement_pending";
    if (e?.status === "declined") return "engagement_declined";
    return "relation";
  };

  const couples = ((friendships || []) as FriendshipRow[])
    .filter((f) => f.requester_id !== adminId && f.addressee_id !== adminId)
    .map((f) => ({ ...f, stage: stageOf(f) }));

  // Statistiques (sur tous les couples).
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const matchedAt = (c: FriendshipRow) => engagementByPair.get(pairKey(c.requester_id, c.addressee_id))?.responded_at ?? null;
  const count = (s: Stage) => couples.filter((c) => c.stage === s).length;
  const stats = {
    match: count("match"),
    matchThisWeek: couples.filter((c) => c.stage === "match" && new Date(matchedAt(c) || 0).getTime() >= weekAgo).length,
    engagement_pending: count("engagement_pending"),
    relation: count("relation"),
    alliance_pending: count("alliance_pending"),
    declined: count("declined") + count("engagement_declined"),
    all: couples.length,
  };

  // Filtre par étape (« Refusés » regroupe alliance et engagement refusés).
  let filtered = couples.filter((c) =>
    stageFilter === "all" ? true
      : stageFilter === "declined" ? c.stage === "declined" || c.stage === "engagement_declined"
      : c.stage === stageFilter
  );
  // Les matchs, du plus récent au plus ancien.
  if (stageFilter === "match") {
    filtered.sort((a, b) => new Date(matchedAt(b) || 0).getTime() - new Date(matchedAt(a) || 0).getTime());
  }

  // Recherche par pseudo, nom ou email de l'un des deux membres.
  if (search) {
    const { data: hits } = await db.from("profiles").select("id")
      .or(`name.ilike.%${search}%,pseudo.ilike.%${search}%,email.ilike.%${search}%`).limit(500);
    const ids = new Set((hits || []).map((h) => h.id));
    filtered = filtered.filter((c) => ids.has(c.requester_id) || ids.has(c.addressee_id));
  }

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  // Profils des couples affichés (questionnaire compris, pour le pourcentage de compatibilité).
  const memberIds = Array.from(new Set(pageRows.flatMap((c) => [c.requester_id, c.addressee_id])));
  const { data: profiles } = memberIds.length
    ? await db.from("profiles").select(PROFILE_COLS).in("id", memberIds)
    : { data: [] };
  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  // Leur conversation : nombre de messages et dernier échange.
  const convByPair = new Map<string, string>();
  if (memberIds.length) {
    const { data: memberships } = await db.from("conversation_members").select("conversation_id, user_id").in("user_id", memberIds);
    const membersByConv = new Map<string, string[]>();
    for (const m of memberships || []) {
      const list = membersByConv.get(m.conversation_id) || [];
      list.push(m.user_id);
      membersByConv.set(m.conversation_id, list);
    }
    for (const [convId, users] of membersByConv) {
      if (users.length === 2) convByPair.set(pairKey(users[0], users[1]), convId);
    }
  }

  const rows = await Promise.all(pageRows.map(async (c) => {
    const key = pairKey(c.requester_id, c.addressee_id);
    const convId = convByPair.get(key) ?? null;
    let messageCount = 0;
    let lastMessageAt: string | null = null;
    if (convId) {
      const [{ count }, { data: last }] = await Promise.all([
        db.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", convId),
        db.from("messages").select("created_at").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      messageCount = count || 0;
      lastMessageAt = last?.created_at ?? null;
    }
    const engagement = engagementByPair.get(key) ?? null;
    return {
      id: c.id,
      stage: c.stage,
      requested_at: c.created_at,
      // Alliance acceptée : dernière mise à jour de la demande (pas de date d'acceptation séparée).
      relation_at: c.status === "accepted" ? c.updated_at : null,
      // Le match : la validation de l'engagement.
      matched_at: c.stage === "match" ? engagement?.responded_at ?? null : null,
      updated_at: c.updated_at,
      requester: profileById.get(c.requester_id) ?? { id: c.requester_id },
      addressee: profileById.get(c.addressee_id) ?? { id: c.addressee_id },
      engagement: engagement
        ? { status: engagement.status, requested_at: engagement.created_at, responded_at: engagement.responded_at, requester_id: engagement.requester_id }
        : null,
      conversation: { id: convId, message_count: messageCount, last_message_at: lastMessageAt },
    };
  }));

  return NextResponse.json({ couples: rows, total, page, totalPages: Math.max(1, Math.ceil(total / limit)), stats });
}
