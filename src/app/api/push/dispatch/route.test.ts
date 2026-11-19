import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb } from "@/test-utils/fake-supabase";

const w = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public";
  process.env.VAPID_PRIVATE_KEY = "test-private";
  return {
    db: null as unknown as ReturnType<typeof import("@/test-utils/fake-supabase").createFakeDb>,
    sent: [] as { endpoint: string; payload: Record<string, unknown> }[],
    failWith: {} as Record<string, number>,
  };
});

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }, payload: string) => {
      const status = w.failWith[sub.endpoint];
      if (status) throw Object.assign(new Error("push error"), { statusCode: status });
      w.sent.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
    },
  },
}));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => w.db }));

import { POST } from "./route";

const CONV = "00000000-0000-4000-8000-0000000000c1";
const MSG = "00000000-0000-4000-8000-0000000000a1";
const JEAN = "jean", MARIE = "marie", PAUL = "paul";

function seed(message: Record<string, unknown> = {}, extra: { subs?: Record<string, unknown>[]; profiles?: Record<string, unknown>[] } = {}) {
  w.db = createFakeDb({
    messages: [{ id: MSG, conversation_id: CONV, sender_id: JEAN, content: "Bonjour Marie, comment vas-tu ?", image_url: null, sticker: null, created_at: new Date().toISOString(), ...message }],
    conversation_members: [{ conversation_id: CONV, user_id: JEAN }, { conversation_id: CONV, user_id: MARIE }],
    profiles: extra.profiles ?? [
      { id: JEAN, pseudo: "Jean", status: "approved", email: "jean@example.test" },
      { id: MARIE, pseudo: "Marie", status: "approved", email: "marie@example.test" },
      { id: PAUL, pseudo: "Paul", status: "suspended", email: "paul@example.test" },
    ],
    push_subscriptions: extra.subs ?? [
      { id: "s-marie-android", user_id: MARIE, endpoint: "https://push.example/marie-android", p256dh: "k", auth: "a", locale: "fr", show_preview: true },
      { id: "s-marie-iphone", user_id: MARIE, endpoint: "https://push.example/marie-iphone", p256dh: "k", auth: "a", locale: "fr", show_preview: true },
      { id: "s-jean", user_id: JEAN, endpoint: "https://push.example/jean", p256dh: "k", auth: "a", locale: "fr", show_preview: true },
    ],
    push_log: [],
  }, { unique: { push_log: ["source+ref"], push_subscriptions: ["endpoint"] } });
}

const call = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  POST(new NextRequest("http://localhost/api/push/dispatch", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  }));

beforeEach(() => {
  w.sent = []; w.failWith = {};
  delete process.env.PUSH_DISPATCH_SECRET;
  seed();
});

describe("POST /api/push/dispatch — authentification serveur-à-serveur (test 8)", () => {
  test("secret configuré : appel sans en-tête refusé (401), rien n'est envoyé", async () => {
    process.env.PUSH_DISPATCH_SECRET = "s3cret";
    const res = await call({ source: "message", ref: MSG });
    expect(res.status).toBe(401);
    expect(w.sent).toHaveLength(0);
    expect(w.db.tables.push_log).toHaveLength(0);
  });
  test("secret configuré : mauvais secret refusé (401)", async () => {
    process.env.PUSH_DISPATCH_SECRET = "s3cret";
    expect((await call({ source: "message", ref: MSG }, { "x-push-secret": "devine" })).status).toBe(401);
    expect(w.sent).toHaveLength(0);
  });
  test("secret configuré : bon secret accepté", async () => {
    process.env.PUSH_DISPATCH_SECRET = "s3cret";
    const res = await call({ source: "message", ref: MSG }, { "x-push-secret": "s3cret" });
    expect(res.status).toBe(200);
    expect(w.sent.length).toBeGreaterThan(0);
  });
});

describe("POST /api/push/dispatch — message privé", () => {
  test("l'expéditeur ne reçoit jamais sa propre notification (test 6)", async () => {
    await call({ source: "message", ref: MSG });
    expect(w.sent.map((s) => s.endpoint)).not.toContain("https://push.example/jean");
  });

  test("tous les appareils de la destinataire reçoivent (test 4), avec lien vers la conversation exacte (test 3)", async () => {
    const res = await call({ source: "message", ref: MSG });
    expect(await res.json()).toMatchObject({ sent: 2, failed: 0 });
    expect(w.sent.map((s) => s.endpoint).sort()).toEqual(["https://push.example/marie-android", "https://push.example/marie-iphone"]);
    for (const s of w.sent) {
      expect(s.payload).toMatchObject({
        title: "Jean",
        body: "Bonjour Marie, comment vas-tu ?",
        url: `/dashboard?conv=${CONV}`,
        tag: `conv-${CONV}`,
        kind: "message",
        conversationId: CONV,
      });
    }
  });

  test("photo et sticker ont un texte lisible (test 9)", async () => {
    seed({ content: "", image_url: "chat/photo.webp" });
    await call({ source: "message", ref: MSG });
    expect(w.sent[0].payload.body).toBe("📷 Photo");

    w.sent = [];
    seed({ content: "", sticker: "amen" });
    await call({ source: "message", ref: MSG });
    expect(String(w.sent[0].payload.body)).toMatch(/Sticker$/);
  });

  test("aperçu désactivé sur un appareil : ni nom ni contenu sur cet appareil uniquement", async () => {
    w.db.tables.push_subscriptions.find((s) => s.id === "s-marie-iphone")!.show_preview = false;
    await call({ source: "message", ref: MSG });
    const iphone = w.sent.find((s) => s.endpoint.endsWith("marie-iphone"))!.payload;
    const android = w.sent.find((s) => s.endpoint.endsWith("marie-android"))!.payload;
    expect(iphone).toMatchObject({ title: "Garden of Alliance", body: "Vous avez reçu un nouveau message." });
    expect(JSON.stringify(iphone)).not.toContain("Jean");
    expect(JSON.stringify(iphone)).not.toContain("Bonjour");
    expect(iphone.url).toBe(`/dashboard?conv=${CONV}`);
    expect(android.title).toBe("Jean");
  });

  test("un destinataire non approuvé (suspendu) n'est pas notifié", async () => {
    w.db.tables.conversation_members.push({ conversation_id: CONV, user_id: PAUL });
    w.db.tables.push_subscriptions.push({ id: "s-paul", user_id: PAUL, endpoint: "https://push.example/paul", p256dh: "k", auth: "a", locale: "fr" });
    await call({ source: "message", ref: MSG });
    expect(w.sent.map((s) => s.endpoint)).not.toContain("https://push.example/paul");
  });

  test("même événement reçu deux fois : une seule notification par appareil", async () => {
    await call({ source: "message", ref: MSG });
    const second = await call({ source: "message", ref: MSG });
    expect(await second.json()).toMatchObject({ skipped: "déjà envoyé" });
    expect(w.sent).toHaveLength(2);
  });

  test("abonnement expiré (410 / 404) supprimé automatiquement (test 7)", async () => {
    w.failWith["https://push.example/marie-iphone"] = 410;
    const res = await call({ source: "message", ref: MSG });
    expect(await res.json()).toMatchObject({ sent: 1, removed: 1 });
    expect(w.db.tables.push_subscriptions.map((s) => s.id)).not.toContain("s-marie-iphone");
  });

  test("message ancien ou inconnu : rien n'est envoyé", async () => {
    seed({ created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() });
    await call({ source: "message", ref: MSG });
    expect(w.sent).toHaveLength(0);
  });

  test("requête mal formée : 400", async () => {
    expect((await call({ source: "message", ref: "pas-un-uuid" })).status).toBe(400);
    expect((await call({ source: "inconnu", ref: MSG })).status).toBe(400);
  });
});
