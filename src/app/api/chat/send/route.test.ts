import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const CONV = "00000000-0000-4000-8000-000000000001";
const w = vi.hoisted(() => ({
  user: { id: "u1" } as null | { id: string },
  friends: true,
  convStatus: "active",
  todayCount: 0,
  moderation: vi.fn(async () => ({ allowed: true })),
  inserted: [] as Record<string, unknown>[],
  selected: [] as string[],
}));

vi.mock("@/lib/api-auth", () => ({ getApprovedUser: async () => w.user }));
vi.mock("@/lib/moderation", () => ({ validateMessage: (...a: unknown[]) => (w.moderation as (...x: unknown[]) => unknown)(...a) }));
vi.mock("@/lib/subscription/effective", () => ({ hasFeatureAccess: async () => false }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    rpc: async () => ({ data: w.friends }),
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      q.select = (cols?: string, opts?: { head?: boolean }) => {
        if (table === "messages" && opts?.head) {
          return { eq: () => ({ gte: async () => ({ count: w.todayCount }) }) };
        }
        if (table === "messages" && cols) w.selected.push(cols);
        return q;
      };
      q.eq = () => (table === "conversation_members" ? Promise.resolve({ data: [{ user_id: "u1" }, { user_id: "u2" }] }) : q);
      q.maybeSingle = async () => ({ data: { status: w.convStatus }, error: null });
      q.insert = (row: Record<string, unknown>) => { w.inserted.push(row); return q; };
      q.single = async () => ({ data: { id: "m1", ...w.inserted[w.inserted.length - 1], created_at: new Date().toISOString() }, error: null });
      return q;
    },
  }),
}));

import { POST } from "./route";

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/chat/send", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: CONV, ...body }),
  }));

beforeEach(() => {
  w.user = { id: "u1" }; w.friends = true; w.convStatus = "active"; w.todayCount = 0;
  w.inserted = []; w.selected = []; w.moderation.mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
});

describe("POST /api/chat/send — stickers", () => {
  test("un sticker seul est accepté, stocké par identifiant, sans modération de texte", async () => {
    const res = await post({ content: "", sticker: "amen" });
    expect(res.status).toBe(200);
    expect(w.inserted[0]).toMatchObject({ conversation_id: CONV, sender_id: "u1", content: "", sticker: "amen" });
    expect(w.moderation).not.toHaveBeenCalled();
    expect((await res.json()).message).toMatchObject({ sticker: "amen" });
  });

  test("les nouveaux stickers du catalogue commun sont acceptés", async () => {
    expect((await post({ sticker: "colombe" })).status).toBe(200);
  });

  test("sticker hors catalogue : 400, rien d'inséré", async () => {
    const res = await post({ sticker: "inconnu-du-catalogue" });
    expect(res.status).toBe(400);
    expect(w.inserted).toHaveLength(0);
  });

  test("sticker + texte ou photo : 400", async () => {
    expect((await post({ sticker: "amen", content: "salut" })).status).toBe(400);
    expect((await post({ sticker: "amen", imageUrl: "https://x.supabase.co/storage/v1/object/public/chat-images/a.png" })).status).toBe(400);
  });

  test("les contrôles existants s'appliquent aussi aux stickers", async () => {
    w.user = null;
    expect((await post({ sticker: "amen" })).status).toBe(401);
    w.user = { id: "u1" }; w.friends = false;
    expect((await post({ sticker: "amen" })).status).toBe(403);
    w.friends = true; w.convStatus = "blocked";
    expect((await post({ sticker: "amen" })).status).toBe(403);
    w.convStatus = "active"; w.todayCount = 50;
    expect((await post({ sticker: "amen" })).status).toBe(429);
    expect(w.inserted).toHaveLength(0);
  });

  test("message vide sans sticker : 400", async () => {
    expect((await post({ content: "  " })).status).toBe(400);
  });
});

describe("POST /api/chat/send — texte et photos inchangés", () => {
  test("texte seul : modéré, aucune colonne sticker", async () => {
    const res = await post({ content: "Bonjour" });
    expect(res.status).toBe(200);
    expect(w.moderation).toHaveBeenCalledTimes(1);
    expect(w.inserted[0]).not.toHaveProperty("sticker");
    expect(w.selected[0]).not.toContain("sticker");
  });

  test("photo seule et texte + photo", async () => {
    const url = "https://x.supabase.co/storage/v1/object/public/chat-images/c/a.png";
    expect((await post({ content: "", imageUrl: url })).status).toBe(200);
    expect((await post({ content: "Regarde", imageUrl: url })).status).toBe(200);
    expect(w.inserted.every((r) => !("sticker" in r))).toBe(true);
  });
});
