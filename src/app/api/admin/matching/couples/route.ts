/**
 * GET /api/admin/matching/couples?stage=accepted|match|engagement_pending|relation|alliance_pending|declined|all&search=…&page=1
 *
 * Les couples de la plateforme et leur parcours. Définition retenue par
 * l'équipe : un VRAI match, c'est quand un membre clique sur « S'engager » dans
 * la conversation et que l'autre accepte (engagement_requests accepté).
 * La demande d'alliance acceptée (friendships) n'en est qu'une étape.
 *
 * Étapes d'un couple :
 *  alliance_pending     demande d'alliance envoyée, sans réponse
 *  relation             alliance acceptée, sans engagement en attente ni validé
 *  accepted (filtre)   TOUTES les alliances acceptées, y compris matchs et engagements
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
  const stageFilter = searchParams.get("stage") || "accepted";
  const search = (searchParams.get("search") || "").replace(/[,()%*\\]/g, " ").trim();
  const rawPage = Number(searchParams.get("page") || "1");
  const rawLimit = Number(searchParams.get("limit") || "20");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;

  const db = getSupabaseAdmin();

  // Le compte technique « Admin » de la messagerie n'est pas un membre : ses alliances ne sont pas des couples.
  const { data: adminProfile } = await db.from("profiles").select("id").eq("email", ADMIN_SYSTEM_EMAIL).maybeSingle();
  const adminId = adminProfile?.id ?? null;

  // Lecture paginée : un simple .limit(20000) peut être plafonné à 1 000
  // lignes par la configuration PostgREST, entraînant des statistiques erronées.
  const friendships: FriendshipRow[] = [];
  const PAGE_SIZE = 500;
  let complete = false;
  for (let start = 0; start < 100000; start += PAGE_SIZE) {
    const { data, error } = await db.from("friendships")
      .select("id, requester_id, addressee_id, status, created_at, updated_at")
      .order("id", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) return NextResponse.json({ error: "Impossible de charger les alliances." }, { status: 500 });
    friendships.push(...((data || []) as FriendshipRow[]));
    if (!data || data.length < PAGE_SIZE) { complete = true; break; }
  }
  if (!complete) return NextResponse.json({ error: "Volume de relations supérieur à la limite d'analyse." }, { status: 503 });

  // Une demande d'engagement est distincte de l'alliance. Un engagement validé
  // transforme le duo en match, mais il reste dans « Alliances acceptées ».
  const engagementByPair = new Map<string, EngagementRow>();
  let engagementsAvailable = true;
  for (let start = 0; start < 100000; start += PAGE_SIZE) {
    const { data, error } = await db.from("engagement_requests")
      .select("requester_id, recipient_id, status, created_at, responded_at")
      .order("created_at", { ascending: false })
      .order("requester_id", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) {
      // Installation où la fonctionnalité Engagement n'est pas encore migrée.
      // Ne jamais faire passer silencieusement un échec pour zéro match.
      if (error.code === "42P01" || error.code === "PGRST205") { engagementsAvailable = false; break; }
      return NextResponse.json({ error: "Impossible de charger les engagements." }, { status: 500 });
    }
    for (const e of (data || []) as EngagementRow[]) {
      const key = pairKey(e.requester_id, e.recipient_id);
      const prev = engagementByPair.get(key);
      // L'acceptation prime sur les demandes ultérieures, sinon la plus récente compte.
      if (!prev || (e.status === "accepted" && prev.status !== "accepted")) engagementByPair.set(key, e);
    }
    if (!data || data.length < PAGE_SIZE) { complete = true; break; }
    if (start + PAGE_SIZE >= 100000) return NextResponse.json({ error: "Volume d'engagements supérieur à la limite d'analyse." }, { status: 503 });
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

  // Plusieurs demandes inversées peuvent exister pour un même duo.
  // On n'affiche le duo qu'une fois : une alliance acceptée prime, puis une
  // invitation en attente, et enfin une invitation refusée.
  const uniquePairs = new Map<string, FriendshipRow>();
  const priority = (status: string) => status === "accepted" ? 3 : status === "pending" ? 2 : 1;
  for (const row of friendships) {
    if (row.requester_id === adminId || row.addressee_id === adminId) continue;
    if (!["accepted", "pending", "declined"].includes(row.status)) continue;
    const key = pairKey(row.requester_id, row.addressee_id);
    const previous = uniquePairs.get(key);
    if (!previous || priority(row.status) > priority(previous.status)
      || (priority(row.status) === priority(previous.status) && row.updated_at > previous.updated_at)) {
      uniquePairs.set(key, row);
    }
  }
  const couples = [...uniquePairs.values()].map((f) => ({ ...f, stage: stageOf(f) }));

  // Statistiques (sur tous les couples).
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const matchedAt = (c: FriendshipRow) => engagementByPair.get(pairKey(c.requester_id, c.addressee_id))?.responded_at ?? null;
  const count = (s: Stage) => couples.filter((c) => c.stage === s).length;
  const stats = {
    match: count("match"),
    matchThisWeek: couples.filter((c) => c.stage === "match" && new Date(matchedAt(c) || 0).getTime() >= weekAgo).length,
    engagement_pending: count("engagement_pending"),
    // Ensemble inclusif : les duos en engagement et les matchs y restent.
    accepted: couples.filter((c) => c.status === "accepted").length,
    relation: count("relation"),
    engagement_declined: count("engagement_declined"),
    alliance_pending: count("alliance_pending"),
    declined: count("declined") + count("engagement_declined"),
    all: couples.length,
  };

  // Filtre par étape (« Refusés » regroupe alliance et engagement refusés).
  let filtered = couples.filter((c) =>
    stageFilter === "all" ? true
      : stageFilter === "accepted" ? c.status === "accepted"
      : stageFilter === "declined" ? c.stage === "declined" || c.stage === "engagement_declined"
      : c.stage === stageFilter
  );
  // Parcours récents en premier, et validation la plus récente parmi les matchs.
  filtered.sort((a, b) => {
    const dateOf = (c: FriendshipRow) =>
      stageFilter === "match" ? matchedAt(c) || c.updated_at : c.updated_at;
    return new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime();
  });

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
    const engagement = c.status === "accepted" ? engagementByPair.get(key) ?? null : null;
    return {
      id: c.id,
      stage: c.stage,
      alliance_status: c.status,
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

  const response = NextResponse.json({
    couples: rows, total, page, totalPages: Math.max(1, Math.ceil(total / limit)), stats,
    engagementsAvailable,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
