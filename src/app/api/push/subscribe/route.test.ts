import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb } from "@/test-utils/fake-supabase";

const w = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public";
  process.env.VAPID_PRIVATE_KEY = "test-private";
  return {
    db: null as unknown as ReturnType<typeof import("@/test-utils/fake-supabase").createFakeDb>,
    user: { id: "marie", email: "marie@example.test" } as null | { id: string; email: string },
    sent: [] as string[],
  };
});

vi.mock("web-push", () => ({
  default: { setVapidDetails: () => {}, sendNotification: async (s: { endpoint: string }) => { w.sent.push(s.endpoint); } },
}));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => w.db }));
vi.mock("@/lib/api-auth", () => ({
  getMemberOrCoach: async () => (w.user ? { ...w.user, kind: "member" } : null),
  getAuthenticatedUser: async () => w.user,
}));

import { GET, POST, PATCH, DELETE } from "./route";
import { POST as RESUBSCRIBE } from "../resubscribe/route";

const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ID_ANDROID = "00000000-0000-4000-8000-00000000000a";
const ID_IPHONE = "00000000-0000-4000-8000-00000000000b";
const ID_JEAN = "00000000-0000-4000-8000-00000000000c";

const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/push/subscribe", {
    method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body),
  });
const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p256", auth: "auth" } });

beforeEach(() => {
  w.user = { id: "marie", email: "marie@example.test" };
  w.sent = [];
  w.db = createFakeDb({
    push_subscriptions: [
      { id: ID_ANDROID, user_id: "marie", endpoint: "https://push.example/marie-android", p256dh: "k", auth: "a", locale: "fr", user_agent: ANDROID_UA, created_at: "2026-11-01T10:00:00Z", last_used_at: null, show_preview: true },
      { id: ID_IPHONE, user_id: "marie", endpoint: "https://push.example/marie-iphone", p256dh: "k", auth: "a", locale: "fr", user_agent: IPHONE_UA, created_at: "2026-11-02T10:00:00Z", last_used_at: null, show_preview: true },
      { id: ID_JEAN, user_id: "jean", endpoint: "https://push.example/jean", p256dh: "k", auth: "a", locale: "fr", user_agent: null, created_at: "2026-11-03T10:00:00Z", last_used_at: null, show_preview: true },
    ],
  }, { unique: { push_subscriptions: ["endpoint"] } });
});

describe("GET /api/push/subscribe — appareils du membre", () => {
  test("ne liste que SES appareils, sans jamais renvoyer l'endpoint, et repère cet appareil", async () => {
    const res = await GET(req("GET", undefined, { "x-push-endpoint": "https://push.example/marie-iphone" }));
    const { devices } = await res.json();
    expect(devices.map((d: { id: string }) => d.id).sort()).toEqual([ID_ANDROID, ID_IPHONE]);
    expect(JSON.stringify(devices)).not.toContain("push.example");
    expect(devices.find((d: { id: string }) => d.id === ID_IPHONE)).toMatchObject({ current: true, label: "iPhone · Safari", showPreview: true });
    expect(devices.find((d: { id: string }) => d.id === ID_ANDROID)).toMatchObject({ current: false, label: "Android · Chrome" });
  });
  test("non connecté : 401", async () => {
    w.user = null;
    expect((await GET(req("GET"))).status).toBe(401);
  });
});

describe("POST /api/push/subscribe — activation", () => {
  test("nouvel appareil enregistré, rafraîchissement sans doublon, préférence d'aperçu conservée", async () => {
    w.db.tables.push_subscriptions[0].show_preview = false;
    await POST(req("POST", { subscription: sub("https://push.example/marie-android"), locale: "fr" }, { "user-agent": ANDROID_UA }));
    const rows = w.db.tables.push_subscriptions.filter((s) => s.endpoint === "https://push.example/marie-android");
    expect(rows).toHaveLength(1);
    expect(rows[0].show_preview).toBe(false);

    const res = await POST(req("POST", { subscription: sub("https://push.example/marie-tablette"), locale: "en", test: true }));
    expect(res.status).toBe(200);
    expect(w.db.tables.push_subscriptions.filter((s) => s.user_id === "marie")).toHaveLength(3);
    expect(w.sent).toContain("https://push.example/marie-tablette"); // notification de confirmation
  });
  test("abonnement invalide (http, clés absentes) : 400", async () => {
    expect((await POST(req("POST", { subscription: sub("http://insecure.example/x") }))).status).toBe(400);
    expect((await POST(req("POST", { subscription: { endpoint: "https://push.example/x" } }))).status).toBe(400);
  });
});

describe("PATCH /api/push/subscribe — aperçu sur l'écran verrouillé", () => {
  test("modifie la préférence de son propre appareil", async () => {
    const res = await PATCH(req("PATCH", { endpoint: "https://push.example/marie-iphone", showPreview: false }));
    expect(res.status).toBe(200);
    expect(w.db.tables.push_subscriptions.find((s) => s.id === ID_IPHONE)!.show_preview).toBe(false);
  });
  test("impossible sur l'appareil d'un autre membre : 404, rien ne change", async () => {
    const res = await PATCH(req("PATCH", { endpoint: "https://push.example/jean", showPreview: false }));
    expect(res.status).toBe(404);
    expect(w.db.tables.push_subscriptions.find((s) => s.id === ID_JEAN)!.show_preview).toBe(true);
  });
});

describe("DELETE /api/push/subscribe — désactivation (test 5)", () => {
  test("par endpoint (cet appareil) : seul cet appareil est retiré", async () => {
    await DELETE(req("DELETE", { endpoint: "https://push.example/marie-android" }));
    expect(w.db.tables.push_subscriptions.map((s) => s.id).sort()).toEqual([ID_IPHONE, ID_JEAN]);
  });
  test("par identifiant (un autre de ses appareils)", async () => {
    await DELETE(req("DELETE", { id: ID_IPHONE }));
    expect(w.db.tables.push_subscriptions.map((s) => s.id)).not.toContain(ID_IPHONE);
  });
  test("l'appareil d'un autre membre n'est jamais retiré", async () => {
    await DELETE(req("DELETE", { id: ID_JEAN }));
    await DELETE(req("DELETE", { endpoint: "https://push.example/jean" }));
    expect(w.db.tables.push_subscriptions.map((s) => s.id)).toContain(ID_JEAN);
  });
});

describe("POST /api/push/resubscribe — renouvellement par le service worker", () => {
  const resub = (body: unknown) => RESUBSCRIBE(new NextRequest("http://localhost/api/push/resubscribe", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  test("remplace l'ancien endpoint en gardant le propriétaire et la préférence", async () => {
    w.db.tables.push_subscriptions[1].show_preview = false;
    const res = await resub({ oldEndpoint: "https://push.example/marie-iphone", subscription: sub("https://push.example/marie-iphone-v2") });
    expect(res.status).toBe(200);
    const row = w.db.tables.push_subscriptions.find((s) => s.id === ID_IPHONE)!;
    expect(row).toMatchObject({ endpoint: "https://push.example/marie-iphone-v2", user_id: "marie", show_preview: false });
  });
  test("ancien endpoint inconnu : 404, aucun abonnement créé", async () => {
    const res = await resub({ oldEndpoint: "https://push.example/devine", subscription: sub("https://push.example/pirate") });
    expect(res.status).toBe(404);
    expect(w.db.tables.push_subscriptions).toHaveLength(3);
  });
  test("nouvel endpoint déjà enregistré : l'ancien est retiré, pas de doublon", async () => {
    await resub({ oldEndpoint: "https://push.example/marie-iphone", subscription: sub("https://push.example/marie-android") });
    expect(w.db.tables.push_subscriptions.filter((s) => s.endpoint === "https://push.example/marie-android")).toHaveLength(1);
    expect(w.db.tables.push_subscriptions.map((s) => s.id)).not.toContain(ID_IPHONE);
  });
});
