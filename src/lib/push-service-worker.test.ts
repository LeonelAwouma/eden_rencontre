import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, test } from "vitest";

/** Exécute public/sw.js dans un faux contexte de service worker (aucun navigateur requis). */
const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1";

interface FakeClient {
  url: string;
  visibilityState: string;
  activeConv?: string | null;
  postMessage: (msg: unknown, ports?: { postMessage: (m: unknown) => void }[]) => void;
  focus: () => Promise<unknown>;
  navigate?: (url: string) => Promise<unknown>;
  received: unknown[];
  navigatedTo?: string;
}

function makeClient(url: string, opts: { visible?: boolean; activeConv?: string | null } = {}): FakeClient {
  const c: FakeClient = {
    url,
    visibilityState: opts.visible === false ? "hidden" : "visible",
    activeConv: opts.activeConv ?? null,
    received: [],
    postMessage(msg, ports) {
      c.received.push(msg);
      if ((msg as { type?: string }).type === "query-active-conv") {
        ports?.[0]?.postMessage({ conversationId: c.activeConv, visible: c.visibilityState === "visible" });
      }
    },
    focus: async () => c,
    navigate: async (u: string) => { c.navigatedTo = u; return c; },
  };
  return c;
}

function loadWorker(userAgent: string, clients: FakeClient[]) {
  const listeners: Record<string, (e: unknown) => void> = {};
  const shown: { title: string; options: Record<string, unknown> }[] = [];
  const opened: string[] = [];
  class FakeChannel {
    port1: { onmessage: ((e: { data: unknown }) => void) | null } = { onmessage: null };
    port2 = { postMessage: (m: unknown) => queueMicrotask(() => this.port1.onmessage?.({ data: m })) };
  }
  const self = {
    navigator: { userAgent, setAppBadge: async () => {} },
    location: { origin: "https://www.gardenofalliance.com" },
    addEventListener: (type: string, fn: (e: unknown) => void) => { listeners[type] = fn; },
    skipWaiting: () => {},
    clients: {
      claim: async () => {},
      matchAll: async () => clients,
      openWindow: async (u: string) => { opened.push(u); },
    },
    registration: {
      showNotification: async (title: string, options: Record<string, unknown>) => { shown.push({ title, options }); },
    },
  };
  runInNewContext(source, { self, MessageChannel: FakeChannel, URL, setTimeout, clearTimeout, JSON, Promise, queueMicrotask, fetch: async () => ({}) });

  const push = async (data: Record<string, unknown>) => {
    let p: Promise<unknown> = Promise.resolve();
    listeners.push({ data: { json: () => data, text: () => JSON.stringify(data) }, waitUntil: (x: Promise<unknown>) => { p = x; } });
    await p;
  };
  const click = async (url: string) => {
    let p: Promise<unknown> = Promise.resolve();
    listeners.notificationclick({ notification: { close: () => {}, data: { url } }, waitUntil: (x: Promise<unknown>) => { p = x; } });
    await p;
  };
  return { push, click, shown, opened };
}

const MESSAGE = { title: "Jean", body: "Bonjour Marie", url: "/dashboard?conv=c1", tag: "conv-c1", kind: "message", conversationId: "c1" };

describe("public/sw.js — réception", () => {
  test("site fermé (aucune fenêtre) : la notification s'affiche (tests 1 et 2)", async () => {
    const sw = loadWorker(CHROME_ANDROID, []);
    await sw.push(MESSAGE);
    expect(sw.shown).toHaveLength(1);
    expect(sw.shown[0]).toMatchObject({ title: "Jean", options: { body: "Bonjour Marie", tag: "conv-c1", data: { url: "/dashboard?conv=c1" } } });
  });
  test("fenêtre ouverte sur une AUTRE conversation : la notification s'affiche", async () => {
    const sw = loadWorker(CHROME_ANDROID, [makeClient("https://www.gardenofalliance.com/dashboard", { activeConv: "c2" })]);
    await sw.push(MESSAGE);
    expect(sw.shown).toHaveLength(1);
  });
  test("conversation déjà à l'écran (Chrome) : pas d'alerte inutile", async () => {
    const sw = loadWorker(CHROME_ANDROID, [makeClient("https://www.gardenofalliance.com/dashboard", { activeConv: "c1" })]);
    await sw.push(MESSAGE);
    expect(sw.shown).toHaveLength(0);
  });
  test("conversation déjà à l'écran (Safari / iPhone) : affichée sans son, pour ne pas perdre l'abonnement", async () => {
    const sw = loadWorker(SAFARI_IOS, [makeClient("https://www.gardenofalliance.com/dashboard", { activeConv: "c1" })]);
    await sw.push(MESSAGE);
    expect(sw.shown).toHaveLength(1);
    expect(sw.shown[0].options).toMatchObject({ silent: true, renotify: false });
  });
  test("fenêtre cachée (onglet en arrière-plan) sur la conversation : la notification s'affiche", async () => {
    const sw = loadWorker(CHROME_ANDROID, [makeClient("https://www.gardenofalliance.com/dashboard", { activeConv: "c1", visible: false })]);
    await sw.push(MESSAGE);
    expect(sw.shown).toHaveLength(1);
  });
});

describe("public/sw.js — toucher la notification (test 3)", () => {
  test("aucune fenêtre : ouvre la conversation exacte", async () => {
    const sw = loadWorker(CHROME_ANDROID, []);
    await sw.click("/dashboard?conv=c1");
    expect(sw.opened).toEqual(["https://www.gardenofalliance.com/dashboard?conv=c1"]);
  });
  test("tableau de bord déjà ouvert : il reçoit l'ordre d'ouvrir la conversation, sans rechargement", async () => {
    const dash = makeClient("https://www.gardenofalliance.com/dashboard?tab=Accueil");
    const sw = loadWorker(CHROME_ANDROID, [dash]);
    await sw.click("/dashboard?conv=c1");
    expect(dash.received).toContainEqual({ type: "open-url", url: "/dashboard?conv=c1" });
    expect(sw.opened).toHaveLength(0);
  });
  test("autre page du site ouverte : elle est redirigée vers la conversation", async () => {
    const blog = makeClient("https://www.gardenofalliance.com/blog");
    const sw = loadWorker(CHROME_ANDROID, [blog]);
    await sw.click("/dashboard?conv=c1");
    expect(blog.navigatedTo).toBe("https://www.gardenofalliance.com/dashboard?conv=c1");
  });
});
