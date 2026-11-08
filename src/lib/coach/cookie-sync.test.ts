import { describe, expect, it, vi } from "vitest";
import { COACH_SYNC_MIN_GAP_MS, createCookieSyncScheduler, startCookieSync, type SyncOutcome } from "./cookie-sync";
import { interpretSyncResponse } from "./session-cookie";

function harness(over: Partial<{ visible: boolean; online: boolean; logout: boolean; outcome: SyncOutcome; deferred: boolean }> = {}) {
  const s = { visible: true, online: true, logout: false, outcome: "ok" as SyncOutcome, deferred: false, ...over, now: 1_000_000, calls: 0, denied: 0 };
  let release: (() => void) | undefined;
  const scheduler = createCookieSyncScheduler({
    now: () => s.now,
    isVisible: () => s.visible,
    isOnline: () => s.online,
    isLoggingOut: () => s.logout,
    sync: async () => {
      s.calls += 1;
      if (s.deferred) await new Promise<void>((r) => { release = r; });
      return s.outcome;
    },
    onDenied: () => { s.denied += 1; },
  });
  return { s, scheduler, release: () => release?.() };
}

describe("planificateur : une synchronisation à la fois, jamais de rafale", () => {
  it("renouvellement périodique : une synchronisation", async () => {
    const h = harness();
    expect(await h.scheduler.request("interval")).toBe("ok");
    expect(h.s.calls).toBe(1);
  });
  it("retour d'un onglet après une longue veille : synchronisation (délai écoulé)", async () => {
    const h = harness();
    await h.scheduler.request("interval");
    h.s.now += 3 * 3600_000;
    expect(await h.scheduler.request("visible")).toBe("ok");
    expect(h.s.calls).toBe(2);
  });
  it("retour du réseau après une coupure : synchronisation", async () => {
    const h = harness({ online: false });
    expect(await h.scheduler.request("online")).toBe("skipped_offline");
    h.s.online = true;
    expect(await h.scheduler.request("online")).toBe("ok");
    expect(h.s.calls).toBe(1);
  });
  it("onglet toujours masqué : aucun appel", async () => {
    const h = harness({ visible: false });
    expect(await h.scheduler.request("interval")).toBe("skipped_hidden");
    expect(await h.scheduler.request("visible")).toBe("skipped_hidden");
    expect(h.s.calls).toBe(0);
  });
  it("plusieurs événements simultanés (timer + visibilité + réseau) : UN seul appel", async () => {
    const h = harness({ deferred: true });
    const all = Promise.all([h.scheduler.request("interval"), h.scheduler.request("visible"), h.scheduler.request("online")]);
    await Promise.resolve();
    h.release();
    const results = await all;
    expect(h.s.calls).toBe(1);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === "skipped_inflight")).toHaveLength(2);
  });
  it("synchronisation déjà en cours : aucun nouvel appel", async () => {
    const h = harness({ deferred: true });
    const first = h.scheduler.request("interval");
    expect(await h.scheduler.request("online")).toBe("skipped_inflight");
    h.release();
    await first;
    expect(h.s.calls).toBe(1);
  });
  it("délai minimal entre deux tentatives, jamais contourné", async () => {
    const h = harness();
    await h.scheduler.request("interval");
    h.s.now += COACH_SYNC_MIN_GAP_MS - 1;
    expect(await h.scheduler.request("visible")).toBe("skipped_gap");
    h.s.now += 1;
    expect(await h.scheduler.request("visible")).toBe("ok");
    expect(h.s.calls).toBe(2);
  });
  it("erreur réseau : résultat network_error, aucune déconnexion (onDenied non appelé)", async () => {
    const h = harness({ outcome: "network_error" });
    expect(await h.scheduler.request("online")).toBe("network_error");
    expect(h.s.denied).toBe(0);
  });
  it("exception pendant l'appel : network_error, et le verrou est libéré", async () => {
    const sync = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue("ok");
    let now = 0;
    const scheduler = createCookieSyncScheduler({ now: () => now, isVisible: () => true, isOnline: () => true, isLoggingOut: () => false, sync, onDenied: () => {} });
    expect(await scheduler.request("interval")).toBe("network_error");
    now += COACH_SYNC_MIN_GAP_MS;
    expect(await scheduler.request("interval")).toBe("ok");
  });
  it("Coach suspendu pendant la veille : refus du serveur → onDenied (le SERVEUR rejoue la garde), aucun cookie accordé", async () => {
    const h = harness({ outcome: "denied" });
    expect(await h.scheduler.request("visible")).toBe("denied");
    expect(h.s.denied).toBe(1);
  });
  it("jeton expiré puis renouvelé : le renouvellement est celui du client Supabase, le planificateur ne décide de rien", async () => {
    const h = harness({ outcome: "no_session" });
    expect(await h.scheduler.request("visible")).toBe("no_session");
    expect(h.s.denied).toBe(0);
  });
  it("aucune synchronisation pendant ou après une déconnexion", async () => {
    const h = harness({ logout: true });
    expect(await h.scheduler.request("interval")).toBe("skipped_logout");
    expect(h.s.calls).toBe(0);
  });
  it("déconnexion démarrée PENDANT l'appel : le résultat (même `denied`) est ignoré", async () => {
    const h = harness({ deferred: true, outcome: "denied" });
    const p = h.scheduler.request("interval");
    await Promise.resolve();
    h.s.logout = true;
    h.release();
    expect(await p).toBe("skipped_logout");
    expect(h.s.denied).toBe(0);
  });
});

function fakeEnv() {
  const listeners = new Map<string, Set<() => void>>();
  const target = (name: string) => ({
    addEventListener: (t: string, l: () => void) => { (listeners.get(`${name}:${t}`) ?? listeners.set(`${name}:${t}`, new Set()).get(`${name}:${t}`)!).add(l); },
    removeEventListener: (t: string, l: () => void) => { listeners.get(`${name}:${t}`)?.delete(l); },
  });
  const timers: { fn: () => void; ms: number; id: number; cleared: boolean }[] = [];
  const doc = { ...target("doc"), visibilityState: "visible" };
  const env = {
    doc, win: target("win"),
    setInterval: (fn: () => void, ms: number) => { const id = timers.length + 1; timers.push({ fn, ms, id, cleared: false }); return id; },
    clearInterval: (id: unknown) => { const t = timers.find((x) => x.id === id); if (t) t.cleared = true; },
  };
  const fire = (key: string) => listeners.get(key)?.forEach((l) => l());
  const count = () => [...listeners.values()].reduce((n, s) => n + s.size, 0);
  return { env, timers, fire, count, doc };
}

describe("branchement : minuteur, visibilitychange, online, nettoyage", () => {
  it("minuteur de 30 min conservé + deux écouteurs ; focus n'est pas écouté", () => {
    const f = fakeEnv();
    const request = vi.fn(async () => "ok" as const);
    startCookieSync({ request }, f.env, 30 * 60 * 1000);
    expect(f.timers).toHaveLength(1);
    expect(f.timers[0].ms).toBe(30 * 60 * 1000);
    expect(f.count()).toBe(2);
    f.timers[0].fn();
    expect(request).toHaveBeenLastCalledWith("interval");
    f.fire("win:online");
    expect(request).toHaveBeenLastCalledWith("online");
    f.fire("win:focus");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("visibilitychange : seulement quand l'onglet redevient visible", () => {
    const f = fakeEnv();
    const request = vi.fn(async () => "ok" as const);
    startCookieSync({ request }, f.env, 1000);
    f.doc.visibilityState = "hidden";
    f.fire("doc:visibilitychange");
    expect(request).not.toHaveBeenCalled();
    f.doc.visibilityState = "visible";
    f.fire("doc:visibilitychange");
    expect(request).toHaveBeenCalledWith("visible");
  });
  it("démontage : minuteur arrêté et TOUS les écouteurs retirés", () => {
    const f = fakeEnv();
    const request = vi.fn(async () => "ok" as const);
    const stop = startCookieSync({ request }, f.env, 1000);
    stop();
    expect(f.timers[0].cleared).toBe(true);
    expect(f.count()).toBe(0);
    f.fire("win:online"); f.fire("doc:visibilitychange");
    expect(request).not.toHaveBeenCalled();
  });
});

describe("interpretSyncResponse : le statut distingue refus, panne et ancienne session non traitée", () => {
  it.each([[200, "ok"], [401, "denied"], [403, "denied"], [409, "denied"], [500, "network_error"], [0, "network_error"]] as const)("%i → %s", (status, expected) => {
    expect(interpretSyncResponse(status, null)).toBe(expected);
  });
  it("502/503 avec oldSession → unconfirmed_old_session ; sans → network_error", () => {
    expect(interpretSyncResponse(503, { ok: false, oldSession: "temporary" })).toBe("unconfirmed_old_session");
    expect(interpretSyncResponse(502, { ok: false, oldSession: "failed" })).toBe("unconfirmed_old_session");
    expect(interpretSyncResponse(503, null)).toBe("network_error");
  });
});
