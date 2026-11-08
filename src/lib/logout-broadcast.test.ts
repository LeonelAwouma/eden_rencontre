import { describe, expect, it } from "vitest";
import { LOGOUT_CHANNEL, LOGOUT_SIGNAL_KEY, announceLogout, isPrivatePath, listenForLogout } from "./logout-broadcast";

function fakeChannelHub() {
  const channels: { name: string; onmessage: ((e: unknown) => void) | null; closed: boolean }[] = [];
  const posted: unknown[] = [];
  const create = (name: string) => {
    const ch = { name, onmessage: null as ((e: unknown) => void) | null, closed: false, postMessage: (m: unknown) => { posted.push(m); channels.filter((c) => c !== ch && c.name === name && !c.closed).forEach((c) => c.onmessage?.({ data: m })); }, close: () => { ch.closed = true; } };
    channels.push(ch);
    return ch;
  };
  return { create, channels, posted };
}

describe("diffusion de la déconnexion aux autres onglets", () => {
  it("BroadcastChannel : l'autre onglet est prévenu, le message ne contient QUE l'heure (aucun jeton)", () => {
    const hub = fakeChannelHub();
    let heard = 0;
    listenForLogout(() => { heard += 1; }, { createChannel: hub.create });
    announceLogout({ createChannel: hub.create, storage: null, now: () => 1234 });
    expect(heard).toBe(1);
    expect(hub.posted).toEqual([{ at: 1234 }]);
    expect(hub.channels.every((c) => c.name === LOGOUT_CHANNEL)).toBe(true);
  });

  it("repli : l'événement `storage` de la clé de signal prévient l'autre onglet ; les autres clés sont ignorées", () => {
    let handler: ((e: { key: string | null }) => void) | null = null;
    let heard = 0;
    listenForLogout(() => { heard += 1; }, { addStorageListener: (fn) => { handler = fn; }, removeStorageListener: () => {} });
    handler!({ key: "autre-cle" });
    expect(heard).toBe(0);
    handler!({ key: LOGOUT_SIGNAL_KEY });
    expect(heard).toBe(1);
  });

  it("announceLogout écrit le signal de repli (heure seule) sans lever si le canal est indisponible", () => {
    const writes: [string, string][] = [];
    announceLogout({ createChannel: () => { throw new Error("indisponible"); }, storage: { setItem: (k, v) => { writes.push([k, v]); } }, now: () => 99 });
    expect(writes).toEqual([[LOGOUT_SIGNAL_KEY, "99"]]);
  });

  it("nettoyage : canal fermé et écouteur retiré au démontage", () => {
    const hub = fakeChannelHub();
    let removed = 0;
    const stop = listenForLogout(() => {}, { createChannel: hub.create, addStorageListener: () => {}, removeStorageListener: () => { removed += 1; } });
    stop();
    expect(hub.channels[0].closed).toBe(true);
    expect(removed).toBe(1);
  });

  it("seules les pages privées sont quittées ; les pages publiques et l'admin ne sont pas touchées", () => {
    for (const p of ["/dashboard", "/dashboard/messages", "/coach", "/coach/members/abc", "/onboarding", "/register/pending"]) expect(isPrivatePath(p), p).toBe(true);
    for (const p of ["/", "/login", "/blog", "/admin", "/admin/users", "/coachs-externes", "/dashboardx"]) expect(isPrivatePath(p), p).toBe(false);
  });
});
