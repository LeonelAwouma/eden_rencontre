import { describe, expect, it } from "vitest";
import {
  buildCouples, computeStats, filterByStage, indexEngagements, pairKey, uniquePairs,
  type EngagementRow, type FriendshipRow,
} from "./admin-matching-stats";

const T = "2026-11-01T10:00:00Z";
let n = 0;
const fr = (a: string, b: string, status: string, updated = T): FriendshipRow => ({
  id: `f${++n}`, requester_id: a, addressee_id: b, status, created_at: T, updated_at: updated,
});
const eng = (a: string, b: string, status: string, created = T): EngagementRow => ({
  requester_id: a, recipient_id: b, status, created_at: created, responded_at: status === "pending" ? null : created,
});

/** Jeu représentatif : 50 attente, 5 relation, 1 refus = 56 duos. */
function dataset() {
  const f: FriendshipRow[] = [];
  for (let i = 0; i < 50; i++) f.push(fr(`p${i}`, `q${i}`, "pending"));
  for (let i = 0; i < 5; i++) f.push(fr(`r${i}`, `s${i}`, "accepted"));
  f.push(fr("x", "y", "declined"));
  return f;
}

describe("admin-matching-stats", () => {
  it("jeu représentatif : 5 catégories exclusives = 56", () => {
    const e = indexEngagements([]);
    const s = computeStats(buildCouples(dataset(), e, null), e);
    expect(s.exclusive).toEqual({ alliance_pending: 50, relation: 5, engagement_pending: 0, match: 0, declined: 1, total: 56 });
    const x = s.exclusive;
    expect(x.alliance_pending + x.relation + x.engagement_pending + x.match + x.declined).toBe(56);
    expect(s.all).toBe(56);
  });

  it("la vue cumulative 'accepted' reste distincte des catégories exclusives", () => {
    const e = indexEngagements([eng("a", "b", "accepted"), eng("c", "d", "pending"), eng("g", "h", "declined")]);
    const couples = buildCouples([
      fr("a", "b", "accepted"), fr("c", "d", "accepted"), fr("e", "f", "accepted"), fr("g", "h", "accepted"),
    ], e, null);
    const s = computeStats(couples, e);
    expect(s.accepted).toBe(4);
    expect(s.match).toBe(1);
    expect(s.engagement_pending).toBe(1);
    expect(s.relation).toBe(1);
    expect(s.engagement_declined).toBe(1);
    expect(s.accepted).toBe(s.relation + s.engagement_pending + s.match + s.engagement_declined);
    const x = s.exclusive;
    expect(x.alliance_pending + x.relation + x.engagement_pending + x.match + x.declined).toBe(x.total);
  });

  it("refus d'alliance et d'engagement : regroupés dans declined, distingués par ailleurs", () => {
    const e = indexEngagements([eng("a", "b", "declined")]);
    const couples = buildCouples([fr("a", "b", "accepted"), fr("c", "d", "declined")], e, null);
    const s = computeStats(couples, e);
    expect(s.declined).toBe(2);
    expect(s.declined_alliance).toBe(1);
    expect(s.engagement_declined).toBe(1);
    expect(filterByStage(couples, "declined")).toHaveLength(2);
    expect(filterByStage(couples, "engagement_declined")).toHaveLength(1);
  });

  it("déduplique les demandes inversées : accepté > en attente > refusé", () => {
    const rows = [fr("a", "b", "declined"), fr("b", "a", "pending"), fr("a", "b", "accepted"), fr("c", "d", "declined"), fr("d", "c", "pending")];
    const u = uniquePairs(rows, null);
    expect(u).toHaveLength(2);
    expect(u.find((r) => pairKey(r.requester_id, r.addressee_id) === "a:b")?.status).toBe("accepted");
    expect(u.find((r) => pairKey(r.requester_id, r.addressee_id) === "c:d")?.status).toBe("pending");
  });

  it("à priorité égale, la demande la plus récente l'emporte", () => {
    const old = fr("a", "b", "pending", "2026-01-01T00:00:00Z");
    const recent = fr("b", "a", "pending", "2026-06-01T00:00:00Z");
    expect(uniquePairs([old, recent], null)[0].id).toBe(recent.id);
  });

  it("exclut le compte technique Admin", () => {
    const u = uniquePairs([fr("admin", "m1", "accepted"), fr("m2", "admin", "accepted"), fr("m1", "m2", "pending")], "admin");
    expect(u).toHaveLength(1);
  });

  it("un engagement accepté prime sur un refus ultérieur", () => {
    const m = indexEngagements([eng("a", "b", "declined", "2026-02-01T00:00:00Z"), eng("b", "a", "accepted", "2026-01-01T00:00:00Z")]);
    expect(m.get("a:b")?.status).toBe("accepted");
  });

  it("compteurs = résultats filtrés pour chaque catégorie", () => {
    const e = indexEngagements([eng("a", "b", "accepted"), eng("c", "d", "pending")]);
    const couples = buildCouples([...dataset(), fr("a", "b", "accepted"), fr("c", "d", "accepted")], e, null);
    const s = computeStats(couples, e);
    for (const k of ["alliance_pending", "relation", "engagement_pending", "match", "declined", "accepted", "all"] as const) {
      expect(filterByStage(couples, k)).toHaveLength(s[k]);
    }
  });
});

import { journeySteps } from "./admin-matching-stats";

describe("journeySteps", () => {
  const st = (s: Parameters<typeof journeySteps>[0]) => journeySteps(s).map((x) => x.status);
  it("une alliance acceptée n'est pas un match", () => {
    expect(st("relation")).toEqual(["done", "current", "notReached", "notReached"]);
    expect(st("relation")[3]).toBe("notReached");
  });
  it("couvre chaque étape du parcours", () => {
    expect(st("alliance_pending")).toEqual(["current", "waiting", "notReached", "notReached"]);
    expect(st("declined")[0]).toBe("declined");
    expect(st("engagement_pending")[2]).toBe("waiting");
    expect(st("engagement_declined")[2]).toBe("declined");
    expect(st("match")).toEqual(["done", "done", "done", "done"]);
  });
});
