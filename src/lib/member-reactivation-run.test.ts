import { describe, expect, test } from "vitest";
import { MAX_ATTEMPTS_PER_RUN, runReactivation } from "./member-reactivation-run";
import { DAY_MS } from "./member-reactivation-policy";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

/** Faux client Supabase en mémoire : select / eq / in / lte / order / range / maybeSingle / insert (unicité) / update. */
function fakeDb(tables: Tables) {
  const uniq: Record<string, string[]> = { member_reactivation_sends: ["user_id", "inactive_since", "step_days"] };
  const from = (table: string) => {
    tables[table] ??= [];
    const rows = tables[table];
    let preds: ((r: Row) => boolean)[] = [];
    let op: "select" | "update" = "select";
    let patch: Row = {};
    let order: [string, boolean][] = [];
    let rng: [number, number] | null = null;
    let single = false;
    const run = () => {
      let hit = rows.filter((r) => preds.every((p) => p(r)));
      if (op === "update") { hit.forEach((r) => Object.assign(r, patch)); return { data: hit.map((r) => ({ ...r })), error: null }; }
      for (const [c, asc] of [...order].reverse()) hit = [...hit].sort((a, b) => (String(a[c]) < String(b[c]) ? -1 : 1) * (asc ? 1 : -1));
      if (rng) hit = hit.slice(rng[0], rng[1] + 1);
      return { data: single ? (hit[0] ?? null) : hit.map((r) => ({ ...r })), error: null };
    };
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => { preds.push((r) => (c === "claimed_at" || c === "inactive_since" ? Date.parse(String(r[c])) === Date.parse(String(v)) : r[c] === v)); return q; },
      in: (c: string, v: unknown[]) => { preds.push((r) => v.includes(r[c])); return q; },
      lte: (c: string, v: string) => { preds.push((r) => r[c] != null && Date.parse(String(r[c])) <= Date.parse(v)); return q; },
      order: (c: string, o?: { ascending?: boolean }) => { order.push([c, o?.ascending !== false]); return q; },
      range: (a: number, b: number) => { rng = [a, b]; return q; },
      maybeSingle: () => { single = true; return q; },
      update: (p: Row) => { op = "update"; patch = p; return q; },
      insert: async (r: Row) => {
        const keys = uniq[table];
        if (keys && rows.some((x) => keys.every((k) => (k === "inactive_since" ? Date.parse(String(x[k])) === Date.parse(String(r[k])) : x[k] === r[k])))) {
          return { error: { code: "23505", message: "dup" } };
        }
        rows.push({ ...r });
        return { error: null };
      },
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  return { from } as never;
}

const NOW = Date.parse("2026-11-12T10:00:00Z");
const ago = (days: number) => new Date(NOW - days * DAY_MS).toISOString();
const SYS = "admin-system@eden.local";
const member = (id: string, daysAgo: number, over: Row = {}): Row => ({
  id, email: `${id}@mail.fr`, name: id, pseudo: id, status: "approved", account_type: "member", last_member_visit_at: ago(daysAgo), ...over,
});

function setup(profiles: Row[], extra: Partial<Tables> = {}) {
  const tables: Tables = {
    profiles: profiles, member_reactivation_preferences: [], member_reactivation_sends: [], coach_accounts: [], ...extra,
  };
  const sent: { to: string; step: number }[] = [];
  const base = {
    db: fakeDb(tables), systemEmail: SYS, now: () => NOW,
    unsubscribeUrl: (id: string) => `https://x/unsub/${id}`,
    send: async (to: string, _n: string, step: 7 | 21 | 45) => { sent.push({ to, step }); return true; },
  };
  return { tables, sent, base };
}

describe("rappels automatiques : sélection", () => {
  test("tous les membres approuvés et éligibles sont pris en compte sans aucune préférence enregistrée", async () => {
    const { sent, base } = setup([member("a", 8), member("b", 30), member("c", 3)]);
    const r = await runReactivation(base);
    expect(sent.map((s) => s.to).sort()).toEqual(["a@mail.fr", "b@mail.fr"]); // c : moins de 7 jours
    expect(r.sent).toBe(2);
  });
  test("un membre nouvellement approuvé (date posée à l'approbation) entre dans le cycle après 7 jours", async () => {
    const { sent, base } = setup([member("new", 7)]);
    await runReactivation(base);
    expect(sent).toHaveLength(1);
  });
  test("exclus : comptes Coach, non approuvés, adresses techniques, compte système, sans date de visite", async () => {
    const { sent, base } = setup([
      member("coach", 30, { account_type: "coach" }),
      member("coachrow", 30), // profil « member » mais présent dans coach_accounts
      member("pending", 30, { status: "pending" }),
      member("tech", 30, { email: "x@phone.local" }),
      member("sys", 30, { email: SYS }),
      member("novisit", 30, { last_member_visit_at: null }),
      member("ok", 30),
    ], { coach_accounts: [{ user_id: "coachrow" }] });
    await runReactivation(base);
    expect(sent.map((s) => s.to)).toEqual(["ok@mail.fr"]);
  });
  test("désinscription respectée : email_opt_in=false exclut ; true ou absence de ligne = inscrit", async () => {
    const { sent, base } = setup([member("out", 30), member("in", 30), member("none", 30)], {
      member_reactivation_preferences: [{ user_id: "out", email_opt_in: false }, { user_id: "in", email_opt_in: true }],
    });
    await runReactivation(base);
    expect(sent.map((s) => s.to).sort()).toEqual(["in@mail.fr", "none@mail.fr"]);
  });
});

describe("rappels automatiques : cycle et doublons", () => {
  test("une seconde exécution n'envoie rien de plus (déduplication) ; les 21 jours attendent 7 jours d'écart", async () => {
    const { sent, base, tables } = setup([member("a", 30)]);
    await runReactivation(base);
    await runReactivation(base);
    expect(sent).toHaveLength(1);
    expect(tables.member_reactivation_sends).toHaveLength(1);
    // 8 jours plus tard : palier 21 (le palier 7 est déjà envoyé)
    await runReactivation({ ...base, now: () => NOW + 8 * DAY_MS });
    expect(sent.map((s) => s.step)).toEqual([7, 21]);
  });
  test("une nouvelle visite réinitialise le cycle : nouveau inactive_since, palier 7 de nouveau possible", async () => {
    const { sent, base, tables } = setup([member("a", 30)]);
    await runReactivation(base);
    tables.profiles[0].last_member_visit_at = ago(8); // le membre est revenu puis a de nouveau disparu
    await runReactivation({ ...base, now: () => NOW + 8 * DAY_MS });
    expect(sent.map((s) => s.step)).toEqual([7, 7]);
    expect(tables.member_reactivation_sends).toHaveLength(2); // historique du premier cycle conservé
  });
  test("deux exécutions simultanées : une seule obtient la prise en charge, un seul e-mail", async () => {
    const { sent, base } = setup([member("a", 30)]);
    await Promise.all([runReactivation(base), runReactivation(base)]);
    expect(sent).toHaveLength(1);
  });
  test("l'historique des e-mails déjà envoyés est préservé et empêche un renvoi", async () => {
    const { sent, base } = setup([member("a", 8)], {
      member_reactivation_sends: [{ user_id: "a", inactive_since: ago(8), step_days: 7, status: "sent", claimed_at: ago(1), sent_at: ago(1), attempts: 1 }],
    });
    await runReactivation(base);
    expect(sent).toHaveLength(0);
  });
});

describe("rappels automatiques : échecs et plafond", () => {
  test("une erreur d'envoi (retour false ou exception) ne bloque pas les autres membres", async () => {
    const { tables, base } = setup([member("a", 30), member("b", 29), member("c", 28)]);
    const sent: string[] = [];
    const r = await runReactivation({
      ...base,
      send: async (to) => { if (to.startsWith("a")) throw new Error("SMTP"); if (to.startsWith("b")) return false; sent.push(to); return true; },
    });
    expect(sent).toEqual(["c@mail.fr"]);
    expect(r).toMatchObject({ sent: 1, failed: 2 });
    expect(tables.member_reactivation_sends.map((s) => s.status).sort()).toEqual(["failed", "failed", "sent"]);
  });
  test("le plafond porte sur les TENTATIVES (réussies ou non), pas seulement les succès", async () => {
    const many = Array.from({ length: 20 }, (_, i) => member(`m${String(i).padStart(2, "0")}`, 40 - i));
    const { base } = setup(many);
    let calls = 0;
    const r = await runReactivation({ ...base, send: async () => { calls++; return false; } });
    expect(calls).toBe(MAX_ATTEMPTS_PER_RUN);
    expect(r.attempted).toBe(MAX_ATTEMPTS_PER_RUN);
  });
  test("un échec est repris le lendemain, une seule exécution à la fois (compare-and-swap)", async () => {
    const { tables, base } = setup([member("a", 30)]);
    await runReactivation({ ...base, send: async () => false });
    expect(tables.member_reactivation_sends[0].status).toBe("failed");
    const later = { ...base, now: () => NOW + 25 * 3600_000 };
    const sent: string[] = [];
    const send = async (to: string) => { sent.push(to); return true; };
    await Promise.all([runReactivation({ ...later, send }), runReactivation({ ...later, send })]);
    expect(sent).toHaveLength(1);
    expect(tables.member_reactivation_sends[0]).toMatchObject({ status: "sent", attempts: 2 });
  });
  test("opposition ou visite survenue pendant l'exécution : rien n'est envoyé (contrôle final)", async () => {
    const { tables, base } = setup([member("a", 30)]);
    const sent: string[] = [];
    await runReactivation({ ...base, db: fakeDbWithLateOpposition(tables), send: async (to) => { sent.push(to); return true; } });
    expect(sent).toEqual([]);
  });
});

/** Faux client dont l'opposition apparaît entre le chargement de la liste et le dernier contrôle. */
function fakeDbWithLateOpposition(tables: Tables) {
  const real = fakeDb(tables) as unknown as { from: (t: string) => Record<string, unknown> };
  let prefReads = 0;
  return {
    from: (t: string) => {
      const q = real.from(t);
      if (t === "member_reactivation_preferences") {
        const orig = q.maybeSingle as () => unknown;
        q.maybeSingle = () => { prefReads++; if (prefReads === 1) tables.member_reactivation_preferences.push({ user_id: "a", email_opt_in: false }); return orig(); };
      }
      return q;
    },
  } as never;
}
