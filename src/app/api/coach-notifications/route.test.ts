import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const ME = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const N = "55555555-5555-4555-8555-555555555555";

type Row = { id: string; recipient_id: string; read_at: string | null; title: string };
const w = vi.hoisted(() => ({
  user: { id: "22222222-2222-4222-8222-222222222222", email: "u@x.fr", kind: "member" } as null | { id: string; email: string; kind: string },
  rows: [] as { id: string; recipient_id: string; read_at: string | null; title: string }[],
}));

vi.mock("@/lib/api-auth", () => ({ getMemberOrCoach: async () => w.user }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const filters: Record<string, unknown> = {};
      let op = "select"; let payload: Record<string, unknown> = {}; let nullRead = false; let single = false;
      const q: Record<string, unknown> = {
        select: () => q, order: () => q, limit: () => q,
        eq: (c: string, v: unknown) => { filters[c] = v; return q; },
        is: () => { nullRead = true; return q; },
        update: (p: Record<string, unknown>) => { op = "update"; payload = p; return q; },
        maybeSingle: () => { single = true; return q; },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const matched = w.rows.filter((r) => Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v) && (!nullRead || r.read_at === null));
          if (op === "update") matched.forEach((r) => Object.assign(r, payload));
          const data = single ? (matched[0] ? { id: matched[0].id } : null) : matched;
          return Promise.resolve({ data, error: null }).then(res, rej);
        },
      };
      return q;
    },
  }),
}));

const patch = (body: unknown) => new NextRequest("http://x/api/coach-notifications", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const seed = (): Row[] => [
  { id: N, recipient_id: ME, read_at: null, title: "pour moi" },
  { id: "66666666-6666-4666-8666-666666666666", recipient_id: OTHER, read_at: null, title: "pour un autre" },
];

beforeEach(() => { w.user = { id: ME, email: "u@x.fr", kind: "member" }; w.rows = seed(); });

describe("notifications Coach : isolation par destinataire", () => {
  test("GET ne renvoie que les notifications du compte connecté", async () => {
    const { GET } = await import("./route");
    const body = await (await GET(new NextRequest("http://x/api/coach-notifications?recipient_id=" + OTHER))).json();
    expect(body.notifications.map((n: Row) => n.title)).toEqual(["pour moi"]);
    expect(body.unread).toBe(1);
  });
  test("un coach ne lit pas les notifications d'un membre, ni l'inverse", async () => {
    w.user = { id: OTHER, email: "c@x.fr", kind: "coach" };
    const { GET } = await import("./route");
    const body = await (await GET(new NextRequest("http://x/api/coach-notifications"))).json();
    expect(body.notifications.map((n: Row) => n.title)).toEqual(["pour un autre"]);
  });
  test("PATCH : l'identifiant seul ne suffit pas — la notification d'un autre est introuvable (404) et reste non lue", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(patch({ id: "66666666-6666-4666-8666-666666666666" }));
    expect(res.status).toBe(404);
    expect(w.rows[1].read_at).toBeNull();
  });
  test("PATCH : marque sa propre notification comme lue", async () => {
    const { PATCH } = await import("./route");
    expect((await PATCH(patch({ id: N }))).status).toBe(200);
    expect(w.rows[0].read_at).not.toBeNull();
  });
  test("PATCH all : ne touche que les lignes du destinataire connecté", async () => {
    const { PATCH } = await import("./route");
    await PATCH(patch({ all: true }));
    expect(w.rows[0].read_at).not.toBeNull();
    expect(w.rows[1].read_at).toBeNull();
  });
  test("sans session valide : 401 ; identifiant invalide : 400", async () => {
    const { GET, PATCH } = await import("./route");
    expect((await PATCH(patch({ id: "pas-un-uuid" }))).status).toBe(400);
    w.user = null;
    expect((await GET(new NextRequest("http://x/api/coach-notifications"))).status).toBe(401);
    expect((await PATCH(patch({ all: true }))).status).toBe(401);
  });
});
