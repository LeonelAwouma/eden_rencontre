import { describe, expect, test } from "vitest";
import { claimPushEvent, finishPushEvent, pushOutcome, PUSH_CLAIM_STALE_MS } from "./push-claim";

type Row = { source: string; ref: string; status: string; claimed_at: string | null };

/** Faux client push_log : insertion avec contrainte unique, UPDATE conditionnel atomique (.or). */
function fakeDb(rows: Row[], opts: { noStatusColumn?: boolean } = {}) {
  return {
    from: () => ({
      insert: async (r: Record<string, unknown>) => {
        if (opts.noStatusColumn && "status" in r) return { error: { code: "42703", message: "no column" } };
        if (rows.some((x) => x.source === r.source && x.ref === r.ref)) return { error: { code: "23505", message: "dup" } };
        rows.push({ source: String(r.source), ref: String(r.ref), status: String(r.status ?? "sent"), claimed_at: (r.claimed_at as string) ?? null });
        return { error: null };
      },
      update: (patch: Record<string, unknown>) => {
        const f: Record<string, string> = {};
        let cond = "";
        const q: Record<string, unknown> = {
          eq: (c: string, v: string) => { f[c] = v; return q; },
          or: (c: string) => { cond = c; return q; },
          select: () => q,
          then: (res: (v: unknown) => unknown) => {
            const hit = rows.filter((r) => r.source === f.source && r.ref === f.ref && (!cond || matches(r, cond)));
            hit.forEach((r) => Object.assign(r, patch));
            return Promise.resolve({ data: hit.map((r) => ({ ref: r.ref })), error: null }).then(res);
          },
        };
        return q;
      },
    }),
  } as never;
}
function matches(r: Row, cond: string): boolean {
  if (r.status === "failed" && cond.includes("status.eq.failed")) return true;
  const m = cond.match(/claimed_at\.lt\.([^)]+)\)/);
  return r.status === "claimed" && !!m && !!r.claimed_at && r.claimed_at < m[1];
}

const NOW = new Date("2026-11-12T10:00:00Z");

describe("journal push : prise en charge atomique et reprise", () => {
  test("nouvel événement : pris en charge ; deuxième appel simultané : doublon", async () => {
    const rows: Row[] = [];
    expect(await claimPushEvent(fakeDb(rows), "coach_notification", "r1", NOW)).toBe("claimed");
    expect(await claimPushEvent(fakeDb(rows), "coach_notification", "r1", NOW)).toBe("duplicate");
    expect(rows).toHaveLength(1);
  });
  test("un événement déjà « sent » n'est jamais repris", async () => {
    const rows: Row[] = [{ source: "s", ref: "r", status: "sent", claimed_at: null }];
    expect(await claimPushEvent(fakeDb(rows), "s", "r", NOW)).toBe("duplicate");
  });
  test("un événement « failed » est repris par UNE seule exécution", async () => {
    const rows: Row[] = [{ source: "s", ref: "r", status: "failed", claimed_at: null }];
    expect(await claimPushEvent(fakeDb(rows), "s", "r", NOW)).toBe("claimed");
    expect(await claimPushEvent(fakeDb(rows), "s", "r", NOW)).toBe("duplicate");
    expect(rows[0].status).toBe("claimed");
  });
  test("« claimed » récent : non repris ; « claimed » périmé : repris", async () => {
    const fresh = new Date(NOW.getTime() - 60_000).toISOString();
    const stale = new Date(NOW.getTime() - PUSH_CLAIM_STALE_MS - 1000).toISOString();
    expect(await claimPushEvent(fakeDb([{ source: "s", ref: "r", status: "claimed", claimed_at: fresh }]), "s", "r", NOW)).toBe("duplicate");
    expect(await claimPushEvent(fakeDb([{ source: "s", ref: "r", status: "claimed", claimed_at: stale }]), "s", "r", NOW)).toBe("claimed");
  });
  test("migration pas encore appliquée : repli historique (une seule tentative)", async () => {
    const rows: Row[] = [];
    const db = fakeDb(rows, { noStatusColumn: true });
    expect(await claimPushEvent(db, "s", "r", NOW)).toBe("legacy");
    expect(await claimPushEvent(db, "s", "r", NOW)).toBe("duplicate");
    await finishPushEvent(db, "s", "r", "failed", "legacy"); // sans effet : pas de colonne status
  });
  test("issue : échec complet = failed ; livraison, partielle ou sans abonnement = sent", () => {
    expect(pushOutcome({ sent: 0, removed: 0, failed: 2, subscriptions: 2 })).toBe("failed");
    expect(pushOutcome({ sent: 1, removed: 0, failed: 1, subscriptions: 2 })).toBe("sent");
    expect(pushOutcome({ sent: 0, removed: 0, failed: 0, subscriptions: 0 })).toBe("sent");
    expect(pushOutcome({ sent: 0, removed: 1, failed: 0, subscriptions: 1 })).toBe("sent");
  });
});
