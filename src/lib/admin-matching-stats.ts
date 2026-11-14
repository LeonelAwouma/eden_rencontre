/**
 * Logique pure du suivi des duos (Admin → Matching).
 *
 * Extraite de /api/admin/matching/couples pour être testable. Le comportement
 * est strictement celui d'origine : mêmes priorités, mêmes regroupements.
 *
 * Les cinq étapes « exclusives » partitionnent les duos uniques :
 *   alliance_pending + relation + engagement_pending + match + declined = all
 * où `declined` regroupe l'alliance refusée ET l'engagement refusé.
 * `accepted` est une vue cumulative (relation + engagements + matchs + engagements refusés).
 */

export type Stage =
  | "alliance_pending" | "relation" | "engagement_pending" | "match" | "engagement_declined" | "declined";

export interface FriendshipRow {
  id: string; requester_id: string; addressee_id: string; status: string; created_at: string; updated_at: string;
}
export interface EngagementRow {
  requester_id: string; recipient_id: string; status: string; created_at: string; responded_at: string | null;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Un seul engagement par duo : l'acceptation prime, sinon le plus récent (lignes triées du plus récent au plus ancien). */
export function indexEngagements(rows: EngagementRow[]): Map<string, EngagementRow> {
  const byPair = new Map<string, EngagementRow>();
  for (const e of rows) {
    const key = pairKey(e.requester_id, e.recipient_id);
    const prev = byPair.get(key);
    if (!prev || (e.status === "accepted" && prev.status !== "accepted")) byPair.set(key, e);
  }
  return byPair;
}

export function stageOf(f: FriendshipRow, engagementByPair: Map<string, EngagementRow>): Stage {
  if (f.status === "declined") return "declined";
  if (f.status !== "accepted") return "alliance_pending";
  const e = engagementByPair.get(pairKey(f.requester_id, f.addressee_id));
  if (e?.status === "accepted") return "match";
  if (e?.status === "pending") return "engagement_pending";
  if (e?.status === "declined") return "engagement_declined";
  return "relation";
}

/**
 * Un duo n'apparaît qu'une fois, même avec des demandes inversées : alliance
 * acceptée > invitation en attente > invitation refusée (puis la plus récente).
 * Le compte technique Admin est exclu.
 */
export function uniquePairs(friendships: FriendshipRow[], adminId: string | null): FriendshipRow[] {
  const unique = new Map<string, FriendshipRow>();
  const priority = (status: string) => (status === "accepted" ? 3 : status === "pending" ? 2 : 1);
  for (const row of friendships) {
    if (adminId && (row.requester_id === adminId || row.addressee_id === adminId)) continue;
    if (!["accepted", "pending", "declined"].includes(row.status)) continue;
    const key = pairKey(row.requester_id, row.addressee_id);
    const previous = unique.get(key);
    if (!previous || priority(row.status) > priority(previous.status)
      || (priority(row.status) === priority(previous.status) && row.updated_at > previous.updated_at)) {
      unique.set(key, row);
    }
  }
  return [...unique.values()];
}

export interface Couple extends FriendshipRow { stage: Stage }

export function buildCouples(
  friendships: FriendshipRow[], engagementByPair: Map<string, EngagementRow>, adminId: string | null,
): Couple[] {
  return uniquePairs(friendships, adminId).map((f) => ({ ...f, stage: stageOf(f, engagementByPair) }));
}

export function computeStats(couples: Couple[], engagementByPair: Map<string, EngagementRow>, now = Date.now()) {
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const matchedAt = (c: FriendshipRow) => engagementByPair.get(pairKey(c.requester_id, c.addressee_id))?.responded_at ?? null;
  const count = (s: Stage) => couples.filter((c) => c.stage === s).length;
  const declined = count("declined") + count("engagement_declined");
  const base = {
    match: count("match"),
    matchThisWeek: couples.filter((c) => c.stage === "match" && new Date(matchedAt(c) || 0).getTime() >= weekAgo).length,
    engagement_pending: count("engagement_pending"),
    /** Vue cumulative (relations + engagements + matchs + engagements refusés). Ne s'additionne pas. */
    accepted: couples.filter((c) => c.status === "accepted").length,
    relation: count("relation"),
    engagement_declined: count("engagement_declined"),
    alliance_pending: count("alliance_pending"),
    /** Alliance refusée + engagement refusé. */
    declined,
    /** Alliance refusée seule. */
    declined_alliance: count("declined"),
    all: couples.length,
  };
  return {
    ...base,
    /** Les cinq catégories exclusives ; leur somme vaut toujours `total`. */
    exclusive: {
      alliance_pending: base.alliance_pending,
      relation: base.relation,
      engagement_pending: base.engagement_pending,
      match: base.match,
      declined,
      total: base.all,
    },
  };
}

export type StageFilter = Stage | "accepted" | "declined" | "all";

export function filterByStage(couples: Couple[], stageFilter: string): Couple[] {
  return couples.filter((c) =>
    stageFilter === "all" ? true
      : stageFilter === "accepted" ? c.status === "accepted"
      : stageFilter === "declined" ? c.stage === "declined" || c.stage === "engagement_declined"
      : c.stage === stageFilter,
  );
}

export type StepStatus = "done" | "current" | "waiting" | "declined" | "notReached";
export type StepKey = "request" | "alliance" | "engagement" | "match";

/**
 * Progression visuelle d'un duo : demande → alliance acceptée → engagement → match.
 * Une alliance acceptée n'est JAMAIS un match : seul l'engagement accepté (étape `match`) l'est.
 */
export function journeySteps(stage: Stage): { key: StepKey; status: StepStatus }[] {
  const table: Record<Stage, StepStatus[]> = {
    alliance_pending: ["current", "waiting", "notReached", "notReached"],
    declined: ["declined", "notReached", "notReached", "notReached"],
    relation: ["done", "current", "notReached", "notReached"],
    engagement_pending: ["done", "done", "waiting", "notReached"],
    engagement_declined: ["done", "done", "declined", "notReached"],
    match: ["done", "done", "done", "done"],
  };
  const keys: StepKey[] = ["request", "alliance", "engagement", "match"];
  return keys.map((key, i) => ({ key, status: table[stage][i] }));
}
